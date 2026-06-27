import { useEffect, useMemo, useRef, useState } from "react";
import type { Comment } from "../../types/models";
import { relativeTime } from "../../lib/time";
import { VoteControl } from "../../components/VoteControl";
import { AuthorName } from "../../components/AuthorName";
import { ContentMenu } from "../../components/ContentMenu";
import { ModerationDetails } from "../../components/ModerationDetails";
import { useAuth } from "../auth/AuthProvider";
import { useAdminView } from "../admin/AdminViewContext";
import { useVoteComment } from "../posts/hooks";
import { useCreateComment, useDeleteComment } from "./hooks";
import { CommentComposer } from "./CommentComposer";

interface TreeNode extends Comment {
	children: TreeNode[];
}

function buildTree(comments: Comment[]): TreeNode[] {
	const byId = new Map<string, TreeNode>();
	comments.forEach((c) => byId.set(c.id, { ...c, children: [] }));
	const roots: TreeNode[] = [];
	byId.forEach((node) => {
		if (node.parentCommentId && byId.has(node.parentCommentId)) {
			byId.get(node.parentCommentId)!.children.push(node);
		} else {
			roots.push(node);
		}
	});
	return roots;
}

function CommentItem({ node, postId, focusId }: { node: TreeNode; postId: string; focusId?: string }) {
	const { user } = useAuth();
	const { adminView } = useAdminView();
	const voteComment = useVoteComment(postId);
	const createComment = useCreateComment(postId);
	const deleteComment = useDeleteComment(postId);
	const [replying, setReplying] = useState(false);

	const hidden = node.status === "removed" || node.status === "deleted";
	const focused = focusId === node.id;
	const cardRef = useRef<HTMLDivElement>(null);

	// When this comment is the moderation focus, bring it into view once.
	useEffect(() => {
		if (focused && cardRef.current) {
			cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	}, [focused]);

	return (
		<li>
			<div
				id={`comment-${node.id}`}
				ref={cardRef}
				className={`rounded-xl border p-3 transition-shadow ${
					focused
						? "border-coral bg-coral-wash/40 ring-2 ring-coral/40"
						: hidden
							? "border-dashed border-line bg-bg-2/40"
							: "border-line bg-surface"
				}`}>
				<div className="flex items-center gap-2 text-xs text-muted">
					<AuthorName
						username={node.authorUsername}
						badges={node.authorBadges}
						supporter={node.authorSupporter}
						maxBadges={1}
						className="font-medium text-ink-2 hover:underline"
					/>
					<span aria-hidden="true">·</span>
					<span>{relativeTime(node.createdAt)}</span>
					{node.edited && <span className="italic">(edited)</span>}
					{hidden && (
						<span className="rounded-full bg-coral-wash px-1.5 py-0.5 text-[10px] font-semibold uppercase text-coral">
							{node.status}
						</span>
					)}
					<div className="ml-auto">
						<ContentMenu
							targetType="comment"
							targetId={node.id}
							authorId={node.authorId}
							onDelete={() => deleteComment.mutateAsync(node.id)}
						/>
					</div>
				</div>

				<p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{node.body}</p>

				{adminView && <ModerationDetails status={node.status} moderation={node.moderation} />}

				<div className="mt-2 flex items-center gap-3">
					<VoteControl
						baseScore={node.score}
						orientation="horizontal"
						onVote={(next, prev) => voteComment.mutateAsync({ commentId: node.id, next, prev })}
					/>
					{user && !hidden && (
						<button onClick={() => setReplying((v) => !v)} className="text-xs font-medium text-muted transition-colors hover:text-coral">
							Reply
						</button>
					)}
				</div>

				{replying && (
					<div className="mt-3">
						<CommentComposer
							placeholder={`Reply to ${node.authorUsername}…`}
							submitLabel="Reply"
							autoFocus
							onSubmit={async (body) => {
								await createComment.mutateAsync({ body, parentCommentId: node.id });
								setReplying(false);
							}}
							onCancel={() => setReplying(false)}
						/>
					</div>
				)}
			</div>

			{node.children.length > 0 && (
				<ul className="mt-2 space-y-2 border-l border-line pl-3 sm:pl-4">
					{node.children.map((child) => (
						<CommentItem key={child.id} node={child} postId={postId} focusId={focusId} />
					))}
				</ul>
			)}
		</li>
	);
}

export function CommentThread({ comments, postId, focusId }: { comments: Comment[]; postId: string; focusId?: string }) {
	const tree = useMemo(() => buildTree(comments), [comments]);
	if (tree.length === 0) {
		return <p className="py-6 text-center text-sm text-muted">No comments yet. Start the conversation.</p>;
	}
	return (
		<ul className="space-y-2">
			{tree.map((node) => (
				<CommentItem key={node.id} node={node} postId={postId} focusId={focusId} />
			))}
		</ul>
	);
}
