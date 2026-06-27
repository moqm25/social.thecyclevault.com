import { onCall } from "firebase-functions/v2/https";
import { db, COL, Timestamp } from "../shared/admin.js";
import { requireActiveUser, requireRole } from "../shared/auth.js";

/**
 * getPlatformStats — admin-only usage analytics + a rough cost estimate for the
 * admin console (docs/BUILD_LOG.md).
 *
 * Runs server-side with the Admin SDK so it can count across ALL content/users
 * regardless of the public-read rules (admins need the full picture, but we never
 * widen client read access to get it). Uses Firestore aggregation `count()` —
 * which returns just a number without reading the documents — so it's cheap and
 * scales to large collections.
 */

const WINDOW_DAYS = { "24h": 1, "7d": 7, "30d": 30, "90d": 90, "365d": 365 } as const;
type WindowKey = keyof typeof WINDOW_DAYS;
interface WindowCounts {
	users: number;
	posts: number;
	comments: number;
	votes: number;
}

/** Count docs in a collection, optionally only those created since `sinceMs`. */
async function countSince(coll: string, sinceMs: number | null): Promise<number> {
	let q: FirebaseFirestore.Query = db.collection(coll);
	if (sinceMs !== null) q = q.where("createdAt", ">=", Timestamp.fromMillis(sinceMs));
	const snap = await q.count().get();
	return snap.data().count;
}

/**
 * A transparent, conservative cost estimate — NOT a bill. Firestore's free tier
 * covers 20K writes/day and 1 GiB storage; beyond that, writes are ~$0.18/100K and
 * storage ~$0.18/GiB/mo. Reads, Cloud Functions, and Vertex AI are usage-driven and
 * excluded here, so the real figure lives in the Firebase console (which the UI links).
 */
function estimateCost(
	totals: { users: number; posts: number; comments: number; votes: number; communities: number },
	windows: Record<WindowKey, WindowCounts>,
) {
	// Stored size: posts carry a 768-float embedding (~6 KB) plus their body.
	const estStorageBytes = totals.posts * 7000 + totals.comments * 1000 + (totals.users + totals.votes + totals.communities) * 600;
	const estStorageGiB = estStorageBytes / 1024 ** 3;

	// Approx write events in the last 30d. Real writes run higher (counter and
	// denormalization updates), so scale up modestly for a conservative number.
	const w = windows["30d"];
	const estWrites30d = Math.round((w.users + w.posts + w.comments + w.votes) * 2.5);

	const freeWrites30d = 20000 * 30;
	const writeCost = (Math.max(0, estWrites30d - freeWrites30d) / 100000) * 0.18;
	const storageCost = Math.max(0, estStorageGiB - 1) * 0.18;
	const estMonthlyUsd = Math.round((writeCost + storageCost) * 100) / 100;

	return {
		estStorageMb: Math.round((estStorageBytes / (1024 * 1024)) * 10) / 10,
		estWrites30d,
		estMonthlyUsd,
		withinFreeTier: estWrites30d < freeWrites30d && estStorageGiB < 1,
	};
}

export const getPlatformStats = onCall(async (request) => {
	const { profile } = await requireActiveUser(request);
	requireRole(profile, "admin");

	const now = Date.now();

	// All-time totals (+ communities).
	const [users, posts, comments, votes, communities] = await Promise.all([
		countSince(COL.users, null),
		countSince(COL.posts, null),
		countSince(COL.comments, null),
		countSince(COL.votes, null),
		countSince(COL.communities, null),
	]);
	const totals = { users, posts, comments, votes, communities };

	// Per-window counts for the activity collections.
	const windowKeys = Object.keys(WINDOW_DAYS) as WindowKey[];
	const windowResults = await Promise.all(
		windowKeys.map(async (key) => {
			const sinceMs = now - WINDOW_DAYS[key] * 86_400_000;
			const [u, p, c, v] = await Promise.all([
				countSince(COL.users, sinceMs),
				countSince(COL.posts, sinceMs),
				countSince(COL.comments, sinceMs),
				countSince(COL.votes, sinceMs),
			]);
			return [key, { users: u, posts: p, comments: c, votes: v }] as const;
		}),
	);
	const windows = Object.fromEntries(windowResults) as Record<WindowKey, WindowCounts>;

	return { generatedAt: now, totals, windows, estimate: estimateCost(totals, windows) };
});
