import { db, FieldValue, COL } from "./admin.js";
import { recordModerationAction, recordAuditLog } from "./audit.js";
import { createNotification } from "./notify.js";

/**
 * Strike & auto-suspension system (docs/MODERATION_PLAN.md). When a human removes
 * a user's content for breaking the guidelines, the author accrues a strike.
 * Strikes auto-escalate and **decay after 90 days** so a long-ago mistake doesn't
 * follow someone forever. Admins can override (clearStrikes).
 *
 * Privacy: strike details live in a mod-only collection (userModeration/{uid} +
 * a per-user strikes subcollection) — never on the public profile doc. Only the
 * enforced suspension (status/suspendedUntil) is on the user doc, as before.
 */

const STRIKE_TTL_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** Escalation ladder, keyed by the count of currently-active strikes. */
function suspensionHoursFor(activeStrikes: number): number {
	if (activeStrikes <= 1) return 0; // first active strike → warning only
	if (activeStrikes === 2) return 24; // 1 day
	if (activeStrikes === 3) return 168; // 7 days
	if (activeStrikes === 4) return 720; // 30 days
	return 0; // 5+ → handed to a human (needsAdminReview); no auto-permaban
}

export interface StrikeOutcome {
	activeStrikes: number;
	totalStrikes: number;
	suspensionHours: number;
	suspendedUntil: number | null;
	needsAdminReview: boolean;
}

function humanDuration(hours: number): string {
	if (hours >= 24) {
		const days = Math.round(hours / 24);
		return `${days} day${days === 1 ? "" : "s"}`;
	}
	return `${hours} hour${hours === 1 ? "" : "s"}`;
}

/**
 * Apply a strike to a user and auto-escalate. Idempotent per call (each call adds
 * exactly one strike). Never shortens an existing longer suspension; never
 * downgrades a ban.
 */
export async function applyStrike(input: {
	uid: string;
	actorId: string;
	reason: string;
	contentType: "post" | "comment";
	contentId: string;
	postId?: string | null;
	communityId?: string | null;
}): Promise<StrikeOutcome> {
	const now = Date.now();
	const userRef = db.collection(COL.users).doc(input.uid);
	const strikesCol = userRef.collection("strikes");

	// 1) Record this strike (audit trail; bounded by TTL semantics).
	await strikesCol.add({
		reason: input.reason,
		contentType: input.contentType,
		contentId: input.contentId,
		communityId: input.communityId ?? null,
		actorId: input.actorId,
		createdAt: FieldValue.serverTimestamp(),
		createdAtMs: now,
		expiresAtMs: now + STRIKE_TTL_DAYS * DAY_MS,
		active: true,
	});

	// 2) Count active, non-expired strikes (small set → filter in memory, no index).
	const activeSnap = await strikesCol.where("active", "==", true).get();
	const activeStrikes = activeSnap.docs.filter((d) => Number(d.data().expiresAtMs ?? 0) > now).length;

	// 3) Read current moderation + user state.
	const [modSnap, userSnap] = await Promise.all([db.collection(COL.userModeration).doc(input.uid).get(), userRef.get()]);
	const totalStrikes = (Number(modSnap.data()?.strikeTotal) || 0) + 1;
	const u = userSnap.data() ?? {};
	const currentUntil = Number(u.suspendedUntil) || 0;
	const banned = u.status === "banned" || u.status === "deleted";

	const suspensionHours = suspensionHoursFor(activeStrikes);
	const needsAdminReview = activeStrikes >= 5;

	// 4) Write mod-only counters (kept OFF the public profile doc).
	await db.collection(COL.userModeration).doc(input.uid).set(
		{
			strikeCount: activeStrikes,
			strikeTotal: totalStrikes,
			needsAdminReview,
			lastStrikeAt: FieldValue.serverTimestamp(),
			lastReason: input.reason,
			updatedAt: FieldValue.serverTimestamp(),
		},
		{ merge: true },
	);

	// 5) Enforce suspension on the user doc — only extend, never shorten/downgrade.
	let suspendedUntil: number | null = currentUntil > now ? currentUntil : null;
	if (!banned && suspensionHours > 0) {
		const newUntil = now + suspensionHours * HOUR_MS;
		if (newUntil > currentUntil) {
			suspendedUntil = newUntil;
			await userRef.update({
				status: "suspended",
				suspendedUntil: newUntil,
				updatedAt: FieldValue.serverTimestamp(),
			});
		}
	}

	// 6) Audit everything.
	await recordModerationAction({
		actorId: input.actorId,
		actionType: "strike",
		targetType: "user",
		targetId: input.uid,
		communityId: input.communityId ?? null,
		reason: input.reason,
		metadata: { activeStrikes, totalStrikes, suspensionHours, needsAdminReview },
	});
	await recordAuditLog({
		actorId: input.actorId,
		event: "strike",
		targetType: "user",
		targetId: input.uid,
		metadata: { activeStrikes, suspensionHours, needsAdminReview },
	});

	// 7) Notify the user — calm, clear, explains what happened and why.
	let title: string;
	let body: string;
	if (needsAdminReview) {
		title = "Your account is under review";
		body = `Your ${input.contentType} was removed for not following the Community Guidelines. Because of several recent removals, our team will review your account. You can still read in the meantime.`;
	} else if (suspensionHours > 0) {
		title = "Your account is temporarily paused";
		body = `Your ${input.contentType} was removed for not following the Community Guidelines. Because of repeated issues, posting and commenting are paused for ${humanDuration(
			suspensionHours,
		)}. You can still read during this time. Please review the guidelines.`;
	} else {
		title = "A gentle heads-up";
		body = `Your ${input.contentType} was removed for not following the Community Guidelines. This is a first warning — no further limits right now. Please take a moment to review the guidelines so we can keep this space calm and kind.`;
	}
	// Deep-link to the exact item that tripped the strike so the author can SEE what
	// happened (not just land on the generic guidelines page). Falls back to the
	// guidelines when we don't have enough to locate the content.
	let link = "/guidelines";
	if (input.contentId) {
		if (input.contentType === "comment" && input.postId) link = `/post/${input.postId}?focus=${input.contentId}`;
		else if (input.contentType === "post") link = `/post/${input.contentId}`;
	}
	await createNotification({ recipientId: input.uid, type: "mod_action", title, body, link });

	return { activeStrikes, totalStrikes, suspensionHours, suspendedUntil, needsAdminReview };
}

/** Admin override: clear a user's active strikes and the review flag. */
export async function clearStrikes(uid: string, actorId: string, reason?: string): Promise<void> {
	const strikesCol = db.collection(COL.users).doc(uid).collection("strikes");
	const active = await strikesCol.where("active", "==", true).get();
	const batch = db.batch();
	active.forEach((d) => batch.update(d.ref, { active: false, clearedBy: actorId, clearedAt: FieldValue.serverTimestamp() }));
	batch.set(
		db.collection(COL.userModeration).doc(uid),
		{ strikeCount: 0, needsAdminReview: false, updatedAt: FieldValue.serverTimestamp() },
		{ merge: true },
	);
	await batch.commit();

	await recordModerationAction({
		actorId,
		actionType: "clear_strikes",
		targetType: "user",
		targetId: uid,
		reason: reason ?? "Strikes cleared by admin",
	});
	await recordAuditLog({ actorId, event: "clear_strikes", targetType: "user", targetId: uid });
}
