import { ReportQueue } from "../features/moderation/ReportQueue";
import { ContentReviewQueue } from "../features/moderation/ContentReviewQueue";
import { AccountReviewQueue } from "../features/moderation/AccountReviewQueue";
import { SponsoredProductsAdmin } from "../features/admin/SponsoredProductsAdmin";

/** Admin dashboard: AI/human content review + report queue with user-level actions. */
export default function AdminDashboard() {
	return (
		<div className="mx-auto max-w-2xl space-y-8">
			<div>
				<h1 className="text-xl font-semibold text-ink">Admin</h1>
				<p className="text-sm text-muted">AI + human content moderation and reports across all communities, with user actions.</p>
			</div>

			<div>
				<h2 className="mb-3 text-lg font-semibold text-ink">Content review</h2>
				<ContentReviewQueue />
			</div>

			<div>
				<h2 className="mb-3 text-lg font-semibold text-ink">Reports</h2>
				<ReportQueue isAdmin />
			</div>

			<div>
				<h2 className="mb-1 text-lg font-semibold text-ink">Accounts needing review</h2>
				<p className="mb-3 text-sm text-muted">
					Flagged automatically after repeated strikes. Strikes decay after 90 days; you can suspend, ban, or clear.
				</p>
				<AccountReviewQueue />
			</div>

			<div>
				<h2 className="mb-1 text-lg font-semibold text-ink">Sponsored products</h2>
				<p className="mb-3 text-sm text-muted">
					Vetted, clearly-labeled products shown to free members and in the{" "}
					<span className="font-medium text-ink-2">Shop</span>. No tracking — only aggregate click counts.
				</p>
				<SponsoredProductsAdmin />
			</div>

			<section className="rounded-2xl border border-line bg-surface p-5 text-sm text-muted shadow-soft">
				<h2 className="mb-1 font-semibold text-ink">Platform</h2>
				<p>
					Role changes and platform settings are performed via Cloud Functions (`setUserRole`, settings). Every privileged action is written
					to the append-only audit log.
				</p>
			</section>
		</div>
	);
}
