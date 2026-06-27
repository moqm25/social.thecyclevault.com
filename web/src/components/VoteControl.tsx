import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";
import { useReturnTo } from "./SignInLink";
import type { VoteValue } from "../types/models";

/**
 * Vote control with optimistic local state, reconciled against the server's
 * authoritative score. `onVote` resolves with the new score from the callable
 * (voteOnPost/voteOnComment return `{ score }`). Guests are nudged to sign in.
 *
 * We seed the displayed score from `baseScore` once and then own it locally, so
 * callers must NOT invalidate the post/feed query on vote (that would refetch a
 * score already including this vote and double-count). On a fresh load the server
 * score is the source of truth. We also don't pre-read the user's existing vote
 * (saves a Firestore read per item); the active state reflects this session.
 */
export function VoteControl({
	baseScore,
	orientation = "vertical",
	onVote,
}: {
	baseScore: number;
	orientation?: "vertical" | "horizontal";
	onVote: (next: VoteValue | 0, prev: VoteValue | 0) => Promise<{ score: number } | unknown>;
}) {
	const { user } = useAuth();
	const navigate = useNavigate();
	const returnTo = useReturnTo();
	const [myVote, setMyVote] = useState<VoteValue | 0>(0);
	const [score, setScore] = useState<number>(baseScore);
	const [pending, setPending] = useState(false);

	async function cast(dir: VoteValue) {
		if (!user) {
			navigate("/login", { state: { from: returnTo } });
			return;
		}
		if (pending) return;
		const prevVote = myVote;
		const prevScore = score;
		const next: VoteValue | 0 = myVote === dir ? 0 : dir; // toggle off if same

		// Optimistic update.
		setMyVote(next);
		setScore(prevScore + (next - prevVote));
		setPending(true);
		try {
			const res = (await onVote(next, prevVote)) as { score?: number } | undefined;
			if (res && typeof res.score === "number") setScore(res.score); // reconcile
		} catch {
			setMyVote(prevVote);
			setScore(prevScore); // rollback
		} finally {
			setPending(false);
		}
	}

	const displayScore = score;
	const wrap = orientation === "vertical" ? "flex-col" : "flex-row";
	const up = myVote === 1;
	const down = myVote === -1;

	return (
		<div className={`flex ${wrap} items-center gap-1 select-none`}>
			<button
				type="button"
				onClick={() => cast(1)}
				aria-label="Upvote"
				aria-pressed={up}
				className={`grid h-7 w-7 place-items-center rounded-md transition-colors ${up ? "text-coral" : "text-muted hover:text-coral"}`}>
				<svg width="18" height="18" viewBox="0 0 24 24" fill={up ? "currentColor" : "none"} aria-hidden="true">
					<path d="M12 5l7 8H5l7-8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
				</svg>
			</button>
			<span className={`min-w-[2ch] text-center text-sm font-semibold tabular-nums ${up ? "text-coral" : down ? "text-lav" : "text-ink-2"}`}>
				{displayScore}
			</span>
			<button
				type="button"
				onClick={() => cast(-1)}
				aria-label="Downvote"
				aria-pressed={down}
				className={`grid h-7 w-7 place-items-center rounded-md transition-colors ${down ? "text-lav" : "text-muted hover:text-lav"}`}>
				<svg width="18" height="18" viewBox="0 0 24 24" fill={down ? "currentColor" : "none"} aria-hidden="true">
					<path d="M12 19l-7-8h14l-7 8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
				</svg>
			</button>
		</div>
	);
}
