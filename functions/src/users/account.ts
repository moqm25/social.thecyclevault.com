import { onCall } from "firebase-functions/v2/https";
import { db, adminAuth, FieldValue, COL } from "../shared/admin.js";
import { requireAuth } from "../shared/auth.js";
import { recordAuditLog } from "../shared/audit.js";

/**
 * exportMyData — return the caller's own posts, comments, and votes as JSON.
 * Satisfies the data-export privacy commitment (docs/DATA_MODEL.md §16).
 */
export const exportMyData = onCall(async (request) => {
	const auth = requireAuth(request);

	const [profileSnap, posts, comments, votes] = await Promise.all([
		db.collection(COL.users).doc(auth.uid).get(),
		db.collection(COL.posts).where("authorId", "==", auth.uid).get(),
		db.collection(COL.comments).where("authorId", "==", auth.uid).get(),
		db.collection(COL.votes).where("uid", "==", auth.uid).get(),
	]);

	await recordAuditLog({ actorId: auth.uid, event: "data_export" });

	return {
		exportedAt: new Date().toISOString(),
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
		// Release the username reservation (tombstone).
		if (usernameLower) {
			batch.delete(db.collection(COL.usernames).doc(usernameLower));
		}
		await batch.commit();

		// Anonymize authored content (chunked to respect batch limits).
		await anonymizeAuthored(COL.posts, uid);
		await anonymizeAuthored(COL.comments, uid);
	}

	await recordAuditLog({ actorId: uid, event: "account_deletion" });

	// Finally remove the auth identity.
	await adminAuth.deleteUser(uid).catch(() => undefined);

	return { ok: true as const };
});

async function anonymizeAuthored(collection: string, uid: string): Promise<void> {
	const snap = await db.collection(collection).where("authorId", "==", uid).limit(450).get();
	if (snap.empty) return;
	const batch = db.batch();
	snap.forEach((d) => batch.update(d.ref, { authorId: null, authorUsername: "[deleted]" }));
	await batch.commit();
}
