import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listAwaitingReview, listModerationStream } from "../../lib/firestore";
import { reviewContent } from "../../lib/api";
import { relativeTime } from "../../lib/time";
import { Skeleton, EmptyState, ErrorState } from "../../components/states";
import { ViewInContextLink } from "../../components/ViewInContextLink";
import type { ModerationQueueItem, ModerationState } from "../../types/models";

const STATE_LABEL: Record<ModerationState, { label: string; cls: string }> = {
	auto_approved: { label: "Auto-approved", cls: "bg-bg-2 text-muted" },
	ai_approved: { label: "AI-approved", cls: "bg-lav-wash text-lav" },
	awaiting_human: { label: "Awaiting review", cls: "bg-coral-wash text-coral" },
	human_approved: { label: "Approved", cls: "bg-lav-wash text-lav" },
	human_removed: { label: "Removed", cls: "bg-coral-wash text-coral" },
};

function StateChip({ state }: { state: ModerationState }) {
	const m = STATE_LABEL[state];
	return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.cls}`}>{m.label}</span>;
}

function ItemMeta({ item }: { item: ModerationQueueItem }) {
	return (
		<div className="flex flex-wrap items-center gap-2 text-xs text-muted">
			<StateChip state={item.state} />
			<span>{item.contentType}</span>
			<Link to={`/u/${item.authorUsername}`} className="hover:underline">
				{item.authorUsername}
			</Link>
			<span className="text-muted-2">· {relativeTime(item.createdAt)}</span>
			{item.tier1.flags.length > 0 && <span className="text-muted-2">· flags: {item.tier1.flags.join(", ")}</span>}
			{item.tier2 && (
				<span className="text-muted-2">
					· AI safe {(item.tier2.safeConfidence * 100).toFixed(0)}%{item.tier2.usedAI ? "" : " (heuristic)"}
				</span>
			)}
		</div>
	);
}

function ReviewRow({ item, onDone }: { item: ModerationQueueItem; onDone: () => void }) {
	const [busy, setBusy] = useState(false);
	const [reason, setReason] = useState("");
	const [err, setErr] = useState<string | null>(null);
	const isSelfHarm = item.tier1.flags.includes("self_harm");

	async function act(decision: "approve" | "reject") {
		setBusy(true);
		setErr(null);
		try {
			await reviewContent({ contentType: item.contentType, contentId: item.contentId, decision, reason: reason || undefined });
			onDone();
		} catch {
			setErr("Action failed. Please try again.");
			setBusy(false);
		}
	}

	return (
		<li className={`rounded-xl border p-4 ${isSelfHarm ? "border-coral bg-coral-wash" : "border-line bg-surface"}`}>
			<ItemMeta item={item} />
			<p className="mt-2 whitespace-pre-wrap text-[15px] text-ink">{item.excerpt}</p>
			{isSelfHarm && (
				<p className="mt-2 rounded-lg bg-coral/10 px-3 py-2 text-sm text-ink-2">
					⚠ Possible crisis content — handle with care and empathy. Approving keeps it visible; consider reaching out with support
					resources.
				</p>
			)}
			<div className="mt-3 flex flex-wrap items-center gap-2">
				<ViewInContextLink
					postId={item.contentType === "post" ? item.contentId : (item.postId ?? item.contentId)}
					focusId={item.contentId}
					className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-coral">
					View in context
				</ViewInContextLink>
				<input
					value={reason}
					onChange={(e) => setReason(e.target.value)}
					placeholder="Reason (optional)"
					className="min-w-[10rem] flex-1 rounded-full border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-lav"
				/>
				<button
					onClick={() => act("approve")}
					disabled={busy}
					className="rounded-full bg-lav px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
					Approve
				</button>
				<button
					onClick={() => act("reject")}
					disabled={busy}
					className="rounded-full bg-coral px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
					Reject
				</button>
			</div>
			{err && <p className="mt-2 text-sm text-coral">{err}</p>}
		</li>
	);
}

/** Admin/mod content review: awaiting-human queue + the full AI/human stream. */
export function ContentReviewQueue() {
	const qc = useQueryClient();
	const [tab, setTab] = useState<"queue" | "stream">("queue");

	const awaiting = useQuery({ queryKey: ["mod-awaiting"], queryFn: listAwaitingReview, enabled: tab === "queue" });
	const stream = useQuery({ queryKey: ["mod-stream"], queryFn: listModerationStream, enabled: tab === "stream" });
	const refresh = () => qc.invalidateQueries({ queryKey: ["mod-awaiting"] });

	return (
		<section className="space-y-4">
			<div className="inline-flex rounded-full border border-line bg-surface p-0.5">
				{(["queue", "stream"] as const).map((t) => (
					<button
						key={t}
						onClick={() => setTab(t)}
						aria-pressed={tab === t}
						className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
							tab === t ? "bg-coral text-white" : "text-muted hover:text-coral"
						}`}>
						{t === "queue" ? "Awaiting review" : "All activity"}
					</button>
				))}
			</div>

			{tab === "queue" ? (
				awaiting.isPending ? (
					<Skeleton className="h-24 w-full" />
				) : awaiting.isError ? (
					<ErrorState onRetry={() => awaiting.refetch()} />
				) : (awaiting.data?.length ?? 0) === 0 ? (
					<EmptyState title="Nothing awaiting review" body="The AI cleared everything, or it's all been handled." />
				) : (
					<ul className="space-y-3">
						{awaiting.data!.map((it) => (
							<ReviewRow key={it.id} item={it} onDone={refresh} />
						))}
					</ul>
				)
			) : stream.isPending ? (
				<Skeleton className="h-24 w-full" />
			) : stream.isError ? (
				<ErrorState onRetry={() => stream.refetch()} />
			) : (stream.data?.length ?? 0) === 0 ? (
				<EmptyState title="No moderation activity yet" />
			) : (
				<ul className="space-y-2">
					{stream.data!.map((it) => (
						<li key={it.id} className="rounded-xl border border-line bg-surface p-3">
							<ItemMeta item={it} />
							<p className="mt-1.5 line-clamp-2 text-sm text-ink-2">{it.excerpt}</p>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
