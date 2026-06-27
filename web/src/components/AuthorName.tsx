import { Link } from "react-router-dom";
import type { BadgeKind } from "../types/models";
import { UserBadges } from "./Badge";
import { SignInLink } from "./SignInLink";
import { useAuth } from "../features/auth/AuthProvider";

/**
 * Renders a post/comment author. The privacy differentiator vs. Reddit:
 * **logged-out guests don't see who's talking** — usernames are blurred to a
 * neutral "a member" token (the real name is NOT in the DOM), with a quiet nudge
 * to sign in. Signed-in members see the real pseudonymous name + badges and can
 * visit the profile. This makes the community feel like a private room you have
 * to be *in*, not a public feed search engines and lurkers mine.
 */
export function AuthorName({
	username,
	badges,
	supporter,
	maxBadges = 1,
	className = "hover:underline",
}: {
	username: string;
	badges?: BadgeKind[];
	supporter?: boolean;
	maxBadges?: number;
	className?: string;
}) {
	const { user } = useAuth();

	// Guests: blur. We intentionally render a fixed placeholder (not the real
	// username) so nothing identifying leaks into the page source.
	if (!user) {
		return (
			<SignInLink
				title="Sign in to see who’s talking"
				aria-label="Hidden — sign in to see who’s talking"
				className="inline-flex items-center gap-1 text-muted">
				<span className="select-none blur-[3px]" aria-hidden="true">
					a member
				</span>
				<svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="opacity-70">
					<rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.7" />
					<path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
				</svg>
			</SignInLink>
		);
	}

	return (
		<>
			<Link to={`/u/${username}`} className={className}>
				{username}
			</Link>
			<UserBadges badges={badges} supporter={supporter} max={maxBadges} />
		</>
	);
}
