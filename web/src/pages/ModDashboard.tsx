import { ReportQueue } from "../features/moderation/ReportQueue";
import { ContentReviewQueue } from "../features/moderation/ContentReviewQueue";

/** Moderator dashboard: AI/human content review + report queue. */
export default function ModDashboard() {
	return (
		<div className="mx-auto max-w-2xl space-y-8">
			<div>
				<h1 className="text-xl font-semibold text-ink">Moderation</h1>
				<p className="text-sm text-muted">Review held content and open reports across your communities.</p>
			</div>
			<div>
				<h2 className="mb-3 text-lg font-semibold text-ink">Content review</h2>
				<ContentReviewQueue />
			</div>
			<div>
				<h2 className="mb-3 text-lg font-semibold text-ink">Reports</h2>
				<ReportQueue />
			</div>
		</div>
	);
}
