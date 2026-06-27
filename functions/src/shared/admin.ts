import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Initialize the Admin SDK exactly once (functions cold-start safe).
if (getApps().length === 0) {
	initializeApp();
}

export const db = getFirestore();
export const adminAuth = getAuth();
export { FieldValue, Timestamp };

/** Collection name constants — single source of truth (docs/DATA_MODEL.md §1). */
export const COL = {
	users: "users",
	usernames: "usernames",
	communities: "communities",
	posts: "posts",
	comments: "comments",
	votes: "votes",
	reports: "reports",
	moderationActions: "moderationActions",
	notifications: "notifications",
	auditLogs: "auditLogs",
	bans: "bans",
	settings: "settings",
	rateLimits: "rateLimits",
	moderationQueue: "moderationQueue",
	sponsoredProducts: "sponsoredProducts",
} as const;
