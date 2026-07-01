import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, FieldValue, COL } from "../shared/admin.js";
import { requireActiveUser, requireModeratorOf, requireRole } from "../shared/auth.js";
import { parseInput } from "../shared/validate.js";
import { enforceRateLimit, RATE } from "../shared/rateLimit.js";
import { recordModerationAction, recordAuditLog } from "../shared/audit.js";
import { createNotification } from "../shared/notify.js";
import { applyStrike, clearStrikes } from "../shared/strikes.js";
import {
	reportContentSchema,
	removeContentSchema,
	suspendUserSchema,
	banUserSchema,
	reviewContentSchema,
	clearStrikesSchema,
	setUserRoleSchema,
	dismissReportSchema,
	unbanUserSchema,
} from "../shared/schemas.js";

const MOD_MAX_SUSPEND_HOURS = 168; // 7 days; admins may exceed

/**
 * reviewContent — human approve/reject of moderation-held content (docs/MODERATION_AI.md §4).
 * Approve: pending → active (publishes), notify author. Reject: → removed, notify
 * author. Updates the moderationQueue entry and writes a moderationAction.
 */
export const reviewContent = onCall(async (request) => {
	const { auth, profile } = await requireActiveUser(request);
	const input = parseInput(reviewContentSchema, request.data);

	const col = input.contentType === "post" ? COL.posts : COL.comments;
	const ref = db.collection(col).doc(input.contentId);
	const snap = await ref.get();
	if (!snap.exists) throw new HttpsError("not-found", "Content not found.");
	const content = snap.data() as Record<string, unknown>;
	requireModeratorOf(profile, String(content.communityId));

	const approve = input.decision === "approve";
	const newStatus = approve ? "active" : "removed";

	const batch = db.batch();
	batch.update(ref, {
		status: newStatus,
		"moderation.state": approve ? "human_approved" : "human_removed",
		updatedAt: FieldValue.serverTimestamp(),
	});
	// If rejecting content that had been counted, decrement the relevant counter.
	if (!approve) {
		if (input.contentType === "post") {
			batch.update(db.collection(COL.communities).doc(String(content.communityId)), {
				postCount: FieldValue.increment(-1),
			});
		} else {
			batch.update(db.collection(COL.posts).doc(String(content.postId)), {
				commentCount: FieldValue.increment(-1),
			});
		}
	}
	// Resolve the queue entry/entries for this content.
	const queue = await db.collection(COL.moderationQueue).where("contentId", "==", input.contentId).limit(5).get();
	queue.forEach((q) =>
		batch.update(q.ref, {
			state: approve ? "human_approved" : "human_removed",
			decidedBy: auth.uid,
			reason: input.reason ?? null,
			decidedAt: FieldValue.serverTimestamp(),
		}),
	);
	await batch.commit();

	await recordModerationAction({
		actorId: auth.uid,
		actionType: approve ? "restore_content" : input.contentType === "post" ? "remove_post" : "remove_comment",
		targetType: input.contentType,
		targetId: input.contentId,
		communityId: String(content.communityId),
		reason: input.reason ?? (approve ? "Approved after review" : "Removed after review"),
	});
	await createNotification({
		recipientId: String(content.authorId),
		type: "mod_action",
		title: approve ? "Your post is now live" : "Your content wasn’t approved",
		body: approve
			? "Thanks for your patience — it passed review and is now visible."
			: `After review, this wasn’t approved.${input.reason ? ` Reason: ${input.reason}` : ""}`,
		link: input.contentType === "post" ? `/post/${input.contentId}` : `/post/${content.postId}`,
	});

	// A human-confirmed rejection counts as a strike (auto-escalates; decays in 90d).
	// Skip self-removals and benign mod overrides (strike:false).
	if (!approve && input.strike && String(content.authorId) !== auth.uid) {
		await applyStrike({
			uid: String(content.authorId),
			actorId: auth.uid,
			reason: input.reason ?? "Content removed after review",
			contentType: input.contentType,
			contentId: input.contentId,
			communityId: String(content.communityId),
		});
	}

	return { ok: true as const };
});

