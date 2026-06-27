import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPlatformStats } from "../../lib/api";
import { env } from "../../lib/env";
import type { PlatformStatsWindowKey } from "../../types/models";
import { EmptyState, ErrorState, Skeleton } from "../../components/states";

const WINDOWS: { key: PlatformStatsWindowKey; label: string }[] = [
	{ key: "24h", label: "24 hours" },
	{ key: "7d", label: "7 days" },
	{ key: "30d", label: "30 days" },
	{ key: "90d", label: "90 days" },
	{ key: "365d", label: "1 year" },
];

function Tile({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-2xl border border-line bg-surface p-4">
			<p className="text-2xl font-semibold text-ink">{value.toLocaleString()}</p>
			<p className="text-xs text-muted-2">{label}</p>
		</div>
	);
}

/**
 * Admin usage analytics + a rough cost estimate. Reads from the server-side
 * `getPlatformStats` callable (admin-gated aggregation counts), so it reflects ALL
 * content/users, not just what's publicly readable.
 */
export function InsightsPanel() {
	const [range, setRange] = useState<PlatformStatsWindowKey>("30d");
	const stats = useQuery({
		queryKey: ["platform-stats"],
		queryFn: () => getPlatformStats({}),
		staleTime: 5 * 60_000,
		retry: 0,
	});

	if (stats.isPending) return <Skeleton className="h-64 w-full rounded-2xl" />;
	if (stats.isError) return <ErrorState onRetry={() => stats.refetch()} />;
	const d = stats.data;
	if (!d) return <EmptyState title="No data yet" body="Stats will appear once there's activity." />;

	const w = d.windows[range];
	const est = d.estimate;

	return (
		<div className="space-y-8">
			{/* All-time totals */}
			<section>
				<h2 className="mb-1 text-base font-semibold text-ink">All-time totals</h2>
				<p className="mb-3 text-sm text-muted">Everything in the community to date.</p>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
					<Tile label="Members" value={d.totals.users} />
					<Tile label="Posts" value={d.totals.posts} />
					<Tile label="Comments" value={d.totals.comments} />
					<Tile label="Votes" value={d.totals.votes} />
					<Tile label="Circles" value={d.totals.communities} />
				</div>
			</section>

			{/* Activity over time */}
			<section>
				<div className="mb-3 flex flex-wrap items-center justify-between gap-3">
					<div>
						<h2 className="text-base font-semibold text-ink">Activity</h2>
						<p className="text-sm text-muted">New content created in the selected window.</p>
					</div>
					<div className="inline-flex flex-wrap rounded-full border border-line p-0.5">
						{WINDOWS.map((x) => (
							<button
								key={x.key}
								onClick={() => setRange(x.key)}
								aria-pressed={range === x.key}
								className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
									range === x.key ? "bg-coral text-white" : "text-muted hover:text-coral"
								}`}>
								{x.label}
							</button>
						))}
					</div>
				</div>
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					<Tile label="New members" value={w.users} />
					<Tile label="New posts" value={w.posts} />
					<Tile label="New comments" value={w.comments} />
					<Tile label="Votes cast" value={w.votes} />
				</div>
			</section>

			{/* Estimated cost */}
			<section>
				<h2 className="mb-1 text-base font-semibold text-ink">Estimated cost</h2>
				<p className="mb-3 text-sm text-muted">A rough estimate from your usage — not a bill.</p>
				<div className="rounded-2xl border border-line bg-surface p-5">
					<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
						<span className="text-3xl font-semibold text-ink">
							{est.estMonthlyUsd === 0 ? "≈ $0" : `≈ $${est.estMonthlyUsd.toFixed(2)}`}
						</span>
						<span className="text-sm text-muted-2">/ month (estimated)</span>
						{est.withinFreeTier && (
							<span className="rounded-full bg-lav-wash px-2 py-0.5 text-xs font-medium text-lav">Within free tier</span>
						)}
					</div>
					<dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
						<div>
							<dt className="text-muted-2">Stored data (est.)</dt>
							<dd className="font-medium text-ink">{est.estStorageMb.toLocaleString()} MB</dd>
						</div>
						<div>
							<dt className="text-muted-2">Writes · last 30d (est.)</dt>
							<dd className="font-medium text-ink">{est.estWrites30d.toLocaleString()}</dd>
						</div>
					</dl>
					<p className="mt-4 text-xs text-muted-2">
						Excludes reads, Cloud Functions, and AI usage, which vary with traffic. For exact billing, open the{" "}
						<a
							href={`https://console.firebase.google.com/project/${env.VITE_FIREBASE_PROJECT_ID}/usage`}
							target="_blank"
							rel="noopener noreferrer"
							className="font-medium text-coral hover:underline">
							Firebase usage dashboard
						</a>
						.
					</p>
				</div>
			</section>

			<p className="text-xs text-muted-2">Updated {new Date(d.generatedAt).toLocaleString()}.</p>
		</div>
	);
}
