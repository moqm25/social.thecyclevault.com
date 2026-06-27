import { z } from "zod";

/**
 * Zod schemas for every callable input. Server-authoritative validation
 * (docs/API_CONTRACT.md). The web client mirrors a subset for fast UX feedback,
 * but THIS is the source of truth.
 */

export const usernameSchema = z
	.string()
	.min(3)
	.max(20)
	.regex(/^[a-zA-Z0-9_]+$/);

const tagSchema = z
	.string()
	.min(1)
	.max(24)
	.regex(/^[a-z0-9-]+$/);

export const createUserProfileSchema = z.object({
	username: usernameSchema,
	displayName: z.string().max(50).optional(),
	bio: z.string().max(300).optional(),
	acceptedTermsVersion: z.string().min(1).max(20),
});

export const reserveUsernameSchema = z.object({
	username: usernameSchema,
});

/** Community ("Circle") slug: lowercase, url-safe, 3–30 chars. */
export const communitySlugSchema = z
	.string()
	.min(3)
	.max(30)
	.regex(/^[a-z0-9-]+$/)
	.refine((s) => !s.startsWith("-") && !s.endsWith("-") && !s.includes("--"), "Use single hyphens between words.");

export const createCommunitySchema = z.object({
	slug: communitySlugSchema,
	name: z.string().min(3).max(40),
	description: z.string().min(10).max(300),
	rules: z.array(z.string().min(1).max(200)).max(10).optional(),
	color: z.enum(["coral", "lav"]).default("coral"),
});

export const createPostSchema = z.object({
	communityId: z.string().min(1).max(64),
	title: z.string().min(1).max(300),
	body: z.string().max(40_000).default(""),
	tags: z.array(tagSchema).max(5).optional(),
});

export const updatePostSchema = z.object({
	postId: z.string().min(1),
	title: z.string().min(1).max(300).optional(),
	body: z.string().max(40_000).optional(),
	tags: z.array(tagSchema).max(5).optional(),
});

export const postIdSchema = z.object({ postId: z.string().min(1) });

export const lockPostSchema = z.object({
	postId: z.string().min(1),
	locked: z.boolean(),
	reason: z.string().max(500).optional(),
});

export const createCommentSchema = z.object({
	postId: z.string().min(1),
	// nullish: tolerate clients that serialize an absent parent as null.
	parentCommentId: z.string().min(1).nullish(),
	body: z.string().min(1).max(10_000),
});

export const updateCommentSchema = z.object({
	commentId: z.string().min(1),
	body: z.string().min(1).max(10_000),
});

export const commentIdSchema = z.object({ commentId: z.string().min(1) });

export const voteValueSchema = z.union([z.literal(1), z.literal(-1), z.literal(0)]);

export const voteOnPostSchema = z.object({
	postId: z.string().min(1),
	value: voteValueSchema,
});

export const voteOnCommentSchema = z.object({
	commentId: z.string().min(1),
	value: voteValueSchema,
});

export const reportReasonSchema = z.enum(["spam", "harassment", "medical_misinfo", "self_harm", "hate", "off_topic", "other"]);

export const reportContentSchema = z.object({
	targetType: z.enum(["post", "comment", "user"]),
	targetId: z.string().min(1),
	reason: reportReasonSchema,
	details: z.string().max(1_000).optional(),
});

export const removeContentSchema = z.object({
	targetType: z.enum(["post", "comment"]),
	targetId: z.string().min(1),
	reason: z.string().min(1).max(500),
	relatedReportId: z.string().optional(),
	// Whether removing this content also adds a strike to the author (default yes).
	// Mods can set false for benign removals (wrong community, duplicate, etc.).
	strike: z.boolean().default(true),
});

export const suspendUserSchema = z.object({
	uid: z.string().min(1),
	durationHours: z.number().int().min(1).max(8760),
	reason: z.string().min(1).max(500),
});

export const banUserSchema = z.object({
	uid: z.string().min(1),
	scope: z.literal("global").default("global"),
	reason: z.string().min(1).max(500),
	permanent: z.boolean().optional(),
	expiresAt: z.number().int().positive().optional(),
});

export const markNotificationReadSchema = z.union([z.object({ notificationId: z.string().min(1) }), z.object({ all: z.literal(true) })]);

export const reviewContentSchema = z.object({
	contentType: z.enum(["post", "comment"]),
	contentId: z.string().min(1),
	decision: z.enum(["approve", "reject"]),
	reason: z.string().max(500).optional(),
	// On reject, whether to also strike the author (default yes).
	strike: z.boolean().default(true),
});

export const clearStrikesSchema = z.object({
	uid: z.string().min(1),
	reason: z.string().max(500).optional(),
});

const httpsUrl = z.string().url().startsWith("https://").max(2000);

export const productCategories = [
	"period-care",
	"femtech",
	"books",
	"wellness",
	"supplements",
	"tools",
	"other",
] as const;

export const upsertSponsoredProductSchema = z.object({
	id: z.string().min(1).optional(), // present = update
	name: z.string().min(1).max(120),
	blurb: z.string().min(1).max(400),
	imageUrl: httpsUrl.optional(),
	url: httpsUrl,
	category: z.enum(productCategories),
	sponsor: z.string().max(120).optional(),
	active: z.boolean().default(true),
});

export const setProductActiveSchema = z.object({
	id: z.string().min(1),
	active: z.boolean(),
});

export const recordProductClickSchema = z.object({
	id: z.string().min(1),
});

export const broadcastAnnouncementSchema = z.object({
	title: z.string().max(120).optional(),
	body: z.string().max(500).optional(),
	level: z.enum(["info", "warning"]).default("info"),
	active: z.boolean().default(true),
});

export const grantBadgeSchema = z.object({
	uid: z.string().min(1),
	badge: z.enum(["supporter", "founding_supporter", "clinician", "org"]),
	grant: z.boolean().default(true),
});
