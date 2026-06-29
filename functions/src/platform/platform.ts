import { onCall, type CallableRequest } from "firebase-functions/v2/https";
import { createHash } from "node:crypto";
import { db, FieldValue, COL } from "../shared/admin.js";
import { requireActiveUser, requireRole } from "../shared/auth.js";
import { parseInput } from "../shared/validate.js";
import { enforceRateLimit, RATE } from "../shared/rateLimit.js";
import { recordAuditLog } from "../shared/audit.js";
import {
	upsertSponsoredProductSchema,
	setProductActiveSchema,
	recordProductClickSchema,
	broadcastAnnouncementSchema,
	grantBadgeSchema,
} from "../shared/schemas.js";

/** Hashed caller key for click de-dup (uid when signed in; else hashed IP). No raw IP stored. */
function clickerKey(request: CallableRequest): string {
	if (request.auth?.uid) return request.auth.uid;
	const raw = request.rawRequest;
	const xff = (raw?.headers?.["x-forwarded-for"] as string | undefined) ?? "";
	const ip = (raw?.ip || xff.split(",").map((s) => s.trim()).filter(Boolean).pop() || "unknown").trim();
	return `ip:${createHash("sha256").update(ip).digest("hex").slice(0, 24)}`;
}

/**
 * Platform/admin functions: sponsored products (docs/MONETIZATION.md), page-wide
 * announcement banner, and badge granting (Supporter / Verified Clinician / Org).
 * All admin-gated and audited.
 */

/** upsertSponsoredProduct — admin creates or updates a vetted, labeled product. */
export const upsertSponsoredProduct = onCall(async (request) => {
	const { auth, profile } = await requireActiveUser(request);
	requireRole(profile, "admin");
	const input = parseInput(upsertSponsoredProductSchema, request.data);

	const ref = input.id
		? db.collection(COL.sponsoredProducts).doc(input.id)
		: db.collection(COL.sponsoredProducts).doc();

	const base = {
		name: input.name,
		blurb: input.blurb,
		imageUrl: input.imageUrl ?? null,
		url: input.url,
		category: input.category,
		sponsor: input.sponsor ?? null,
		active: input.active,
		updatedAt: FieldValue.serverTimestamp(),
	};
	if (input.id) {
		await ref.update(base);
	} else {
		await ref.set({ ...base, clickCount: 0, createdAt: FieldValue.serverTimestamp() });
	}
	await recordAuditLog({ actorId: auth.uid, event: "sponsored_product_upsert", targetId: ref.id });
	return { id: ref.id };
});

/** setSponsoredProductActive — admin toggles a product on/off. */
export const setSponsoredProductActive = onCall(async (request) => {
	const { profile } = await requireActiveUser(request);
	requireRole(profile, "admin");
	const input = parseInput(setProductActiveSchema, request.data);
	await db.collection(COL.sponsoredProducts).doc(input.id).update({
		active: input.active,
		updatedAt: FieldValue.serverTimestamp(),
	});
	return { ok: true as const };
});

/** recordSponsoredClick — any user; bumps an AGGREGATE counter only (no per-user data).
 *  De-duped per (clicker, product) per window so the one analytics number can't be
 *  trivially inflated; failures never block the user's navigation. */
export const recordSponsoredClick = onCall(async (request) => {
	const input = parseInput(recordProductClickSchema, request.data);
	try {
		await enforceRateLimit(`${clickerKey(request)}:${input.id}`, "productClick", RATE.productClick.limit, RATE.productClick.windowMs);
	} catch {
		return { ok: true as const }; // already counted this clicker recently — silently skip
	}
	await db
		.collection(COL.sponsoredProducts)
		.doc(input.id)
		.update({ clickCount: FieldValue.increment(1) })
		.catch(() => undefined); // never block the user's navigation
	return { ok: true as const };
});

/**
 * broadcastAnnouncement — admin sets/clears a page-wide banner. Scalable: every
 * client reads settings/global and renders a dismissible banner (no per-user fan-out).
 */
export const broadcastAnnouncement = onCall(async (request) => {
	const { auth, profile } = await requireActiveUser(request);
	requireRole(profile, "admin");
	const input = parseInput(broadcastAnnouncementSchema, request.data);

	await db
		.collection(COL.settings)
		.doc("global")
		.set(
			{
				announcement: input.active
					? {
							title: input.title ?? "",
							body: input.body ?? "",
							level: input.level,
							id: Date.now().toString(36),
							updatedAt: FieldValue.serverTimestamp(),
						}
					: null,
				updatedAt: FieldValue.serverTimestamp(),
				updatedBy: auth.uid,
			},
			{ merge: true },
		);
	await recordAuditLog({ actorId: auth.uid, event: "broadcast_announcement", metadata: { active: input.active } });
	return { ok: true as const };
});

/** grantBadge — admin grants/revokes a membership or verification badge (function-only). */
export const grantBadge = onCall(async (request) => {
	const { auth, profile } = await requireActiveUser(request);
	requireRole(profile, "admin");
	const input = parseInput(grantBadgeSchema, request.data);

	const ref = db.collection(COL.users).doc(input.uid);
	const patch: Record<string, unknown> = {
		badges: input.grant ? FieldValue.arrayUnion(input.badge) : FieldValue.arrayRemove(input.badge),
		updatedAt: FieldValue.serverTimestamp(),
	};
	if (input.badge === "supporter" || input.badge === "founding_supporter") {
		patch.supporter = input.grant;
		if (input.grant) patch.supporterSince = FieldValue.serverTimestamp();
	}
	await ref.update(patch);
	await recordAuditLog({
		actorId: auth.uid,
		event: "grant_badge",
		targetType: "user",
		targetId: input.uid,
		metadata: { badge: input.badge, grant: input.grant },
	});
	return { ok: true as const };
});
