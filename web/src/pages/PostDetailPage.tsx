import { useParams, Link, useNavigate } from "react-router-dom";
import { usePost, useComments, useVotePost, useDeletePost } from "../features/posts/hooks";
import { useCreateComment } from "../features/comments/hooks";
import { CommentThread } from "../features/comments/CommentThread";
import { CommentComposer } from "../features/comments/CommentComposer";
import { VoteControl } from "../components/VoteControl";
import { AuthorName } from "../components/AuthorName";
import { ContentMenu } from "../components/ContentMenu";
import { SignInLink } from "../components/SignInLink";
import { ModerationDetails } from "../components/ModerationDetails";
import { Skeleton, ErrorState } from "../components/states";
import { relativeTime } from "../lib/time";
import { useAuth } from "../features/auth/AuthProvider";
import { useAdminView } from "../features/admin/AdminViewContext";

/** Full post view: post body + vote + comment composer + threaded comments. */
export default function PostDetailPage() {
	const { postId } = useParams<{ postId: string }>();
	const navigate = useNavigate();
	const { user } = useAuth();
	const { adminView } = useAdminView();
	const post = usePost(postId);
	const comments = useComments(postId, adminView);
	const votePost = useVotePost(postId ?? "");
	const createComment = useCreateComment(postId ?? "");
	const deletePost = useDeletePost();

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

	return (
		<div className="space-y-6">
			{p.status === "pending" && (
				<div className="rounded-xl border border-lav-soft bg-lav-wash px-4 py-3 text-sm text-ink-2">
					<strong className="text-ink">Under review.</strong> This is visible only to you while a moderator checks it. You’ll be notified
					once it’s approved.
				</div>
			)}
			{p.status === "removed" && (
				<div className="rounded-xl border border-coral-soft bg-coral-wash px-4 py-3 text-sm text-ink-2">
					<strong className="text-ink">Removed.</strong> This content wasn’t approved and isn’t visible to others.
				</div>
			)}
			<article className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
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
					<CommentThread comments={comments.data ?? []} postId={p.id} />
				)}
			</section>
		</div>
	);
}
