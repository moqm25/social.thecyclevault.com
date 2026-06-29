import { useReportIssue } from "../features/support/ReportIssueProvider";
import { LifeBuoyIcon } from "./layout/icons";

/**
 * Always-reachable "Report a problem" affordance — a small floating button anchored
 * bottom-right of the app shell so anyone (guest or member, on any page) can flag a
 * bug without hunting for it. Collapses to a circle, expands its label on hover/
 * focus. Opens the shared report dialog. It's not a user-flag — it's for issues.
 */
export function FloatingReportButton() {
	const { openReportIssue } = useReportIssue();
	return (
		<button
			type="button"
			onClick={openReportIssue}
			aria-label="Report a problem"
			title="Report a problem"
			className="group fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-line bg-surface/95 py-2.5 pl-2.5 pr-3 text-ink-2 shadow-lift backdrop-blur transition-colors hover:text-coral sm:bottom-5 sm:right-5">
			<LifeBuoyIcon size={20} className="shrink-0" />
			<span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-200 group-hover:max-w-[10rem] group-hover:opacity-100 group-focus-visible:max-w-[10rem] group-focus-visible:opacity-100">
				Report a problem
			</span>
		</button>
	);
}
