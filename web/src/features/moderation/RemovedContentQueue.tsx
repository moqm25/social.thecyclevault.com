import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listRemovedPosts, listRemovedComments } from "../../lib/firestore";
import { relativeTime } from "../../lib/time";
import { ViewInContextLink } from "../../components/ViewInContextLink";

/**
 * Admin: recently removed or deleted content (founder request — "deleted content
 * show in the admin dashboard"). Read access is gated to mods/admins by rules.
 * 'removed' = taken down by moderation; 'deleted' = removed by the author.
 */
export function RemovedContentQueue() {
	const posts = useQuery({ queryKey: ["removedPosts"], queryFn: listRemovedPosts });
	const comments = useQuery({ queryKey: ["removedComments"], queryFn: listRemovedComments });

	const loading = posts.isPending || comments.isPending;
	const error = posts.isError || comments.isError;

	if (error)
		return (
			<button
				onClick={() => {
					posts.refetch();
					comments.refetch();
				}}
				className="text-sm text-coral hover:underline">
				Couldn’t load — retry
			</button>
		);
	if (loading) return <p className="text-sm text-muted">Loading…</p>;

	const p = posts.data ?? [];
	const c = comments.data ?? [];
	if (p.length === 0 && c.length === 0) return <p className="text-sm text-muted">Nothing removed or deleted recently. 🌿</p>;

	return (
		<div className="space-y-4">
			{p.length > 0 && (
				<div>
					<h3 className="mb-2 text-sm font-semibold text-ink">Posts</h3>
					<ul className="space-y-2">
						{p.map((post) => (
							<li key={post.id} className="rounded-xl border border-dashed border-line bg-bg-2/40 p-3 text-sm">
								<div className="flex items-center gap-2 text-xs text-muted">
									<Badge status={post.status} />
									<Link to={`/u/${post.authorUsername}`} className="hover:underline">
										{post.authorUsername}
									</Link>
									<span aria-hidden="true">·</span>
									<span>{relativeTime(post.updatedAt)}</span>
								</div>
								<ViewInContextLink postId={post.id} focusId={post.id} className="mt-1 block font-medium text-ink hover:text-coral">
									{post.title}
								</ViewInContextLink>
							</li>
						))}
					</ul>
				</div>
			)}
			{c.length > 0 && (
				<div>
					<h3 className="mb-2 text-sm font-semibold text-ink">Comments</h3>
					<ul className="space-y-2">
						{c.map((comment) => (
							<li key={comment.id} className="rounded-xl border border-dashed border-line bg-bg-2/40 p-3 text-sm">
								<div className="flex items-center gap-2 text-xs text-muted">
									<Badge status={comment.status} />
									<Link to={`/u/${comment.authorUsername}`} className="hover:underline">
										{comment.authorUsername}
									</Link>
									<span aria-hidden="true">·</span>
									<span>{relativeTime(comment.updatedAt)}</span>
								</div>
								<ViewInContextLink postId={comment.postId} focusId={comment.id} className="mt-1 block text-ink-2 hover:text-coral">
									{comment.body}
								</ViewInContextLink>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}

function Badge({ status }: { status: string }) {
	return (
		<span className="rounded-full bg-coral-wash px-1.5 py-0.5 text-[10px] font-semibold uppercase text-coral">{status}</span>
	);
}
