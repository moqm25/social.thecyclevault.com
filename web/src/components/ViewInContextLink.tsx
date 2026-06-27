import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

/**
 * A moderation "View in context" link. It deep-links into the post and adds
 * `?focus=<id>` so the destination highlights and scrolls to the exact flagged
 * item (post or comment), and it remembers the current queue via `state.from`
 * so the post page can offer a "← Back" button. Used across the mod/admin queues.
 */
export function ViewInContextLink({
	postId,
	focusId,
	className,
	children,
}: {
	/** The post to open. For a comment, this is its parent post. */
	postId: string;
	/** The item to highlight — the post id or the comment id. */
	focusId: string;
	className?: string;
	children: ReactNode;
}) {
	const location = useLocation();
	const to = `/post/${postId}?focus=${encodeURIComponent(focusId)}`;
	return (
		<Link to={to} state={{ from: location.pathname + location.search }} className={className}>
			{children}
		</Link>
	);
}
