import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listIssueReports, getIssueReportScreenshot, resolveIssueReport } from "../../lib/api";
import { relativeTime } from "../../lib/time";
import { Skeleton, EmptyState, ErrorState } from "../../components/states";
import type { IssueReport } from "../../types/models";

const CATEGORY_LABEL: Record<string, string> = {
	bug: "Bug",
	broken: "Broken",
	visual: "Visual",
	account: "Account",
	performance: "Performance",
	other: "Other",
};

type StatusFilter = "open" | "resolved" | "all";

/**
 * Admin "Issues" queue — the inbox for "Report a problem" submissions (bugs/issues
 * from members and guests, not user flags). Lists reports with their message,
 * reporter, contact, and technical context; screenshots load on demand; and each
 * can be marked resolved or reopened. Reads/writes go through admin-gated callables.
 */
export function IssuesQueue() {
	const [status, setStatus] = useState<StatusFilter>("open");
	const qc = useQueryClient();
	const q = useQuery({
		queryKey: ["issueReports", status],
		queryFn: () => listIssueReports({ status }),
		staleTime: 30_000,
	});

	const items = q.data?.items ?? [];

	return (
		<div className="space-y-4">
			<div>
				<h2 className="text-base font-semibold text-ink">Issue reports</h2>
				<p className="text-sm text-muted">
					Bugs and problems reported by members and guests — not user flags. Review, then mark resolved.
				</p>
			</div>

			<div className="inline-flex rounded-full border border-line bg-surface p-0.5 text-sm">
				{(["open", "resolved", "all"] as StatusFilter[]).map((s) => (
					<button
						key={s}
						onClick={() => setStatus(s)}
						aria-pressed={status === s}
						className={`rounded-full px-3.5 py-1 capitalize transition-colors ${status === s ? "bg-coral text-white" : "text-muted hover:text-ink-2"}`}>
						{s}
					</button>
				))}
			</div>

			{q.isLoading ? (
				<div className="space-y-3">
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-24 w-full" />
				</div>
			) : q.isError ? (
				<ErrorState onRetry={() => q.refetch()} />
			) : items.length === 0 ? (
				<EmptyState title="Nothing here" body={status === "open" ? "No open issue reports. 🌿" : `No ${status} reports.`} />
			) : (
				<ul className="space-y-3">
					{items.map((r) => (
						<IssueRow key={r.id} report={r} onChanged={() => qc.invalidateQueries({ queryKey: ["issueReports"] })} />
					))}
				</ul>
			)}
		</div>
	);
}

function IssueRow({ report, onChanged }: { report: IssueReport; onChanged: () => void }) {
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState<string | null>(null);
	const [showContext, setShowContext] = useState(false);
	const [shot, setShot] = useState<"idle" | "loading" | string | null>("idle");

	const resolved = report.status === "resolved";

	async function setStatusTo(next: "open" | "resolved") {
		setBusy(true);
		setErr(null);
		try {
			await resolveIssueReport({ id: report.id, status: next });
			onChanged();
		} catch {
			setErr("Action failed. Please try again.");
			setBusy(false);
		}
	}

	async function loadShot() {
		setShot("loading");
		try {
			const res = await getIssueReportScreenshot({ id: report.id });
			setShot(res.screenshot);
		} catch {
			setShot(null);
		}
	}

	const contextRows = parseContext(report.context);

	return (
		<li className={`rounded-xl border p-4 ${resolved ? "border-line bg-bg-2/40" : "border-coral-soft bg-coral-wash/40"}`}>
			<div className="flex flex-wrap items-center gap-2 text-xs">
				<span className={`rounded-full px-2 py-0.5 font-semibold ${resolved ? "bg-bg-2 text-ink-2" : "bg-coral text-white"}`}>
					{CATEGORY_LABEL[report.category] ?? report.category}
				</span>
				<span className="text-muted">
					{report.reporterUsername ? `@${report.reporterUsername}` : "Guest"}
					{report.reporterRole && report.reporterRole !== "user" ? ` · ${report.reporterRole}` : ""}
				</span>
				{report.createdAt && <span className="text-muted-2">· {relativeTime(report.createdAt)}</span>}
				{resolved && <span className="text-lav">· resolved</span>}
			</div>

			<p className="mt-2 whitespace-pre-wrap text-sm text-ink-2">{report.message}</p>

			<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
				{report.email && (
					<span>
						Contact:{" "}
						<a href={`mailto:${report.email}`} className="text-coral hover:underline">
							{report.email}
						</a>
					</span>
				)}
				{report.hasScreenshot && <span>📎 Screenshot attached</span>}
			</div>

			{/* Screenshot (on demand) */}
			{report.hasScreenshot && (
				<div className="mt-3">
					{shot === "idle" ? (
						<button onClick={loadShot} className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-2 hover:text-coral">
							View screenshot
						</button>
					) : shot === "loading" ? (
						<Skeleton className="h-40 w-full max-w-sm" />
					) : shot ? (
						<a href={shot} target="_blank" rel="noreferrer">
							<img src={shot} alt="Reported screenshot" className="max-h-80 w-auto rounded-xl border border-line" />
						</a>
					) : (
						<p className="text-[13px] text-muted">Couldn't load the screenshot.</p>
					)}
				</div>
			)}

			{/* Technical context */}
			{contextRows.length > 0 && (
				<div className="mt-3 rounded-lg border border-line bg-surface">
					<button
						onClick={() => setShowContext((v) => !v)}
						aria-expanded={showContext}
						className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] font-medium text-ink-2">
						<span>Technical context</span>
						<span aria-hidden="true" className="text-muted">{showContext ? "▲" : "▼"}</span>
					</button>
					{showContext && (
						<dl className="space-y-1 border-t border-line px-3 py-2.5 text-[12px]">
							{contextRows.map((r) => (
								<div key={r.label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2">
									<dt className="text-muted">{r.label}</dt>
									<dd className="min-w-0 break-words text-ink-2">{r.value}</dd>
								</div>
							))}
						</dl>
					)}
				</div>
			)}

			<div className="mt-3 flex items-center gap-2">
				{resolved ? (
					<button
						onClick={() => setStatusTo("open")}
						disabled={busy}
						className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-coral disabled:opacity-60">
						Reopen
					</button>
				) : (
					<button
						onClick={() => setStatusTo("resolved")}
						disabled={busy}
						className="rounded-full bg-ink px-3.5 py-1.5 text-sm font-medium text-bg transition-transform hover:scale-[1.02] disabled:opacity-60">
						{busy ? "Working…" : "Mark resolved"}
					</button>
				)}
				{err && <span className="text-[13px] text-coral">{err}</span>}
			</div>
		</li>
	);
}

/** Parse the client debug JSON string into readable rows (best effort). */
function parseContext(context: string | null): { label: string; value: string }[] {
	if (!context) return [];
	try {
		const obj = JSON.parse(context) as Record<string, unknown>;
		return Object.entries(obj)
			.filter(([, v]) => v !== null && v !== "" && v !== undefined)
			.map(([k, v]) => ({ label: k, value: String(v) }));
	} catch {
		return [{ label: "context", value: context }];
	}
}
