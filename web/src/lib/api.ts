import { httpsCallable, type HttpsCallableResult } from "firebase/functions";
import { functions } from "./firebase";
import type { ReportReason, VoteValue } from "../types/models";

/**
 * Typed wrappers over Cloud Functions callables — the only path for privileged
 * mutations (docs/API_CONTRACT.md). App code calls these, never Firestore writes
 * directly. Inputs mirror the contract; server re-validates everything with Zod.
 */

function callable<TInput, TOutput>(name: string) {
	const fn = httpsCallable<TInput, TOutput>(functions, name);
	return async (data: TInput): Promise<TOutput> => {
		const res: HttpsCallableResult<TOutput> = await fn(data);
		return res.data;
	};
}

// ---- auth / profile ----
export const createUserProfile = callable<
	{ username: string; displayName?: string; bio?: string; acceptedTermsVersion: string },
	{ uid: string; username: string }
>("createUserProfile");

export const reserveUsername = callable<{ username: string }, { available: boolean; reserved?: boolean }>("reserveUsername");

// ---- posts ----
export const createPost = callable<{ communityId: string; title: string; body: string; tags?: string[] }, { postId: string }>("createPost");

export const updatePost = callable<{ postId: string; title?: string; body?: string; tags?: string[] }, { ok: true }>("updatePost");

export const deletePostSoft = callable<{ postId: string }, { ok: true }>("deletePostSoft");

// ---- comments ----
export const createComment = callable<{ postId: string; parentCommentId?: string; body: string }, { commentId: string }>("createComment");

export const updateComment = callable<{ commentId: string; body: string }, { ok: true }>("updateComment");

export const deleteCommentSoft = callable<{ commentId: string }, { ok: true }>("deleteCommentSoft");

// ---- voting ----
export const voteOnPost = callable<{ postId: string; value: VoteValue | 0 }, { score: number; value: VoteValue | 0 }>("voteOnPost");

export const voteOnComment = callable<{ commentId: string; value: VoteValue | 0 }, { score: number; value: VoteValue | 0 }>("voteOnComment");

// ---- moderation / reporting ----
export const reportContent = callable<
	{ targetType: "post" | "comment" | "user"; targetId: string; reason: ReportReason; details?: string },
	{ reportId: string }
>("reportContent");

// ---- notifications ----
export const markNotificationRead = callable<{ notificationId?: string; all?: boolean }, { ok: true }>("markNotificationRead");