/** reportContent — any active user can flag content/users; deduped per reporter. */
export const reportContent = onCall(async (request) => {
	const { auth } = await requireActiveUser(request);
	const input = parseInput(reportContentSchema, request.data);
	await enforceRateLimit(auth.uid, "report", RATE.report.limit, RATE.report.windowMs);

	// Dedupe: same reporter + same target while still open.
	const dupe = await db
		.collection(COL.reports)
		.where("reporterId", "==", auth.uid)
		.where("targetId", "==", input.targetId)
		.where("status", "in", ["open", "reviewing"])
		.limit(1)
		.get();
	if (!dupe.empty) {
		return { reportId: dupe.docs[0].id };
	}

	// For comment reports, capture the parent postId so moderators can deep-link
	// straight to the comment in its thread (post reports already carry it as the
	// target; user reports have none).
	let postId: string | null = null;
	if (input.targetType === "comment") {
		const c = await db.collection(COL.comments).doc(input.targetId).get();
		postId = c.exists ? (String((c.data() as Record<string, unknown>).postId ?? "") || null) : null;
	} else if (input.targetType === "post") {
		postId = input.targetId;
	}

	const ref = await db.collection(COL.reports).add({
		reporterId: auth.uid,
		targetType: input.targetType,
		targetId: input.targetId,
		postId,
		reason: input.reason,
		details: input.details ?? "",
		status: "open",
		resolution: null,
		handledBy: null,
		createdAt: FieldValue.serverTimestamp(),
		updatedAt: FieldValue.serverTimestamp(),
	});
	return { reportId: ref.id };
});

/** removeContent — moderator removes a post/comment within their community. */
export const removeContent = onCall(async (request) => {
	const { auth, profile } = await requireActiveUser(request);
	const input = parseInput(removeContentSchema, request.data);

	const col = input.targetType === "post" ? COL.posts : COL.comments;
	const ref = db.collection(col).doc(input.targetId);
	const snap = await ref.get();
	if (!snap.exists) throw new HttpsError("not-found", "Content not found.");
	const content = snap.data() as Record<string, unknown>;
	requireModeratorOf(profile, String(content.communityId));

	const batch = db.batch();
	batch.update(ref, { status: "removed", updatedAt: FieldValue.serverTimestamp() });
	if (input.targetType === "post") {
		batch.update(db.collection(COL.communities).doc(String(content.communityId)), {
			postCount: FieldValue.increment(-1),
		});
	} else {
		batch.update(db.collection(COL.posts).doc(String(content.postId)), {
			commentCount: FieldValue.increment(-1),
		});
	}
	if (input.relatedReportId) {
		batch.update(db.collection(COL.reports).doc(input.relatedReportId), {
			status: "resolved",
			handledBy: auth.uid,
			resolution: input.reason,
			updatedAt: FieldValue.serverTimestamp(),
		});
	}
	await batch.commit();

	await recordModerationAction({
		actorId: auth.uid,
		actionType: input.targetType === "post" ? "remove_post" : "remove_comment",
		targetType: input.targetType,
		targetId: input.targetId,
		communityId: String(content.communityId),
		reason: input.reason,
		relatedReportId: input.relatedReportId ?? null,
	});
	await createNotification({
		recipientId: String(content.authorId),
		type: "mod_action",
		title: "Your content was removed",
		body: `A moderator removed your ${input.targetType}: ${input.reason}`,
		link: input.targetType === "post" ? `/post/${input.targetId}` : `/post/${content.postId}`,
	});

	// Removing guideline-breaking content strikes the author (auto-escalates; 90d
	// decay). Mods can pass strike:false for benign removals (wrong community, dupe).
	if (input.strike && String(content.authorId) !== auth.uid) {
		await applyStrike({
			uid: String(content.authorId),
			actorId: auth.uid,
			reason: input.reason,
			contentType: input.targetType,
			contentId: input.targetId,
			communityId: String(content.communityId),
		});
	}

	return { ok: true as const };
});

/** restoreContent — admin reverses a removal. */
export const restoreContent = onCall(async (request) => {
	const { auth, profile } = await requireActiveUser(request);
	requireRole(profile, "admin");
	const input = parseInput(removeContentSchema.pick({ targetType: true, targetId: true, reason: true }), request.data);

	const col = input.targetType === "post" ? COL.posts : COL.comments;
	const ref = db.collection(col).doc(input.targetId);
	const snap = await ref.get();
	if (!snap.exists) throw new HttpsError("not-found", "Content not found.");
	await ref.update({ status: "active", updatedAt: FieldValue.serverTimestamp() });

	await recordModerationAction({
		actorId: auth.uid,
		actionType: "restore_content",
		targetType: input.targetType,
		targetId: input.targetId,
		reason: input.reason,
	});
	return { ok: true as const };
});

/** suspendUser — temporary write ban. Mods bounded to 7 days; admins unbounded. */
export const suspendUser = onCall(async (request) => {
	const { auth, profile } = await requireActiveUser(request);
	requireRole(profile, "moderator");
	const input = parseInput(suspendUserSchema, request.data);

	const isAdmin = profile.role === "admin" || profile.role === "superadmin";
	if (!isAdmin && input.durationHours > MOD_MAX_SUSPEND_HOURS) {
		throw new HttpsError("permission-denied", "Moderators can suspend for up to 7 days.");
	}

	const until = Date.now() + input.durationHours * 60 * 60 * 1000;
	await db.collection(COL.users).doc(input.uid).update({
		status: "suspended",
		suspendedUntil: until,
		updatedAt: FieldValue.serverTimestamp(),
	});
	await recordModerationAction({
		actorId: auth.uid,
		actionType: "suspend_user",
		targetType: "user",
		targetId: input.uid,
		reason: input.reason,
		metadata: { durationHours: input.durationHours, until },
	});
	await recordAuditLog({
		actorId: auth.uid,
		event: "suspend_user",
		targetType: "user",
		targetId: input.uid,
		metadata: { durationHours: input.durationHours },
	});
	return { ok: true as const };
});

