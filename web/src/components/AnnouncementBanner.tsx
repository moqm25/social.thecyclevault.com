import { useEffect, useState } from "react";
import { useAnnouncement } from "../features/shop/hooks";

const DISMISS_KEY = "tcv.dismissedAnnouncement";

/**
 * Page-wide announcement banner (founder request). An admin sets it via
 * broadcastAnnouncement → settings/global.announcement; every client reads it and
 * shows a calm, dismissible banner. Scalable: one shared doc, no per-user fan-out.
 * Dismissal is per-announcement (keyed by its id) and remembered locally.
 */
export function AnnouncementBanner() {
	const { data } = useAnnouncement();
	const [dismissedId, setDismissedId] = useState<string | null>(() => {
		try {
			return localStorage.getItem(DISMISS_KEY);
		} catch {
			return null;
		}
	});

	useEffect(() => {
		// Nothing to do; render reacts to data + dismissedId.
	}, [data]);

	if (!data || !data.body?.trim()) return null;
	if (dismissedId === data.id) return null;

	const warning = data.level === "warning";

	function dismiss() {
		setDismissedId(data!.id);
		try {
			localStorage.setItem(DISMISS_KEY, data!.id);
		} catch {
			/* ignore */
		}
	}

	return (
		<div
			role="status"
			className={`border-b ${
				warning ? "border-coral-soft bg-coral-wash text-ink" : "border-lav-soft bg-lav-wash text-ink"
			}`}>
			<div className="mx-auto flex max-w-3xl items-start gap-3 px-4 py-2.5 text-sm">
				<span aria-hidden="true" className="mt-0.5">
					{warning ? "⚠️" : "📣"}
				</span>
				<div className="min-w-0 flex-1">
					{data.title && <p className="font-semibold">{data.title}</p>}
					<p className="text-ink-2">{data.body}</p>
				</div>
				<button
					onClick={dismiss}
					aria-label="Dismiss announcement"
					className="shrink-0 rounded-full px-2 py-0.5 text-muted transition-colors hover:text-coral">
					✕
				</button>
			</div>
		</div>
	);
}
