import { onCall } from "firebase-functions/v2/https";
import { db, COL } from "../shared/admin.js";
import { parseInput } from "../shared/validate.js";
import { enforceRateLimit, RATE } from "../shared/rateLimit.js";
import { searchContentSchema } from "../shared/schemas.js";

/**
 * searchContent — community search + a curated answer (docs/SEARCH.md).
 *
 * Privacy-first by design:
 * - Searches ONLY public, active content (status == "active"); never surfaces
 *   pending/removed/deleted posts.
 * - STATELESS: search queries are never stored or tied to a user (no history).
 * - The curated answer is grounded ONLY in the retrieved public discussions
 *   (retrieval-augmented). When SEARCH_AI_KEY/OPENAI_API_KEY is set and the caller
 *   is signed in, a real LLM synthesizes it (post titles + excerpts only — never
 *   usernames or any PII leave our backend). Otherwise we return a deterministic
 *   "community snapshot" built from the same results, so the feature works with no
 *   key. The LLM is hard-prompted to give no medical advice.
 *
 * Note: Firestore has no native full-text search, so we fetch a recent/popular
 * slice and rank in memory. Fine at our scale; swap in a search index (Typesense/
 * Algolia/Meilisearch) when content grows (docs/SCALING_PLAN.md).
 */

const CANDIDATE_LIMIT = 300; // recent/popular active posts to rank in memory
const STOPWORDS = new Set([
	"the","a","an","and","or","of","to","in","is","it","for","on","my","i","me","you","we","with","about","how",
	"what","why","when","do","does","did","can","could","should","this","that","are","be","at","as","but","if","so","im",
]);

function tokenize(s: string): string[] {
	return [
		...new Set(
			s
				.toLowerCase()
				.replace(/[^a-z0-9\s]/g, " ")
				.split(/\s+/)
				.filter((t) => t.length >= 2 && !STOPWORDS.has(t)),
		),
	];
}

function toMillis(v: unknown): number | null {
	return v && typeof (v as { toMillis?: () => number }).toMillis === "function" ? (v as { toMillis: () => number }).toMillis() : null;
}

type Doc = Record<string, unknown>;

function publicPost(id: string, d: Doc) {
	return {
		id,
		authorId: String(d.authorId ?? ""),
		authorUsername: String(d.authorUsername ?? ""),
		authorBadges: (d.authorBadges as string[]) ?? [],
		authorSupporter: d.authorSupporter === true,
		communityId: String(d.communityId ?? ""),
		title: String(d.title ?? ""),
		body: String(d.body ?? ""),
		tags: (d.tags as string[]) ?? [],
		score: Number(d.score ?? 0),
		upvoteCount: Number(d.upvoteCount ?? 0),
		downvoteCount: Number(d.downvoteCount ?? 0),
		commentCount: Number(d.commentCount ?? 0),
		hotRank: Number(d.hotRank ?? 0),
		status: String(d.status ?? "active"),
		locked: d.locked === true,
		edited: d.edited === true,
		createdAt: toMillis(d.createdAt),
		updatedAt: toMillis(d.updatedAt),
	};
}
type PublicPost = ReturnType<typeof publicPost>;

function publicCommunity(id: string, d: Doc) {
	return {
		slug: id,
		name: String(d.name ?? id),
		description: String(d.description ?? ""),
		rules: (d.rules as string[]) ?? [],
		color: String(d.color ?? "coral"),
		icon: (d.icon as string | null) ?? null,
		visibility: "public" as const,
		memberCount: Number(d.memberCount ?? 0),
		postCount: Number(d.postCount ?? 0),
		moderatorIds: (d.moderatorIds as string[]) ?? [],
		createdAt: toMillis(d.createdAt),
		updatedAt: toMillis(d.updatedAt),
	};
}

function scorePost(tokens: string[], phrase: string, d: Doc): number {
	const title = String(d.title ?? "").toLowerCase();
	const body = String(d.body ?? "").toLowerCase();
	const tags = ((d.tags as string[]) ?? []).map((t) => String(t).toLowerCase());
	let s = 0;
	for (const t of tokens) {
		if (title.includes(t)) s += 5;
		if (tags.some((tag) => tag.includes(t))) s += 3;
		if (body.includes(t)) s += 1;
	}
	if (phrase.length >= 3 && title.includes(phrase)) s += 6; // exact-phrase bonus
	if (s > 0) s += Math.min(2, Math.log10(Number(d.score ?? 0) + 1)); // gentle popularity tiebreak
	return s;
}

