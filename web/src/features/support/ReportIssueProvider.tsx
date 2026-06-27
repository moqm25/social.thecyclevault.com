import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ReportIssueModal } from "./ReportIssueModal";

interface ReportIssueValue {
	/** Open the "Report a problem" dialog from anywhere in the app. */
	openReportIssue: () => void;
}

const ReportIssueContext = createContext<ReportIssueValue | null>(null);

/**
 * Hosts the single app-wide "Report a problem" dialog and exposes a trigger via
 * context, so any surface (sidebar, user menu, an error screen) can open it
 * without each rendering its own modal. Available to everyone, including guests.
 */
export function ReportIssueProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);
	const openReportIssue = useCallback(() => setOpen(true), []);
	const value = useMemo<ReportIssueValue>(() => ({ openReportIssue }), [openReportIssue]);

	return (
		<ReportIssueContext.Provider value={value}>
			{children}
			<ReportIssueModal open={open} onClose={() => setOpen(false)} />
		</ReportIssueContext.Provider>
	);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useReportIssue(): ReportIssueValue {
	const ctx = useContext(ReportIssueContext);
	if (!ctx) return { openReportIssue: () => {} };
	return ctx;
}
