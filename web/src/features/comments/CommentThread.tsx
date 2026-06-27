import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Comment } from "../../types/models";
import { relativeTime } from "../../lib/time";
import { VoteControl } from "../../components/VoteControl";
import { useAuth } from "../auth/AuthProvider";
import { useVoteComment } from "../posts/hooks";
import { useCreateComment } from "./hooks";
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

function CommentItem({ node, postId }: { node: TreeNode; postId: string }) {
	const { user } = useAuth();
	const voteComment = useVoteComment(postId);
	const createComment = useCreateComment(postId);
	const [replying, setReplying] = useState(false);

	return (
		<li>
			<div className="rounded-xl border border-line bg-surface p-3">
				<div className="flex items-center gap-2 text-xs text-muted">
					<Link to={`/u/${node.authorUsername}`} className="font-medium text-ink-2 hover:underline">
						{node.authorUsername}
					</Link>
					<span aria-hidden="true">·</span>
					<span>{relativeTime(node.createdAt)}</span>
					{node.edited && <span className="italic">(edited)</span>}
				</div>

				<p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{node.body}</p>

				<div className="mt-2 flex items-center gap-3">
					<VoteControl
						baseScore={node.score}
						orientation="horizontal"
						onVote={(next, prev) => voteComment.mutateAsync({ commentId: node.id, next, prev })}
					/>
					{user && (
						<button
							onClick={() => setReplying((v) => !v)}
							className="text-xs font-medium text-muted transition-colors hover:text-coral">
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
						<CommentItem key={child.id} node={child} postId={postId} />
					))}
				</ul>
			)}
		</li>
	);
}

export function CommentThread({ comments, postId }: { comments: Comment[]; postId: string }) {
	const tree = useMemo(() => buildTree(comments), [comments]);
	if (tree.length === 0) {
		return <p className="py-6 text-center text-sm text-muted">No comments yet. Start the conversation.</p>;
	}
	return (
		<ul className="space-y-2">
			{tree.map((node) => (
				<CommentItem key={node.id} node={node} postId={postId} />
			))}
		</ul>
	);
}
