import { useParams, Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePost, useComments, useVotePost, useDeletePost } from "../features/posts/hooks";
import { useCreateComment } from "../features/comments/hooks";
import { CommentThread } from "../features/comments/CommentThread";
import { CommentComposer } from "../features/comments/CommentComposer";
import { VoteControl } from "../components/VoteControl";
import { AuthorName } from "../components/AuthorName";
import { ContentMenu } from "../components/ContentMenu";
import { SignInLink } from "../components/SignInLink";
import { ModerationDetails } from "../components/ModerationDetails";
import { AuthorModerationNotice } from "../components/AuthorModerationNotice";
import { Skeleton, ErrorState } from "../components/states";
import { relativeTime } from "../lib/time";
import { getComment } from "../lib/firestore";
import { useAuth } from "../features/auth/AuthProvider";
import { useAdminView } from "../features/admin/AdminViewContext";

/** Full post view: post body + vote + comment composer + threaded comments. */
export default function PostDetailPage() {
	const { postId } = useParams<{ postId: string }>();
	const navigate = useNavigate();
	const location = useLocation();
	const [searchParams] = useSearchParams();
	const { user } = useAuth();
	const { adminView } = useAdminView();
	const post = usePost(postId);
	const comments = useComments(postId, adminView);
	const votePost = useVotePost(postId ?? "");
	const createComment = useCreateComment(postId ?? "");
	const deletePost = useDeletePost();

	// Moderation deep-link: ?focus=<id> highlights the flagged item; state.from
	// remembers the queue we came from so we can offer a "← Back" button.
	const focus = searchParams.get("focus");
	const backTo = (location.state as { from?: string } | null)?.from ?? null;
	const postFocused = !!focus && !!postId && focus === postId;
	const commentFocus = focus && focus !== postId ? focus : undefined;
	const articleRef = useRef<HTMLElement>(null);

	// If the focused comment isn't in the active-only thread (e.g. the author's own
	// removed/held comment), fetch it directly so the notification lands somewhere
	// that actually shows the comment + why. Rules allow the author (or a mod) to read it.
	const focusComment = useQuery({ queryKey: ["comment", commentFocus], queryFn: () => getComment(commentFocus!), enabled: !!commentFocus });

	useEffect(() => {
		if (postFocused && articleRef.current) {
			articleRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	}, [postFocused]);

	if (post.isPending) {
		return (
			<div className="space-y-3">
				<Skeleton className="h-4 w-40" />
				<Skeleton className="h-8 w-3/4" />
				<Skeleton className="h-24 w-full" />
			</div>
		);
	}
	if (post.isError) return <ErrorState onRetry={() => post.refetch()} />;
	if (!post.data) {
		return (
			<div className="py-16 text-center">
				<p className="font-medium text-ink">Post not found</p>
				<Link to="/" className="mt-1 inline-block text-sm font-medium text-coral hover:underline">
					Back home
				</Link>
			</div>
		);
	}

	const p = post.data;
	const locked = p.locked || p.status === "locked";
	const isAuthor = !!user && p.authorId === user.uid;

	// Merge the deep-linked comment into the thread when the active query didn't
	// include it (the author's own hidden comment), so the notification isn't a dead end.
	const activeComments = comments.data ?? [];
	const threadComments =
		focusComment.data && !activeComments.some((c) => c.id === focusComment.data!.id) ? [...activeComments, focusComment.data] : activeComments;

	return (
		<div className="space-y-6">
			{backTo && (
				<button
					type="button"
					onClick={() => navigate(backTo)}
					className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-coral">
					<span aria-hidden="true">←</span> Back to review
				</button>
			)}
			{isAuthor ? (
				<AuthorModerationNotice status={p.status} moderation={p.moderation} kind="post" />
			) : (
				<>
					{p.status === "pending" && (
						<div className="rounded-xl border border-lav-soft bg-lav-wash px-4 py-3 text-sm text-ink-2">
							<strong className="text-ink">Under review.</strong> This is visible only to you while a moderator checks it. You’ll be
							notified once it’s approved.
						</div>
					)}
					{p.status === "removed" && (
						<div className="rounded-xl border border-coral-soft bg-coral-wash px-4 py-3 text-sm text-ink-2">
							<strong className="text-ink">Removed.</strong> This content wasn’t approved and isn’t visible to others.
						</div>
					)}
				</>
			)}
			<article
				ref={articleRef}
				className={`rounded-2xl border bg-surface p-5 shadow-soft transition-shadow ${
					postFocused ? "border-coral ring-2 ring-coral/40" : "border-line"
				}`}>
				<div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
					<Link to={`/c/${p.communityId}`} className="font-medium text-lav hover:underline">
						{p.communityId}
					</Link>
					<span aria-hidden="true">·</span>
					<AuthorName username={p.authorUsername} badges={p.authorBadges} supporter={p.authorSupporter} maxBadges={2} />
					<span aria-hidden="true">·</span>
					<span>{relativeTime(p.createdAt)}</span>
					{p.edited && <span className="italic">(edited)</span>}
					<div className="ml-auto">
						<ContentMenu
							targetType="post"
							targetId={p.id}
							authorId={p.authorId}
							onDelete={async () => {
								await deletePost.mutateAsync(p.id);
								navigate("/");
							}}
						/>
					</div>
				</div>

				<h1 className="mt-2 text-2xl font-semibold leading-tight text-ink">{p.title}</h1>
				{p.body && <p className="mt-3 whitespace-pre-wrap leading-relaxed text-ink-2">{p.body}</p>}

				{adminView && <ModerationDetails status={p.status} moderation={p.moderation} />}

				<div className="mt-4 flex items-center gap-4">
					<VoteControl baseScore={p.score} orientation="horizontal" onVote={(next, prev) => votePost.mutateAsync({ next, prev })} />
					<span className="text-sm text-muted">
						{p.commentCount} {p.commentCount === 1 ? "comment" : "comments"}
					</span>
				</div>
			</article>

			<section>
				<h2 className="mb-3 text-lg font-semibold text-ink">Comments</h2>

				{locked ? (
					<p className="rounded-xl border border-line bg-bg-2 px-4 py-3 text-sm text-muted">
						This post is locked. New comments are turned off.
					</p>
				) : user ? (
					<div className="mb-5 rounded-xl border border-line bg-surface p-3">
						<CommentComposer onSubmit={(body) => createComment.mutateAsync({ body })} />
					</div>
				) : (
					<p className="mb-5 rounded-xl border border-line bg-bg-2 px-4 py-3 text-sm text-muted">
						<SignInLink className="font-medium text-coral hover:underline">Sign in</SignInLink> to join the conversation.
					</p>
				)}

				{comments.isPending ? (
					<div className="space-y-2">
						<Skeleton className="h-16 w-full" />
						<Skeleton className="h-16 w-full" />
					</div>
				) : comments.isError ? (
					<ErrorState onRetry={() => comments.refetch()} />
				) : (
					<CommentThread comments={threadComments} postId={p.id} focusId={commentFocus} />
				)}
			</section>
		</div>
	);
}
