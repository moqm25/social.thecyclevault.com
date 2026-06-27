import { HttpsError } from "firebase-functions/v2/https";
import { db, FieldValue, COL } from "./admin.js";

/**
 * Fixed-window rate limiter. One counter doc per (uid, action, window). Cheap and
 * good enough for our scale; revisit with a token bucket at Stage 2.
 * Source: docs/API_CONTRACT.md §0.
 */
export async function enforceRateLimit(uid: string, action: string, limit: number, windowMs: number): Promise<void> {
	const windowId = Math.floor(Date.now() / windowMs);
	const ref = db.collection(COL.rateLimits).doc(`${uid}_${action}_${windowId}`);

	await db.runTransaction(async (tx) => {
		const snap = await tx.get(ref);
		const count = snap.exists ? ((snap.data()?.count as number) ?? 0) : 0;
		if (count >= limit) {
			throw new HttpsError("resource-exhausted", "You are doing that too often. Please slow down and try again later.");
		}
		if (snap.exists) {
			tx.update(ref, { count: FieldValue.increment(1) });
		} else {
			// expireAt supports a TTL policy for automatic cleanup of old counters.
			tx.set(ref, {
				uid,
				action,
				count: 1,
				expireAt: new Date(Date.now() + windowMs * 2),
			});
		}
	});
}

export const RATE = {
	createProfile: { limit: 5, windowMs: 60 * 60 * 1000 },
	createPost: { limit: 5, windowMs: 60 * 60 * 1000 },
	createPostDaily: { limit: 20, windowMs: 24 * 60 * 60 * 1000 },
	createComment: { limit: 30, windowMs: 60 * 60 * 1000 },
	vote: { limit: 200, windowMs: 60 * 60 * 1000 },
	report: { limit: 20, windowMs: 24 * 60 * 60 * 1000 },
	reserveUsername: { limit: 5, windowMs: 24 * 60 * 60 * 1000 },
	createCommunity: { limit: 3, windowMs: 24 * 60 * 60 * 1000 },
	search: { limit: 90, windowMs: 60 * 60 * 1000 },
	searchAI: { limit: 25, windowMs: 60 * 60 * 1000 },
	// Guests (unauthenticated) are limited by hashed IP — a tighter budget since
	// each guest search can trigger a Vertex embedding call (cost + abuse guard).
	searchGuest: { limit: 40, windowMs: 60 * 60 * 1000 },
	// "Report a problem" — generous enough for genuine follow-ups, tight enough to
	// blunt spam. Guests (hashed IP) get a smaller budget.
	issueReport: { limit: 10, windowMs: 60 * 60 * 1000 },
	issueReportGuest: { limit: 5, windowMs: 60 * 60 * 1000 },
} as const;
