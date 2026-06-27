/**
 * Shared domain types — mirror docs/DATA_MODEL.md. Kept deliberately close to the
 * Firestore schema. Server-authoritative fields (role, status, score, counters)
 * are read-only on the client; never written directly.
 */

export type UserRole = "user" | "moderator" | "admin" | "superadmin";
export type UserStatus = "active" | "suspended" | "banned" | "deleted";

/**
 * Badges power the monetization + trust layer (docs/MONETIZATION.md §4). All are
 * server-set only (a verified purchase / vetting flow), never client-writable.
 */
export type BadgeKind = "supporter" | "founding_supporter" | "clinician" | "org";

export interface UserProfile {
	uid: string;
	username: string;
	usernameLower: string;
	displayName?: string | null;
	avatarUrl?: string | null;
	bio: string;
	role: UserRole;
	status: UserStatus;
	karma: number;
	postCount: number;
	commentCount: number;
	moderatorOf: string[];
	/** Optional cosmetic/trust flair (function-only writes). */
	badges?: BadgeKind[];
	supporter?: boolean;
	supporterSince?: number | null;
	createdAt: number;
	updatedAt: number;
}

export interface Community {
	slug: string;
	name: string;
	description: string;
	rules: string[];
	color: string;
	icon?: string | null;
	visibility: "public";
	memberCount: number;
	postCount: number;
	moderatorIds: string[];
	createdAt: number;
	updatedAt: number;
}

export type ContentStatus = "active" | "pending" | "removed" | "deleted" | "locked";

export interface Post {
	id: string;
	authorId: string;
	authorUsername: string;
	/** Denormalized author flair snapshot at post time (badges in feeds, no extra reads). */
	authorBadges?: BadgeKind[];
	authorSupporter?: boolean;
	communityId: string;
	title: string;
	body: string;
	tags: string[];
	score: number;
	upvoteCount: number;
	downvoteCount: number;
	commentCount: number;
	hotRank: number;
	status: ContentStatus;
	moderation?: ContentModeration;
	locked: boolean;
	edited: boolean;
	createdAt: number;
	updatedAt: number;
}

export interface Comment {
	id: string;
	postId: string;
	parentCommentId: string | null;
	communityId: string;
	authorId: string;
	authorUsername: string;
	/** Denormalized author flair snapshot at comment time. */
	authorBadges?: BadgeKind[];
	authorSupporter?: boolean;
	body: string;
	depth: number;
	score: number;
	upvoteCount: number;
	downvoteCount: number;
	replyCount: number;
	status: "active" | "pending" | "removed" | "deleted";
	moderation?: ContentModeration;
	edited: boolean;
	createdAt: number;
	updatedAt: number;
}

export type VoteValue = 1 | -1;

export interface Vote {
	uid: string;
	targetType: "post" | "comment";
	targetId: string;
	value: VoteValue;
	createdAt: number;
	updatedAt: number;
}

export type NotificationType = "comment_reply" | "post_reply" | "mention" | "mod_action" | "system";

export interface AppNotification {
	id: string;
	recipientId: string;
	type: NotificationType;
	title: string;
	body: string;
	link: string;
	actorId?: string | null;
	actorUsername?: string | null;
	read: boolean;
	createdAt: number;
}

export type ReportReason = "spam" | "harassment" | "medical_misinfo" | "self_harm" | "hate" | "off_topic" | "other";

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface Report {
	id: string;
	reporterId: string;
	targetType: "post" | "comment" | "user";
	targetId: string;
	reason: ReportReason;
	details: string;
	status: ReportStatus;
	resolution?: string | null;
	handledBy?: string | null;
	createdAt: number;
	updatedAt: number;
}

export type ModerationState = "auto_approved" | "ai_approved" | "awaiting_human" | "human_approved" | "human_removed";

export interface ModerationQueueItem {
	id: string;
	contentType: "post" | "comment";
	contentId: string;
	communityId: string;
	postId?: string | null;
	authorId: string;
	authorUsername: string;
	excerpt: string;
	state: ModerationState;
	tier1: { score: number; severity: "none" | "low" | "high"; flags: string[] };
	tier2?: { safeConfidence: number; decision: "auto" | "human"; usedAI: boolean } | null;
	decidedBy: string;
	reason?: string | null;
	createdAt: number;
	decidedAt?: number | null;
}

/** Moderation summary stored on a post/comment. */
export interface ContentModeration {
	state: ModerationState;
	score: number;
	severity: "none" | "low" | "high";
	flags: string[];
	safeConfidence?: number | null;
}

export type ProductCategory =
	| "period-care"
	| "femtech"
	| "books"
	| "wellness"
	| "supplements"
	| "tools"
	| "other";

/**
 * A vetted, clearly-labeled product shown in place of generic ads
 * (docs/MONETIZATION.md). No tracking — only an aggregate clickCount is kept.
 * Admin-managed (function-only writes). Free members see them; Supporters don't.
 */
export interface SponsoredProduct {
	id: string;
	name: string;
	blurb: string;
	imageUrl?: string | null;
	url: string;
	category: ProductCategory;
	sponsor?: string | null;
	active: boolean;
	clickCount?: number;
	createdAt: number;
	updatedAt: number;
}

/** Page-wide banner set by an admin (stored at settings/global.announcement). */
export interface Announcement {
	id: string;
	title: string;
	body: string;
	level: "info" | "warning";
	updatedAt: number;
}

/**
 * Private per-user moderation counters (mod-only readable). Lives in its own
 * collection so strike history never appears on the public profile.
 */
export interface UserModeration {
	uid: string;
	strikeCount: number;
	strikeTotal: number;
	needsAdminReview: boolean;
	lastReason?: string | null;
	lastStrikeAt?: number | null;
	updatedAt: number;
}

/** A discussion cited by a curated search answer. */
export interface SearchAnswerSource {
	id: string;
	title: string;
	communityId: string;
}

/**
 * Curated answer for a search (docs/SEARCH.md). `source` is "ai" when a real LLM
 * synthesized it (grounded in the cited discussions) or "snapshot" for the
 * deterministic fallback. Always non-medical-advice.
 */
export interface SearchAnswer {
	text: string;
	sources: SearchAnswerSource[];
	source: "ai" | "snapshot";
}

export interface SearchResults {
	query: string;
	posts: Post[];
	communities: Community[];
	answer: SearchAnswer | null;
	/** True when an AI answer is configured but the viewer must sign in to get it. */
	aiAvailable: boolean;
}
