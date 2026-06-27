import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listOpenReports } from "../../lib/firestore";
import { removeContent, dismissReport, suspendUser, banUser } from "../../lib/api";
import { relativeTime } from "../../lib/time";
import { Skeleton, EmptyState, ErrorState } from "../../components/states";
import type { Report, ReportReason } from "../../types/models";

const REASON_LABEL: Record<ReportReason, string> = {
	spam: "Spam",
	harassment: "Harassment",
	medical_misinfo: "Medical misinfo",
	self_harm: "Self-harm",
	hate: "Hate",
	off_topic: "Off-topic",
	other: "Other",
};

const PRIORITY: ReportReason[] = ["self_harm", "medical_misinfo", "harassment", "hate"];

function ReportRow({ report, isAdmin, onDone }: { report: Report; isAdmin: boolean; onDone: () => void }) {
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState<string | null>(null);

	async function run(fn: () => Promise<unknown>) {
		setBusy(true);
		setErr(null);
		try {
			await fn();
			onDone();
		} catch {
			setErr("Action failed. Please try again.");
			setBusy(false);
		}
	}

	const isContent = report.targetType === "post" || report.targetType === "comment";
	const targetLink = report.targetType === "post" ? `/post/${report.targetId}` : report.targetType === "user" ? `/u/${report.targetId}` : undefined;
	const priority = PRIORITY.includes(report.reason);

	return (
		<li className={`rounded-xl border p-4 ${priority ? "border-coral-soft bg-coral-wash" : "border-line bg-surface"}`}>
			<div className="flex flex-wrap items-center gap-2 text-xs">
				<span className={`rounded-full px-2 py-0.5 font-semibold ${priority ? "bg-coral text-white" : "bg-bg-2 text-ink-2"}`}>
					{REASON_LABEL[report.reason]}
				</span>
				<span className="text-muted">{report.targetType}</span>
				<span className="text-muted-2">· {relativeTime(report.createdAt)}</span>
				{report.status === "reviewing" && <span className="text-lav">· reviewing</span>}
			</div>

			{report.details && <p className="mt-2 text-sm text-ink-2">“{report.details}”</p>}

			<div className="mt-3 flex flex-wrap items-center gap-2">
				{targetLink && (
					<Link
						to={targetLink}
						className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-coral">
						View {report.targetType}
					</Link>
				)}
				{isContent && (
					<button
						onClick={() =>
							run(() =>
								removeContent({
									targetType: report.targetType as "post" | "comment",
									targetId: report.targetId,
									reason: REASON_LABEL[report.reason],
									relatedReportId: report.id,
								}),
							)
						}
						disabled={busy}
						className="rounded-full bg-coral px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
						Remove
					</button>
				)}
				<button
					onClick={() => run(() => dismissReport({ reportId: report.id }))}
					disabled={busy}
					className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-coral disabled:opacity-50">
					Dismiss
				</button>
				{isAdmin && report.targetType === "user" && (
					<>
						<button
							onClick={() => run(() => suspendUser({ uid: report.targetId, durationHours: 168, reason: REASON_LABEL[report.reason] }))}
							disabled={busy}
							className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-coral disabled:opacity-50">
							Suspend 7d
						</button>
						<button
							onClick={() => run(() => banUser({ uid: report.targetId, reason: REASON_LABEL[report.reason], permanent: true }))}
							disabled={busy}
							className="rounded-full bg-ink px-3 py-1.5 text-sm font-medium text-cream disabled:opacity-50">
							Ban
						</button>
					</>
				)}
			</div>
			{err && <p className="mt-2 text-sm text-coral">{err}</p>}
		</li>
	);
}

/** Shared moderation report queue. Admins see user-level actions too. */
export function ReportQueue({ isAdmin = false }: { isAdmin?: boolean }) {
	const qc = useQueryClient();
	const q = useQuery({ queryKey: ["reports", "open"], queryFn: listOpenReports });
	const refresh = () => qc.invalidateQueries({ queryKey: ["reports", "open"] });

	if (q.isPending) return <Skeleton className="h-24 w-full" />;
	if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
	const reports = q.data ?? [];
	if (reports.length === 0) {
		return <EmptyState title="Queue is clear" body="No open reports right now. Nice and calm." />;
	}

	// Priority reports first, then newest.
	const sorted = [...reports].sort((a, b) => {
		const pa = PRIORITY.includes(a.reason) ? 0 : 1;
		const pb = PRIORITY.includes(b.reason) ? 0 : 1;
		return pa - pb || b.createdAt - a.createdAt;
	});

	return (
		<ul className="space-y-3">
			{sorted.map((r) => (
				<ReportRow key={r.id} report={r} isAdmin={isAdmin} onDone={refresh} />
			))}
		</ul>
	);
}
