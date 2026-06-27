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
});
