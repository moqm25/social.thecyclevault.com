import { onCall } from "firebase-functions/v2/https";
import { db, adminAuth, FieldValue, COL } from "../shared/admin.js";
import { requireAuth } from "../shared/auth.js";
import { enforceRateLimit, RATE } from "../shared/rateLimit.js";
import { recordAuditLog } from "../shared/audit.js";

/**
 * exportMyData — return the caller's own posts, comments, and votes as JSON.
 * Satisfies the data-export privacy commitment (docs/DATA_MODEL.md §16).
 */
export const exportMyData = onCall(async (request) => {
	const auth = requireAuth(request);
	await enforceRateLimit(auth.uid, "exportData", RATE.exportData.limit, RATE.exportData.windowMs);

	// Safety cap: bound each collection read so a prolific (or abusive) account
	// can't OOM the function. 10k per collection is far above any genuine member's
	// volume; if it's ever hit we flag it so support can help with the remainder.
	const EXPORT_CAP = 10_000;

	const [profileSnap, posts, comments, votes] = await Promise.all([
		db.collection(COL.users).doc(auth.uid).get(),
		db.collection(COL.posts).where("authorId", "==", auth.uid).limit(EXPORT_CAP).get(),
		db.collection(COL.comments).where("authorId", "==", auth.uid).limit(EXPORT_CAP).get(),
		db.collection(COL.votes).where("uid", "==", auth.uid).limit(EXPORT_CAP).get(),
	]);

	await recordAuditLog({ actorId: auth.uid, event: "data_export" });

	return {
		exportedAt: new Date().toISOString(),
		truncated: posts.size >= EXPORT_CAP || comments.size >= EXPORT_CAP || votes.size >= EXPORT_CAP,
		profile: profileSnap.data() ?? null,
		posts: posts.docs.map((d) => ({ id: d.id, ...d.data() })),
		comments: comments.docs.map((d) => ({ id: d.id, ...d.data() })),
		votes: votes.docs.map((d) => ({ id: d.id, ...d.data() })),
	};
});

/**
 * deleteMyAccount — soft-delete + anonymize per docs/DATA_MODEL.md §16, then
 * delete the Firebase Auth record. Authored content is anonymized, not erased,
 * to preserve thread integrity.
 */
export const deleteMyAccount = onCall(async (request) => {
	const auth = requireAuth(request);
	const uid = auth.uid;
	await enforceRateLimit(uid, "deleteAccount", RATE.deleteAccount.limit, RATE.deleteAccount.windowMs);

	await purgeAccount(uid);
	await recordAuditLog({ actorId: uid, event: "account_deletion" });
	return { ok: true as const };
});

/**
 * Soft-delete + anonymize an account, release its username, and remove the Auth
 * identity. Shared by the member's own deleteMyAccount and the admin-initiated
 * adminDeleteUser so both erase consistently. Content is anonymized (authorId
 * nulled, username → "[deleted]"), not hard-deleted, to keep threads readable.
 */
export async function purgeAccount(uid: string): Promise<void> {
	const userRef = db.collection(COL.users).doc(uid);
	const userSnap = await userRef.get();
	if (userSnap.exists) {
		const usernameLower = String(userSnap.data()?.usernameLower ?? "");
		const batch = db.batch();
		batch.update(userRef, {
			status: "deleted",
			displayName: null,
			avatarUrl: null,
			bio: "",
			updatedAt: FieldValue.serverTimestamp(),
		});
		if (usernameLower) {
			batch.delete(db.collection(COL.usernames).doc(usernameLower));
		}
		await batch.commit();
		await anonymizeAuthored(COL.posts, uid);
		await anonymizeAuthored(COL.comments, uid);
	}
	await adminAuth.deleteUser(uid).catch(() => undefined);
}

async function anonymizeAuthored(collection: string, uid: string): Promise<void> {
	// Loop in chunks until none remain — a prolific author's full history is
	// anonymized, not just the first batch (respects the 500-write batch limit).
	for (let guard = 0; guard < 1000; guard++) {
		const snap = await db.collection(collection).where("authorId", "==", uid).limit(450).get();
		if (snap.empty) return;
		const batch = db.batch();
		snap.forEach((d) => batch.update(d.ref, { authorId: null, authorUsername: "[deleted]" }));
		await batch.commit();
		if (snap.size < 450) return;
	}
}
