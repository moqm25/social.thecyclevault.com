/**
 * Shared domain types — mirror docs/DATA_MODEL.md. Kept deliberately close to the
 * Firestore schema. Server-authoritative fields (role, status, score, counters)
 * are read-only on the client; never written directly.
 */

export type UserRole = "user" | "moderator" | "admin" | "superadmin";
export type UserStatus = "active" | "suspended" | "banned" | "deleted";

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

export type ContentStatus = "active" | "removed" | "deleted" | "locked";

export interface Post {
	id: string;
	authorId: string;
	authorUsername: string;
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
	body: string;
	depth: number;
	score: number;
	upvoteCount: number;
	downvoteCount: number;
	replyCount: number;
	status: "active" | "removed" | "deleted";
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
