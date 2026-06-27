import { useEffect, useRef, useState } from "react";
import { useAuth } from "../features/auth/AuthProvider";
import { useReportContent } from "../features/posts/hooks";
import type { ReportReason } from "../types/models";

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
	{ value: "spam", label: "Spam or advertising" },
	{ value: "harassment", label: "Harassment or bullying" },
	{ value: "hate", label: "Hate or discrimination" },
	{ value: "medical_misinfo", label: "Harmful medical misinformation" },
	{ value: "self_harm", label: "Self-harm or crisis" },
	{ value: "off_topic", label: "Off-topic" },
	{ value: "other", label: "Something else" },
];

/**
 * Per-content overflow menu (⋯): authors can delete their own post/comment;
 * everyone else (signed in) can report it for moderator review. Calm, accessible,
 * closes on outside-click / Escape. Privileged actions still run server-side.
 */
export function ContentMenu({
	targetType,
	targetId,
	authorId,
	onDelete,
}: {
	targetType: "post" | "comment";
	targetId: string;
	authorId: string;
	onDelete: () => Promise<unknown>;
}) {
	const { user } = useAuth();
	const report = useReportContent();
	const [open, setOpen] = useState(false);
	const [mode, setMode] = useState<"menu" | "confirmDelete" | "report" | "reported">("menu");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const ref = useRef<HTMLDivElement>(null);

	const isAuthor = !!user && user.uid === authorId;
	const canReport = !!user && !isAuthor;

	useEffect(() => {
		if (!open) return;
		function onDocClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) close();
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") close();
		}
		document.addEventListener("mousedown", onDocClick);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDocClick);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	function close() {
		setOpen(false);
		setMode("menu");
		setError(null);
		setBusy(false);
	}

	// Nothing actionable for signed-out users on others' content.
	if (!user) return null;

	async function doDelete() {
		setBusy(true);
		setError(null);
		try {
			await onDelete();
			close();
		} catch {
			setError("Couldn’t delete that. Please try again.");
			setBusy(false);
		}
	}

	async function doReport(reason: ReportReason) {
		setBusy(true);
		setError(null);
		try {
			await report.mutateAsync({ targetType, targetId, reason });
			setMode("reported");
		} catch {
			setError("Couldn’t send the report. Please try again.");
		} finally {
			setBusy(false);
		}
	}

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				aria-label="More options"
				aria-haspopup="menu"
				aria-expanded={open}
				onClick={() => (open ? close() : setOpen(true))}
				className="grid h-7 w-7 place-items-center rounded-full text-muted transition-colors hover:bg-bg-2 hover:text-coral">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<circle cx="5" cy="12" r="1.6" />
					<circle cx="12" cy="12" r="1.6" />
					<circle cx="19" cy="12" r="1.6" />
				</svg>
			</button>

			{open && (
				<div
					role="menu"
					className="absolute right-0 z-30 mt-1 w-56 rounded-xl border border-line bg-surface p-1.5 text-sm shadow-soft">
					{mode === "menu" && (
						<>
							{isAuthor && (
								<button
									role="menuitem"
									onClick={() => setMode("confirmDelete")}
									className="block w-full rounded-lg px-3 py-2 text-left text-coral transition-colors hover:bg-coral-wash">
									Delete {targetType}
								</button>
							)}
							{canReport && (
								<button
									role="menuitem"
									onClick={() => setMode("report")}
									className="block w-full rounded-lg px-3 py-2 text-left text-ink-2 transition-colors hover:bg-bg-2">
									Report {targetType}
								</button>
							)}
						</>
					)}

					{mode === "confirmDelete" && (
						<div className="px-2 py-1.5">
							<p className="px-1 text-ink">Delete this {targetType}? This can’t be undone.</p>
							{error && <p className="mt-1 px-1 text-coral">{error}</p>}
							<div className="mt-2 flex items-center justify-end gap-2">
								<button onClick={() => setMode("menu")} className="rounded-lg px-2 py-1 text-muted hover:text-ink">
									Cancel
								</button>
								<button
									onClick={doDelete}
									disabled={busy}
									className="rounded-lg bg-coral px-3 py-1 font-medium text-white disabled:opacity-60">
									{busy ? "Deleting…" : "Delete"}
								</button>
							</div>
						</div>
					)}

					{mode === "report" && (
						<div className="px-1 py-1">
							<p className="px-2 pb-1 text-xs font-medium text-muted">Why are you reporting this?</p>
							{REPORT_REASONS.map((r) => (
								<button
									key={r.value}
									role="menuitem"
									disabled={busy}
									onClick={() => doReport(r.value)}
									className="block w-full rounded-lg px-3 py-1.5 text-left text-ink-2 transition-colors hover:bg-bg-2 disabled:opacity-60">
									{r.label}
								</button>
							))}
							{error && <p className="mt-1 px-3 text-coral">{error}</p>}
						</div>
					)}

					{mode === "reported" && (
						<div className="px-3 py-3 text-center">
							<p className="font-medium text-ink">Thank you</p>
							<p className="mt-0.5 text-xs text-muted">A moderator will take a look. You’re helping keep this space calm.</p>
							<button onClick={close} className="mt-2 text-sm font-medium text-coral hover:underline">
								Close
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