/** banUser — admin-only indefinite ban with a bans record. */
export const banUser = onCall(async (request) => {
	const { auth, profile } = await requireActiveUser(request);
	requireRole(profile, "admin");
	const input = parseInput(banUserSchema, request.data);

	const batch = db.batch();
	const banRef = db.collection(COL.bans).doc();
	batch.set(banRef, {
		uid: input.uid,
		scope: "global",
		reason: input.reason,
		bannedBy: auth.uid,
		expiresAt: input.permanent ? null : (input.expiresAt ?? null),
		active: true,
		createdAt: FieldValue.serverTimestamp(),
	});
	batch.update(db.collection(COL.users).doc(input.uid), {
		status: "banned",
		updatedAt: FieldValue.serverTimestamp(),
	});
	await batch.commit();

	await recordModerationAction({
		actorId: auth.uid,
		actionType: "ban_user",
		targetType: "user",
		targetId: input.uid,
		reason: input.reason,
	});
	await recordAuditLog({
		actorId: auth.uid,
		event: "ban_user",
		targetType: "user",
		targetId: input.uid,
		metadata: { permanent: input.permanent ?? false },
	});
	return { ok: true as const };
});

/** dismissReport — close a report with no content action. */
export const dismissReport = onCall(async (request) => {
	const { auth, profile } = await requireActiveUser(request);
	requireRole(profile, "moderator");
	const { reportId } = parseInput(dismissReportSchema, request.data);

	await db.collection(COL.reports).doc(reportId).update({
		status: "dismissed",
		handledBy: auth.uid,
		updatedAt: FieldValue.serverTimestamp(),
	});
	await recordModerationAction({
		actorId: auth.uid,
		actionType: "dismiss_report",
		targetType: "post",
		targetId: reportId,
		reason: "Dismissed",
		relatedReportId: reportId,
	});
	return { ok: true as const };
});

/** setUserRole — superadmin only; the single role-mutating path. */
export const setUserRole = onCall(async (request) => {
	const { auth, profile } = await requireActiveUser(request);
	requireRole(profile, "superadmin");
	const { uid, role } = parseInput(setUserRoleSchema, request.data);

	// A superadmin can't change their OWN role here — prevents accidentally
	// demoting yourself out of the last superadmin seat and locking the platform.
	if (uid === auth.uid) {
		throw new HttpsError("failed-precondition", "You can’t change your own role. Ask another superadmin.");
	}

	await db.collection(COL.users).doc(uid).update({
		role,
		updatedAt: FieldValue.serverTimestamp(),
	});
	await recordModerationAction({
		actorId: auth.uid,
		actionType: "role_change",
		targetType: "user",
		targetId: uid,
		reason: `Role set to ${role}`,
		metadata: { role },
	});
	await recordAuditLog({
		actorId: auth.uid,
		event: "role_change",
		targetType: "user",
		targetId: uid,
		metadata: { role },
	});
	return { ok: true as const };
});

/** unbanUser — admin reactivates a banned account. */
export const unbanUser = onCall(async (request) => {
	const { auth, profile } = await requireActiveUser(request);
	requireRole(profile, "admin");
	const { uid } = parseInput(unbanUserSchema, request.data);

	const bans = await db.collection(COL.bans).where("uid", "==", uid).where("active", "==", true).get();
	const batch = db.batch();
	bans.forEach((d) => batch.update(d.ref, { active: false }));
	batch.update(db.collection(COL.users).doc(uid), {
		status: "active",
		updatedAt: FieldValue.serverTimestamp(),
	});
	await batch.commit();

	await recordModerationAction({
		actorId: auth.uid,
		actionType: "unban_user",
		targetType: "user",
		targetId: uid,
		reason: "Unbanned",
	});
	return { ok: true as const };
});

/** clearUserStrikes — admin override: wipe a user's active strikes + review flag. */
export const clearUserStrikes = onCall(async (request) => {
	const { auth, profile } = await requireActiveUser(request);
	requireRole(profile, "admin");
	const input = parseInput(clearStrikesSchema, request.data);
	await clearStrikes(input.uid, auth.uid, input.reason);
	return { ok: true as const };
});
