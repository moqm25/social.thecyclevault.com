import { db, FieldValue, COL } from "./admin.js";
import type { ModerationState, Tier1Result, Tier2Result } from "./moderation.js";

/**
 * Write one moderationQueue entry per created post/comment — the full audit
 * stream the admin dashboard reads (docs/MODERATION_AI.md §3). Function-only.
 */
export async function enqueueModeration(input: {
	contentType: "post" | "comment";
	contentId: string;
	communityId: string;
	postId?: string | null;
	authorId: string;
	authorUsername: string;
	excerpt: string;
	state: ModerationState;
	tier1: Tier1Result;
	tier2?: Tier2Result;
	decidedBy: "heuristic" | "ai";
}): Promise<string> {
	const ref = db.collection(COL.moderationQueue).doc();
	await ref.set({
		contentType: input.contentType,
		contentId: input.contentId,
		communityId: input.communityId,
		postId: input.postId ?? null,
		authorId: input.authorId,
		authorUsername: input.authorUsername,
		excerpt: input.excerpt.slice(0, 200),
		state: input.state,
		tier1: input.tier1,
		tier2: input.tier2 ?? null,
		decidedBy: input.decidedBy,
		reason: null,
		createdAt: FieldValue.serverTimestamp(),
		decidedAt: input.state === "awaiting_human" ? null : FieldValue.serverTimestamp(),
	});
	return ref.id;
}
