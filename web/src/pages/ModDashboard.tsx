import { ReportQueue } from "../features/moderation/ReportQueue";

/** Moderator dashboard: the report queue, scoped actions. */
export default function ModDashboard() {
	return (
		<div className="mx-auto max-w-2xl space-y-4">
			<div>
				<h1 className="text-xl font-semibold text-ink">Moderation</h1>
				<p className="text-sm text-muted">Open reports across your communities. Priority reasons surface first.</p>
			</div>
			<ReportQueue />
		</div>
	);
}
