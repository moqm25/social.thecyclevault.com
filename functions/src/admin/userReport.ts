import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, COL } from "../shared/admin.js";
import { requireActiveUser, requireRole } from "../shared/auth.js";
import { recordAuditLog } from "../shared/audit.js";

/**
 * getUserActivityReport — an admin-only, audit-ready dossier of a single member:
 * who they are, their current standing (strikes/bans), every moderation action
 * taken against them, reports filed about them, and the content they authored.
 *
 * Built for accountability: if a banned member disputes the decision, an admin can
 * generate this and show exactly what happened. Admin-gated, runs server-side with
 * the Admin SDK so it sees removed/deleted content too, and is itself written to
 * the audit log (generating a report is a recorded action).
 *
 * Privacy: returns only this user's own authored content + moderation metadata.
 * No IPs (we never store them) and no other members' private data.
 */

type Doc = Record<string, unknown>;
const toMillis = (v: unknown): number | null =>
	v && typeof (v as { toMillis?: () => number }).toMillis === "function" ? (v as { toMillis: () => number }).toMillis() : null;

function lightPost(id: string, d: Doc) {
	return {
		id,
		communityId: String(d.communityId ?? ""),
		title: String(d.title ?? ""),
		body: String(d.body ?? ""),
		status: String(d.status ?? "active"),
		score: Number(d.score ?? 0),
		commentCount: Number(d.commentCount ?? 0),
		moderation: (d.moderation as Doc) ?? null,
		createdAt: toMillis(d.createdAt),
		updatedAt: toMillis(d.updatedAt),
	};
}

function lightComment(id: string, d: Doc) {
	return {
		id,
		postId: String(d.postId ?? ""),
		body: String(d.body ?? ""),
		status: String(d.status ?? "active"),
		score: Number(d.score ?? 0),
		moderation: (d.moderation as Doc) ?? null,
		createdAt: toMillis(d.createdAt),
		updatedAt: toMillis(d.updatedAt),
	};
}

export const getUserActivityReport = onCall(async (request) => {
	const { auth, profile } = await requireActiveUser(request);
	requireRole(profile, "admin");

	const uid = String((request.data as { uid?: unknown })?.uid ?? "");
	if (!uid) throw new HttpsError("invalid-argument", "A user uid is required.");

	const userSnap = await db.collection(COL.users).doc(uid).get();
	if (!userSnap.exists) throw new HttpsError("not-found", "That user no longer exists.");
	const u = userSnap.data() as Doc;

	const [modSnap, strikesSnap, bansSnap, actionsSnap, reportsSnap, postsSnap, commentsSnap] = await Promise.all([
		db.collection(COL.userModeration).doc(uid).get(),
		db.collection(COL.users).doc(uid).collection("strikes").orderBy("createdAt", "desc").limit(100).get(),
		db.collection(COL.bans).where("uid", "==", uid).get(),
		db.collection(COL.moderationActions).where("targetType", "==", "user").where("targetId", "==", uid).get(),
		db.collection(COL.reports).where("targetType", "==", "user").where("targetId", "==", uid).get(),
		db.collection(COL.posts).where("authorId", "==", uid).get(),
		db.collection(COL.comments).where("authorId", "==", uid).get(),
	]);

	const mod = modSnap.exists ? (modSnap.data() as Doc) : null;
	const posts = postsSnap.docs.map((d) => lightPost(d.id, d.data() as Doc));
	const comments = commentsSnap.docs.map((d) => lightComment(d.id, d.data() as Doc));
	const sortByCreatedDesc = <T extends { createdAt: number | null }>(a: T, b: T) => (b.createdAt ?? 0) - (a.createdAt ?? 0);
	posts.sort(sortByCreatedDesc);
	comments.sort(sortByCreatedDesc);

	const moderationActions = actionsSnap.docs
		.map((d) => {
			const a = d.data() as Doc;
			return {
				id: d.id,
				actionType: String(a.actionType ?? ""),
				reason: String(a.reason ?? ""),
				actorId: String(a.actorId ?? ""),
				metadata: (a.metadata as Doc) ?? {},
				createdAt: toMillis(a.createdAt),
			};
		})
		.sort(sortByCreatedDesc);

	const reportsAbout = reportsSnap.docs
		.map((d) => {
			const r = d.data() as Doc;
			return {
				id: d.id,
				reason: String(r.reason ?? ""),
				details: String(r.details ?? ""),
				status: String(r.status ?? ""),
				createdAt: toMillis(r.createdAt),
			};
		})
		.sort(sortByCreatedDesc);

	const bans = bansSnap.docs.map((d) => {
		const b = d.data() as Doc;
		const expiresAt = toMillis(b.expiresAt);
		return {
			id: d.id,
			active: b.active === true,
			scope: String(b.scope ?? "global"),
			reason: String(b.reason ?? ""),
			permanent: expiresAt === null, // a ban with no expiry is permanent
			bannedBy: String(b.bannedBy ?? ""),
			createdAt: toMillis(b.createdAt),
			expiresAt,
		};
	});

	const strikes = strikesSnap.docs.map((d) => {
		const s = d.data() as Doc;
		return { id: d.id, reason: String(s.reason ?? ""), severity: String(s.severity ?? ""), createdAt: toMillis(s.createdAt) };
	});

	// Generating an accountability report is itself a recorded action.
	await recordAuditLog({ actorId: auth.uid, event: "user_report_generated", targetType: "user", targetId: uid });

	return {
		generatedAt: Date.now(),
		generatedBy: profile.username,
		user: {
			uid,
			username: String(u.username ?? ""),
			displayName: (u.displayName as string | null) ?? null,
			status: String(u.status ?? "active"),
			role: String(u.role ?? "user"),
			badges: (u.badges as string[]) ?? [],
			supporter: u.supporter === true,
			postCount: Number(u.postCount ?? 0),
			commentCount: Number(u.commentCount ?? 0),
			karma: Number(u.karma ?? 0),
			createdAt: toMillis(u.createdAt),
		},
		standing: mod
			? {
					strikeCount: Number(mod.strikeCount ?? 0),
					strikeTotal: Number(mod.strikeTotal ?? 0),
					needsAdminReview: mod.needsAdminReview === true,
					lastReason: (mod.lastReason as string | null) ?? null,
					lastStrikeAt: toMillis(mod.lastStrikeAt),
				}
			: { strikeCount: 0, strikeTotal: 0, needsAdminReview: false, lastReason: null, lastStrikeAt: null },
		strikes,
		bans,
		moderationActions,
		reportsAbout,
		content: { posts, comments },
		counts: {
			posts: posts.length,
			comments: comments.length,
			removedPosts: posts.filter((p) => p.status === "removed" || p.status === "deleted").length,
			removedComments: comments.filter((c) => c.status === "removed" || c.status === "deleted").length,
		},
	};
});