function listJoin(items: string[]): string {
	if (items.length <= 1) return items.join("");
	if (items.length === 2) return `${items[0]} and ${items[1]}`;
	return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

interface AnswerSource {
	id: string;
	title: string;
	communityId: string;
}

/**
 * The LLM key. Production requires an explicit, dedicated `SEARCH_AI_KEY` (opt-in,
 * mirroring MODERATION_AI_KEY) so search never silently reuses an unrelated key.
 * In the local emulator only, fall back to a standard `OPENAI_API_KEY` so dev/demo
 * works out of the box. No key → grounded snapshot fallback (feature still works).
 */
function aiKey(): string | undefined {
	if (process.env.SEARCH_AI_KEY) return process.env.SEARCH_AI_KEY;
	if (process.env.FUNCTIONS_EMULATOR === "true") return process.env.OPENAI_API_KEY;
	return undefined;
}

/** Deterministic, grounded fallback — works with no LLM key. Honest + non-medical. */
function snapshotAnswer(query: string, posts: PublicPost[], nameOf: (slug: string) => string): { text: string; sources: AnswerSource[]; source: "snapshot" } {
	const circles = [...new Set(posts.map((p) => p.communityId))].slice(0, 3).map(nameOf);
	const titles = posts.slice(0, 3).map((p) => `“${p.title}”`);
	const n = posts.length;
	const text =
		`The community has ${n} discussion${n === 1 ? "" : "s"} touching on “${query}”. ` +
		(circles.length ? `It comes up most in ${listJoin(circles)}. ` : "") +
		(titles.length ? `Recent threads include ${listJoin(titles)}. ` : "") +
		`Have a read below to see what members shared. This isn’t medical advice — for anything personal, please check with a clinician.`;
	return { text, sources: posts.slice(0, 5).map((p) => ({ id: p.id, title: p.title, communityId: p.communityId })), source: "snapshot" };
}

/** Real LLM answer, grounded strictly in the provided public discussions. */
async function aiAnswer(query: string, posts: PublicPost[], nameOf: (slug: string) => string): Promise<{ text: string; sources: AnswerSource[]; source: "ai" }> {
	const key = aiKey();
	const top = posts.slice(0, 6);
	// Only public title + excerpt + circle name go to the model. No usernames, no PII.
	const context = top
		.map((p, i) => `[${i + 1}] (${nameOf(p.communityId)}) ${p.title}\n${p.body.slice(0, 400)}`)
		.join("\n\n");
	const system =
		"You are a calm, kind assistant for The CycleVault Social, a privacy-first, women-first community about menstrual and reproductive health. " +
		"Using ONLY the community discussions provided, write a short, warm, plain-language summary (2–4 sentences) of what members are saying about the person's search. " +
		"Hard rules: (1) Never give medical advice, diagnoses, or treatment instructions — gently suggest speaking with a clinician for personal concerns. " +
		"(2) Stay grounded in the provided discussions; if they don't really cover it, say so honestly. (3) Be calm and non-alarmist — no fear, no hype. " +
		"(4) Reference discussions by their bracket number like [1], [2] where relevant. (5) Never invent facts or statistics not present in the discussions.";
	const user = `Search: "${query}"\n\nCommunity discussions:\n${context}`;

	const res = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
		body: JSON.stringify({
			model: process.env.SEARCH_AI_MODEL || "gpt-4o-mini",
			messages: [
				{ role: "system", content: system },
				{ role: "user", content: user },
			],
			temperature: 0.3,
			max_tokens: 320,
		}),
	});
	if (!res.ok) throw new Error(`chat api ${res.status}`);
	const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
	const text = data.choices?.[0]?.message?.content?.trim();
	if (!text) throw new Error("no answer");
	return { text, sources: top.map((p) => ({ id: p.id, title: p.title, communityId: p.communityId })), source: "ai" };
}

export const searchContent = onCall(async (request) => {
	const input = parseInput(searchContentSchema, request.data);
	const uid = request.auth?.uid ?? null;
	if (uid) await enforceRateLimit(uid, "search", RATE.search.limit, RATE.search.windowMs);

	const query = input.query.trim();
	const tokens = tokenize(query);
	if (tokens.length === 0) {
		return { query, posts: [], communities: [], answer: null, aiAvailable: false };
	}
	const phrase = query.toLowerCase();

	// Candidate active posts (recent/popular), ranked in memory.
	const postSnap = await db.collection(COL.posts).where("status", "==", "active").orderBy("hotRank", "desc").limit(CANDIDATE_LIMIT).get();
	const scored: { post: PublicPost; score: number }[] = [];
	postSnap.forEach((d) => {
		const data = d.data() as Doc;
		const s = scorePost(tokens, phrase, data);
		if (s > 0) scored.push({ post: publicPost(d.id, data), score: s });
	});
	scored.sort((a, b) => b.score - a.score);
	const posts = scored.slice(0, 20).map((x) => x.post);

	// Communities (small set) + slug→name map for the answer.
	const commSnap = await db.collection(COL.communities).get();
	const nameBySlug = new Map<string, string>();
	const communities: ReturnType<typeof publicCommunity>[] = [];
	commSnap.forEach((d) => {
		const data = d.data() as Doc;
		nameBySlug.set(d.id, String(data.name ?? d.id));
		const hay = `${data.name ?? ""} ${data.description ?? ""}`.toLowerCase();
		if (tokens.some((t) => hay.includes(t)) || hay.includes(phrase)) communities.push(publicCommunity(d.id, data));
	});
	const nameOf = (slug: string) => nameBySlug.get(slug) ?? slug;

	// Curated answer (grounded in `posts`). Real AI when configured + signed in;
	// otherwise a deterministic snapshot. Null only when nothing relevant matched.
	const keyPresent = !!aiKey();
	let answer: { text: string; sources: AnswerSource[]; source: "ai" | "snapshot" } | null = null;
	if (input.ai !== false && posts.length > 0) {
		if (keyPresent && uid) {
			try {
				await enforceRateLimit(uid, "searchAI", RATE.searchAI.limit, RATE.searchAI.windowMs);
				answer = await aiAnswer(query, posts, nameOf);
			} catch {
				answer = snapshotAnswer(query, posts, nameOf); // fail soft → grounded snapshot
			}
		} else {
			answer = snapshotAnswer(query, posts, nameOf);
		}
	}

	// aiAvailable tells the client a richer AI answer is possible if you sign in.
	return { query, posts, communities, answer, aiAvailable: keyPresent && !uid };
});
