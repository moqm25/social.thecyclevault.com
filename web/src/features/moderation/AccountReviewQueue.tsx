import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listAccountsNeedingReview } from "../../lib/firestore";
import { suspendUser, banUser, clearUserStrikes } from "../../lib/api";
import { relativeTime } from "../../lib/time";

/**
 * Admin: accounts flagged for review after repeated strikes (docs/MODERATION_PLAN.md).
 * The strike system auto-escalates warnings → suspensions; at 5+ active strikes a
 * human decides. Admins can suspend longer, ban, or clear strikes (override).
 */
export function AccountReviewQueue() {
	const qc = useQueryClient();
	const { data, isPending, isError, refetch } = useQuery({
		queryKey: ["accountsNeedingReview"],
		queryFn: listAccountsNeedingReview,
	});
	const [busyUid, setBusyUid] = useState<string | null>(null);

	async function run(uid: string, fn: () => Promise<unknown>) {
		setBusyUid(uid);
		try {
			await fn();
			await qc.invalidateQueries({ queryKey: ["accountsNeedingReview"] });
		} finally {
			setBusyUid(null);
		}
	}

	if (isPending) return <p className="text-sm text-muted">Loading…</p>;
	if (isError)
		return (
			<button onClick={() => refetch()} className="text-sm text-coral hover:underline">
				Couldn’t load — retry
			</button>
		);
	if (!data || data.length === 0) return <p className="text-sm text-muted">No accounts need review. 🌿</p>;

	return (
		<div className="space-y-2">
			{data.map((m) => {
				const busy = busyUid === m.uid;
				return (
					<div key={m.uid} className="rounded-xl border border-line bg-surface p-3 text-sm">
						<div className="flex items-center justify-between gap-2">
							<span className="font-mono text-xs text-muted">{m.uid}</span>
							<span className="rounded-full bg-coral-wash px-2 py-0.5 text-[10px] font-semibold uppercase text-coral">
								{m.strikeCount} active · {m.strikeTotal} total
							</span>
						</div>
						{m.lastReason && <p className="mt-1 text-ink-2">Last: {m.lastReason}</p>}
						{m.lastStrikeAt && <p className="text-xs text-muted">{relativeTime(m.lastStrikeAt)}</p>}
						<div className="mt-2 flex flex-wrap gap-2">
							<button
								disabled={busy}
								onClick={() =>
									run(m.uid, () =>
										suspendUser({ uid: m.uid, durationHours: 720, reason: "Repeated guideline violations (admin review)" }),
									)
								}
								className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink-2 hover:text-coral disabled:opacity-50">
								Suspend 30 days
							</button>
							<button
								disabled={busy}
								onClick={() =>
									run(m.uid, () => banUser({ uid: m.uid, reason: "Repeated guideline violations", permanent: true }))
								}
								className="rounded-lg border border-coral-soft px-2.5 py-1 text-xs font-medium text-coral hover:bg-coral-wash disabled:opacity-50">
								Ban
							</button>
							<button
								disabled={busy}
								onClick={() => run(m.uid, () => clearUserStrikes({ uid: m.uid, reason: "Reviewed — cleared" }))}
								className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-muted hover:text-ink disabled:opacity-50">
								Clear strikes
							</button>
						</div>
					</div>
				);
			})}
		</div>
	);
}
