import { useMemo, useState } from "react";
import { Modal } from "../../components/Modal";
import { useAuth } from "../auth/AuthProvider";
import { useAdminView } from "./AdminViewContext";
import { collectDebugInfo, debugInfoRows, debugInfoToText } from "../../lib/debugInfo";

/**
 * Admin-only "Debug" details (opened from the Admin-view ribbon). Surfaces the
 * live client/session state that's useful when triaging a problem — build,
 * environment, who you're signed in as, route, viewport, etc. Read-only; nothing
 * here is privileged (server rules still gate data). A copy button puts the whole
 * snapshot on the clipboard for pasting into a bug thread.
 */
export function AdminDebugPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
	const { user, profile } = useAuth();
	const { adminView } = useAdminView();
	const [copied, setCopied] = useState(false);

	// Recompute each time it opens so values (route, viewport) are current.
	const info = useMemo(
		() =>
			collectDebugInfo({
				uid: user?.uid ?? null,
				username: profile?.username ?? null,
				role: profile?.role ?? null,
				emailVerified: user?.emailVerified ?? null,
				adminView,
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[open, user, profile, adminView],
	);

	async function copyAll() {
		try {
			await navigator.clipboard.writeText(debugInfoToText(info));
			setCopied(true);
			setTimeout(() => setCopied(false), 1600);
		} catch {
			/* clipboard may be unavailable; ignore */
		}
	}

	return (
		<Modal
			open={open}
			onClose={onClose}
			icon={<span aria-hidden="true" className="text-lg">🛡️</span>}
			title="Admin debug"
			description="Live client state for troubleshooting. Nothing here is shared automatically."
			footer={
				<div className="flex items-center justify-between gap-3">
					<span className="text-xs text-muted">{copied ? "Copied to clipboard." : "Handy when filing or chasing a bug."}</span>
					<button
						type="button"
						onClick={copyAll}
						className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-bg transition-transform hover:scale-[1.02]">
						{copied ? "Copied ✓" : "Copy debug info"}
					</button>
				</div>
			}>
			<dl className="divide-y divide-line/70 text-sm">
				{debugInfoRows(info).map((row) => (
					<div key={row.label} className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 py-2">
						<dt className="text-muted">{row.label}</dt>
						<dd className="min-w-0 break-words font-medium text-ink-2">{row.value}</dd>
					</div>
				))}
			</dl>
		</Modal>
	);
}
