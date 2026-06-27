import { useState } from "react";
import { useAdminView } from "../features/admin/AdminViewContext";
import { AdminDebugPanel } from "../features/admin/AdminDebugPanel";
import { TerminalIcon } from "./layout/icons";

/**
 * Unmistakable "you are in Admin view" ribbon. Only rendered for admins who have
 * flipped the view toggle on, it makes the elevated mode obvious (so removed/held
 * content and moderation details on screen are never mistaken for what members
 * see) and offers a quick exit plus the Debug details panel. The whole app's data
 * access is still governed by Security Rules — this is purely a visible reminder.
 */
export function AdminModeRibbon() {
	const { isAdmin, adminView, setAdminView } = useAdminView();
	const [debugOpen, setDebugOpen] = useState(false);
	if (!isAdmin || !adminView) return null;

	return (
		<>
			<div className="relative z-40 border-b border-coral/30 bg-gradient-to-r from-coral-wash via-coral-wash to-lav-wash">
				<div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
					<span className="inline-flex items-center gap-1.5 rounded-full bg-coral px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-soft">
						<span aria-hidden="true">🛡️</span> Admin view
					</span>
					<p className="min-w-0 flex-1 text-[13px] leading-snug text-ink-2">
						<span className="hidden sm:inline">You're viewing as an admin — </span>removed &amp; held content and moderation details are visible.
					</p>
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={() => setDebugOpen(true)}
							className="inline-flex items-center gap-1.5 rounded-full border border-coral/40 bg-surface/80 px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:text-coral">
							<TerminalIcon size={15} />
							Debug
						</button>
						<button
							type="button"
							onClick={() => setAdminView(false)}
							className="rounded-full px-3 py-1.5 text-xs font-medium text-coral underline-offset-2 hover:underline">
							Exit to member view
						</button>
					</div>
				</div>
			</div>
			<AdminDebugPanel open={debugOpen} onClose={() => setDebugOpen(false)} />
		</>
	);
}
