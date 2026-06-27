import { setGlobalOptions } from "firebase-functions/v2";

/**
 * The CycleVault Social — Cloud Functions entry point.
 * Region pinned to us-central1 (matches Firestore). maxInstances caps cost/abuse
 * blast radius (docs/COST_MODEL.md §6); raise if real traffic needs it.
 */
setGlobalOptions({ region: "us-central1", maxInstances: 10 });

// ---- auth / profile ----
export { createUserProfile, reserveUsername } from "./auth/profile.js";

// ---- posts ----
export { createPost, updatePost, deletePostSoft, lockPost } from "./posts/posts.js";

// ---- comments ----
export { createComment, updateComment, deleteCommentSoft } from "./comments/comments.js";

// ---- voting ----
export { voteOnPost, voteOnComment } from "./votes/votes.js";

// ---- moderation ----
export {
	reportContent,
	removeContent,
	restoreContent,
	reviewContent,
	suspendUser,
	banUser,
	unbanUser,
	clearUserStrikes,
	dismissReport,
	setUserRole,
} from "./moderation/moderation.js";

// ---- notifications ----
export { markNotificationRead } from "./notifications/notifications.js";

// ---- account (privacy: export + delete) ----
export { exportMyData, deleteMyAccount } from "./users/account.js";

// ---- platform (sponsored products, announcement, badges) ----
export {
	upsertSponsoredProduct,
	setSponsoredProductActive,
	recordSponsoredClick,
	broadcastAnnouncement,
	grantBadge,
} from "./platform/platform.js";
