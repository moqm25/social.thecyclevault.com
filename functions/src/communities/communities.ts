import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, FieldValue, COL } from "../shared/admin.js";
import { requireActiveUser, requireEmailVerified } from "../shared/auth.js";
import { parseInput } from "../shared/validate.js";
import { enforceRateLimit, RATE } from "../shared/rateLimit.js";
import { recordAuditLog } from "../shared/audit.js";
import { createCommunitySchema } from "../shared/schemas.js";

/**
 * Reserved community slugs: the seeded MVP communities + words that imply
 * officialness or would collide with routes. Members can't take these.
 */
const RESERVED_SLUGS = new Set([
	"general",
	"cycle-questions",
	"symptoms",
	"privacy-app-feedback",
	"educational-discussion",
	"support",
	"admin",
	"mod",
	"moderator",
	"official",
	"thecyclevault",
	"cyclevault",
	"staff",
	"help",
	"new",
	"all",
	"home",
	"settings",
	"shop",
	"supporter",
]);

const DEFAULT_RULES = [
	"Be kind. This is a calm, supportive space.",
	"No medical advice — share experiences, not diagnoses.",
	"No spam, ads, or self-promotion.",
	"Respect privacy — yours and others’.",
];

/**
 * createCommunity — a member creates a "Circle" (docs/DATA_MODEL.md §4).
 *
 * The creator becomes the Circle's moderator: their uid is added to the community's
 * `moderatorIds` and the slug is added to their `moderatorOf`. This scopes their
 * moderation powers to THIS circle only — it deliberately does NOT grant the global
 * `moderator` role (which would unlock platform-wide actions like suspendUser).
 * `requireModeratorOf` honors `moderatorOf` for per-community content actions.
 *
 * Slug uniqueness is guaranteed by the community doc-ID (slug) collision check in a
 * transaction, mirroring the username reservation pattern.
 */
export const createCommunity = onCall(async (request) => {
	const { auth } = await requireActiveUser(request);
	requireEmailVerified(auth); // same trust gate as first post
	const input = parseInput(createCommunitySchema, request.data);

	await enforceRateLimit(auth.uid, "createCommunity", RATE.createCommunity.limit, RATE.createCommunity.windowMs);

	if (RESERVED_SLUGS.has(input.slug)) {
		throw new HttpsError("already-exists", "That address isn’t available. Try another.");
	}

	const communityRef = db.collection(COL.communities).doc(input.slug);
	const userRef = db.collection(COL.users).doc(auth.uid);

	await db.runTransaction(async (tx) => {
		const existing = await tx.get(communityRef);
		if (existing.exists) {
			throw new HttpsError("already-exists", "A Circle with that address already exists.");
		}
		tx.set(communityRef, {
			slug: input.slug,
			name: input.name,
			description: input.description,
			rules: input.rules && input.rules.length > 0 ? input.rules : DEFAULT_RULES,
			color: input.color,
			icon: null,
			visibility: "public",
			memberCount: 1,
			postCount: 0,
			moderatorIds: [auth.uid],
			createdBy: auth.uid,
			createdAt: FieldValue.serverTimestamp(),
			updatedAt: FieldValue.serverTimestamp(),
		});
		// Scope moderation to this circle only (NOT a global role change).
		tx.update(userRef, {
			moderatorOf: FieldValue.arrayUnion(input.slug),
			updatedAt: FieldValue.serverTimestamp(),
		});
	});

	await recordAuditLog({
		actorId: auth.uid,
		event: "create_community",
		targetType: "community",
		targetId: input.slug,
		metadata: { name: input.name },
	});

	return { slug: input.slug };
});
