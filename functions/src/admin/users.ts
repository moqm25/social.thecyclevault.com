import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, adminAuth, COL } from "../shared/admin.js";
import { requireActiveUser, requireRole } from "../shared/auth.js";
import { parseInput } from "../shared/validate.js";
import { recordModerationAction, recordAuditLog } from "../shared/audit.js";
import { purgeAccount } from "../users/account.js";
import { searchUsersSchema, adminDeleteUserSchema } from "../shared/schemas.js";

/**
 * Admin user directory + account deletion (founder request).
 *
 * searchUsers — admin+ (the "support" tier). Find members by username prefix OR
 * exact email (email lives in Auth, not the public profile, so support can look
 * someone up from the email they wrote in from). Returns a compact result list.
 *
 * adminDeleteUser — superadmin only. The destructive path, with guards so an admin
 * can't lock the platform out of itself: you can't delete your own account here,
 * and you can't delete another superadmin. Reuses the same anonymize-then-remove
 * purge as the member self-delete, and is fully audit-logged.
 */

interface UserResult {
	uid: string;
	username: string;
	displayName: string | null;
	email: string | null;
	role: string;
	status: string;
	badges: string[];
	supporter: boolean;
	postCount: number;
	commentCount: number;
	karma: number;
	createdAt: number | null;
}

function toResult(uid: string, d: Record<string, unknown>, email: string | null): UserResult {
	const ca = d.createdAt as { toMillis?: () => number } | undefined;
	return {
		uid,
		username: String(d.username ?? ""),
		displayName: (d.displayName as string | null) ?? null,
		email,
		role: String(d.role ?? "user"),
		status: String(d.status ?? "active"),
		badges: (d.badges as string[]) ?? [],
		supporter: d.supporter === true,
		postCount: Number(d.postCount ?? 0),
		commentCount: Number(d.commentCount ?? 0),
		karma: Number(d.karma ?? 0),
		createdAt: typeof ca?.toMillis === "function" ? ca.toMillis() : null,
	};
}

export const searchUsers = onCall(async (request) => {
	const { profile } = await requireActiveUser(request);
	requireRole(profile, "admin");
	const input = parseInput(searchUsersSchema, request.data);
	const raw = input.query.trim();
	if (!raw) return { results: [] as UserResult[] };

	const looksLikeEmail = raw.includes("@");
	const results = new Map<string, UserResult>();

	// 1) Exact email → Auth lookup → profile.
	if (looksLikeEmail) {
		try {
			const rec = await adminAuth.getUserByEmail(raw.toLowerCase());
			const snap = await db.collection(COL.users).doc(rec.uid).get();
			if (snap.exists) results.set(rec.uid, toResult(rec.uid, snap.data() as Record<string, unknown>, rec.email ?? null));
		} catch {
			/* no such email — fall through to username search */
		}
	}

	// 2) Username prefix (case-insensitive via usernameLower). Firestore range query.
	if (!looksLikeEmail) {
		const q = raw.toLowerCase().replace(/^@/, "");
		const snap = await db
			.collection(COL.users)
			.where("usernameLower", ">=", q)
			.where("usernameLower", "<", q + "\uf8ff")
			.orderBy("usernameLower")
			.limit(20)
			.get();
		snap.forEach((doc) => {
			if (!results.has(doc.id)) results.set(doc.id, toResult(doc.id, doc.data() as Record<string, unknown>, null));
		});
	}

	return { results: [...results.values()].slice(0, 20) };
});

export const adminDeleteUser = onCall(async (request) => {
	const { auth, profile } = await requireActiveUser(request);
	requireRole(profile, "superadmin");
	const input = parseInput(adminDeleteUserSchema, request.data);

	if (input.uid === auth.uid) {
		throw new HttpsError("failed-precondition", "You can’t delete your own account here. Use Settings → Delete account.");
	}

	const snap = await db.collection(COL.users).doc(input.uid).get();
	if (!snap.exists) throw new HttpsError("not-found", "That member no longer exists.");
	const target = snap.data() as Record<string, unknown>;
	if (String(target.role) === "superadmin") {
		throw new HttpsError("permission-denied", "A superadmin account can’t be deleted here. Demote it first.");
	}

	await purgeAccount(input.uid);

	await recordModerationAction({
		actorId: auth.uid,
		actionType: "delete_user",
		targetType: "user",
		targetId: input.uid,
		reason: input.reason ?? "Admin account deletion",
	});
	await recordAuditLog({
		actorId: auth.uid,
		event: "admin_delete_user",
		targetType: "user",
		targetId: input.uid,
		metadata: { reason: input.reason ?? null, username: String(target.username ?? "") },
	});

	return { ok: true as const };
});
