import { ReportQueue } from "../features/moderation/ReportQueue";

/** Admin dashboard: report queue with user-level actions + platform notes. */
export default function AdminDashboard() {
	return (
		<div className="mx-auto max-w-2xl space-y-6">
			<div>
				<h1 className="text-xl font-semibold text-ink">Admin</h1>
				<p className="text-sm text-muted">
					Full report queue across all communities, with user suspension and ban actions.
				</p>
			</div>

			<ReportQueue isAdmin />

			<section className="rounded-2xl border border-line bg-surface p-5 text-sm text-muted shadow-soft">
				<h2 className="mb-1 font-semibold text-ink">Platform</h2>
				<p>
					Role changes and platform settings are performed via Cloud Functions (`setUserRole`, settings) — surfaced
					here in a later iteration. Every privileged action is written to the append-only audit log.
				</p>
			</section>
		</div>
	);
}
