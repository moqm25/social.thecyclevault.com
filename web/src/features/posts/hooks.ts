import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listPosts, getPost, listComments, listCommunities, getCommunity, type FeedSort } from "../../lib/firestore";
import { voteOnPost, voteOnComment, deletePostSoft, reportContent } from "../../lib/api";
import type { VoteValue, ReportReason } from "../../types/models";

/** Communities (small, cached long). */
export function useCommunities() {
	return useQuery({ queryKey: ["communities"], queryFn: listCommunities, staleTime: 5 * 60_000 });
}

export function useCommunity(slug: string | undefined) {
	return useQuery({
		queryKey: ["community", slug],
		queryFn: () => getCommunity(slug!),
		enabled: !!slug,
	});
}

/** Paginated feed — global or per-community, by sort. */
export function useFeed(opts: { communityId?: string; sort: FeedSort }) {
	return useInfiniteQuery({
		queryKey: ["feed", opts.communityId ?? "all", opts.sort],
		queryFn: ({ pageParam }) => listPosts({ communityId: opts.communityId, sort: opts.sort, cursor: pageParam }),
		initialPageParam: null as Awaited<ReturnType<typeof listPosts>>["cursor"],
		getNextPageParam: (last) => last.cursor,
	});
}

export function usePost(id: string | undefined) {
	return useQuery({
		queryKey: ["post", id],
		queryFn: () => getPost(id!),
		enabled: !!id,
	});
}

export function useComments(postId: string | undefined) {
	return useQuery({
		queryKey: ["comments", postId],
		queryFn: () => listComments(postId!),
		enabled: !!postId,
	});
}

/**
 * Optimistic vote on a post. Updates the cached post score immediately, rolls
 * back on error. `next` is the desired vote value; `prev` the current one.
 */
/**
 * Vote mutations return the server's authoritative score, which VoteControl
 * reconciles locally. We deliberately do NOT invalidate the post/feed/comment
 * queries here: those provide the seed `baseScore`, and refetching one that
 * already includes this vote would double-count. A fresh page load re-reads the
 * true score from the server.
 */
export function useVotePost(postId: string) {
	return useMutation({
		mutationFn: ({ next }: { next: VoteValue | 0; prev: VoteValue | 0 }) => voteOnPost({ postId, value: next }),
	});
}

export function useVoteComment(_postId: string) {
	return useMutation({
		mutationFn: ({ commentId, next }: { commentId: string; next: VoteValue | 0; prev: VoteValue | 0 }) =>
			voteOnComment({ commentId, value: next }),
	});
}

/** Delete your own post (soft delete) and refresh the feed + post view. */
export function useDeletePost() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (postId: string) => deletePostSoft({ postId }),
		onSuccess: (_d, postId) => {
			qc.invalidateQueries({ queryKey: ["feed"] });
			qc.invalidateQueries({ queryKey: ["post", postId] });
		},
	});
}

/** Report a post or comment for moderator review. */
export function useReportContent() {
	return useMutation({
		mutationFn: (vars: { targetType: "post" | "comment"; targetId: string; reason: ReportReason; details?: string }) =>
			reportContent(vars),
	});
}
