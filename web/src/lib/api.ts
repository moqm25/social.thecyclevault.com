import { httpsCallable, type HttpsCallableResult } from "firebase/functions";
import { functions } from "./firebase";
import type { ReportReason, VoteValue } from "../types/models";

/**
 * Typed wrappers over Cloud Functions callables — the only path for privileged
 * mutations (docs/API_CONTRACT.md). App code calls these, never Firestore writes
 * directly. Inputs mirror the contract; server re-validates everything with Zod.
 */

/**
 * Strip `undefined` values before sending. The Firebase callable encoder converts
 * `undefined` to `null` on the wire, which the server's `.optional()` Zod fields
 * reject ("expected string, received null"). Removing undefined keys keeps optional
 * fields truly optional.
 */
function stripUndefined<T>(data: T): T {
	if (data && typeof data === "object" && !Array.isArray(data)) {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
			if (v !== undefined) out[k] = v;
		}
		return out as T;
	}
	return data;
}

function callable<TInput, TOutput>(name: string) {
	const fn = httpsCallable<TInput, TOutput>(functions, name);
	return async (data: TInput): Promise<TOutput> => {
		const res: HttpsCallableResult<TOutput> = await fn(stripUndefined(data));
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
export const createPost = callable<
	{ communityId: string; title: string; body: string; tags?: string[] },
	{ postId: string; status: "active" | "pending" }
>("createPost");

export const updatePost = callable<{ postId: string; title?: string; body?: string; tags?: string[] }, { ok: true }>("updatePost");

export const deletePostSoft = callable<{ postId: string }, { ok: true }>("deletePostSoft");

// ---- comments ----
export const createComment = callable<
	{ postId: string; parentCommentId?: string; body: string },
	{ commentId: string; status: "active" | "pending" }
>("createComment");

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

// ---- account (privacy) ----
export const exportMyData = callable<
	Record<string, never>,
	{
		exportedAt: string;
		profile: unknown;
		posts: unknown[];
		comments: unknown[];
		votes: unknown[];
	}
>("exportMyData");

export const deleteMyAccount = callable<Record<string, never>, { ok: true }>("deleteMyAccount");

// ---- moderation actions (mod/admin) ----
export const removeContent = callable<{ targetType: "post" | "comment"; targetId: string; reason: string; relatedReportId?: string }, { ok: true }>(
	"removeContent",
);

export const dismissReport = callable<{ reportId: string }, { ok: true }>("dismissReport");

export const lockPost = callable<{ postId: string; locked: boolean; reason?: string }, { ok: true }>("lockPost");

export const reviewContent = callable<
	{ contentType: "post" | "comment"; contentId: string; decision: "approve" | "reject"; reason?: string },
	{ ok: true }
>("reviewContent");

export const suspendUser = callable<{ uid: string; durationHours: number; reason: string }, { ok: true }>("suspendUser");

export const banUser = callable<{ uid: string; scope?: "global"; reason: string; permanent?: boolean }, { ok: true }>("banUser");
