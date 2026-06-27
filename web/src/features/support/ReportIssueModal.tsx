import { useMemo, useRef, useState } from "react";
import { Modal } from "../../components/Modal";
import { LifeBuoyIcon } from "../../components/layout/icons";
import { useAuth } from "../auth/AuthProvider";
import { useAdminView } from "../admin/AdminViewContext";
import { submitIssueReport } from "../../lib/api";
import { collectDebugInfo, debugInfoRows } from "../../lib/debugInfo";
import { captureScreen, imageFileToDataUrl, dataUrlBytes, SCREENSHOT_MAX_BYTES } from "../../lib/screenshot";
import type { IssueCategory } from "../../types/models";

const CATEGORIES: { value: IssueCategory; label: string }[] = [
	{ value: "bug", label: "A bug or error" },
	{ value: "broken", label: "Something won't work" },
	{ value: "visual", label: "Looks wrong / visual glitch" },
	{ value: "account", label: "Sign-in or account issue" },
	{ value: "performance", label: "Slow or unresponsive" },
	{ value: "other", label: "Something else" },
];

const inputClass = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-lav";

function friendlyError(e: unknown): string {
	const code = (e as { code?: string })?.code ?? "";
	if (code.includes("resource-exhausted")) return "You've sent a few reports just now — please wait a little, then try again.";
	if (code.includes("invalid-argument")) return "Please add a short description of what happened.";
	return "Couldn't send your report. Please check your connection and try again.";
}

export function ReportIssueModal({ open, onClose }: { open: boolean; onClose: () => void }) {
	const { user, profile } = useAuth();
	const { adminView } = useAdminView();

	const [category, setCategory] = useState<IssueCategory>("bug");
	const [message, setMessage] = useState("");
	const [email, setEmail] = useState("");
	const [screenshot, setScreenshot] = useState<string | null>(null);
	const [busy, setBusy] = useState<"idle" | "capturing" | "submitting">("idle");
	const [shotError, setShotError] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [showTech, setShowTech] = useState(false);
	const [done, setDone] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);

	// Snapshot the debug context when the dialog opens (i.e. when the problem
	// happened), so it matches what the reporter previews and what we send.
	const debug = useMemo(
		() =>
			collectDebugInfo({
				uid: user?.uid ?? null,
				username: profile?.username ?? null,
				role: profile?.role ?? null,
				emailVerified: user?.emailVerified ?? null,
				adminView,
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[open],
	);

	function reset() {
		setCategory("bug");
		setMessage("");
		setEmail("");
		setScreenshot(null);
		setBusy("idle");
		setShotError(null);
		setError(null);
		setShowTech(false);
		setDone(false);
	}

	function close() {
		onClose();
		// Clear after the close animation so the form doesn't flicker on reopen.
		setTimeout(reset, 200);
	}

	async function onCapture() {
		setShotError(null);
		setBusy("capturing");
		try {
			const shot = await captureScreen();
			if (dataUrlBytes(shot) > SCREENSHOT_MAX_BYTES) {
				setShotError("That screenshot was too large to attach. Try capturing a single window, or upload a smaller image.");
			} else {
				setScreenshot(shot);
			}
		} catch (e) {
			const name = (e as { name?: string })?.name ?? "";
			// User dismissing the picker is not an error worth shouting about.
			if (name !== "NotAllowedError" && name !== "AbortError") {
				setShotError((e as Error)?.message ?? "Couldn't capture the screen.");
			}
		} finally {
			setBusy("idle");
		}
	}

	async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		e.target.value = ""; // allow re-picking the same file
		if (!file) return;
		setShotError(null);
		setBusy("capturing");
		try {
			const shot = await imageFileToDataUrl(file);
			if (dataUrlBytes(shot) > SCREENSHOT_MAX_BYTES) {
				setShotError("That image was too large to attach even after compressing. Try a smaller one.");
			} else {
				setScreenshot(shot);
			}
		} catch (err) {
			setShotError((err as Error)?.message ?? "Couldn't read that image.");
		} finally {
			setBusy("idle");
		}
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!message.trim()) {
			setError("Please add a short description of what happened.");
			return;
		}
		setError(null);
		setBusy("submitting");
		try {
			await submitIssueReport({
				message: message.trim(),
				category,
				email: !user && email.trim() ? email.trim() : undefined,
				context: JSON.stringify(debug).slice(0, 8000),
				screenshot: screenshot ?? undefined,
			});
			setDone(true);
		} catch (err) {
			setError(friendlyError(err));
		} finally {
			setBusy("idle");
		}
	}

	const submitting = busy === "submitting";

	return (
		<Modal
			open={open}
			onClose={close}
			icon={<span className="grid h-9 w-9 place-items-center rounded-full bg-lav-wash text-lav"><LifeBuoyIcon size={18} /></span>}
			title={done ? "Thank you" : "Report a problem"}
			description={
				done
					? undefined
					: "Tell us what went wrong and we'll look into it. This goes to our team — not the community."
			}>
			{done ? (
				<div className="space-y-4">
					<p className="text-sm text-ink-2">
						Your report is on its way to the team. If you left a way to reach you, we may follow up. Thank you for helping us keep
						The CycleVault Social working well. 🌿
					</p>
					<button
						type="button"
						onClick={close}
						className="rounded-full bg-coral px-5 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.02]">
						Done
					</button>
				</div>
			) : (
				<form onSubmit={onSubmit} className="space-y-4" noValidate>
					<p className="rounded-xl border border-lav-wash bg-lav-wash/50 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-2">
						This is for <strong>bugs and issues</strong> — something not working as it should. To report a person or a post, use the
						report option on their content instead.
					</p>

					<div>
						<label htmlFor="issue-category" className="mb-1.5 block text-sm font-medium text-ink-2">
							What kind of problem?
						</label>
						<select id="issue-category" value={category} onChange={(e) => setCategory(e.target.value as IssueCategory)} className={inputClass}>
							{CATEGORIES.map((c) => (
								<option key={c.value} value={c.value}>
									{c.label}
								</option>
							))}
						</select>
					</div>

					<div>
						<label htmlFor="issue-message" className="mb-1.5 block text-sm font-medium text-ink-2">
							What happened?
						</label>
						<textarea
							id="issue-message"
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							rows={4}
							maxLength={5000}
							placeholder="Tell us what you were doing and what went wrong. The more detail, the faster we can fix it."
							className={`${inputClass} resize-y placeholder:text-muted-2`}
							autoFocus
						/>
					</div>

					{!user && (
						<div>
							<label htmlFor="issue-email" className="mb-1.5 block text-sm font-medium text-ink-2">
								Email <span className="font-normal text-muted">(optional, so we can follow up)</span>
							</label>
							<input
								id="issue-email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="you@example.com"
								className={`${inputClass} placeholder:text-muted-2`}
							/>
						</div>
					)}

					{/* Screenshot */}
					<div>
						<p className="mb-1.5 text-sm font-medium text-ink-2">
							Screenshot <span className="font-normal text-muted">(optional)</span>
						</p>
						{screenshot ? (
							<div className="flex items-start gap-3 rounded-xl border border-line bg-bg-2/50 p-2.5">
								<img src={screenshot} alt="Attached screenshot preview" className="h-20 w-28 rounded-lg border border-line object-cover" />
								<div className="flex-1 text-xs text-muted">
									<p className="font-medium text-ink-2">Screenshot attached</p>
									<p>~{Math.round(dataUrlBytes(screenshot) / 1024)} KB</p>
									<button type="button" onClick={() => setScreenshot(null)} className="mt-1.5 font-medium text-coral hover:underline">
										Remove
									</button>
								</div>
							</div>
						) : (
							<div className="flex flex-wrap gap-2">
								<button
									type="button"
									onClick={onCapture}
									disabled={busy === "capturing"}
									className="rounded-full border border-line px-3.5 py-2 text-sm font-medium text-ink-2 transition-colors hover:text-coral disabled:opacity-60">
									{busy === "capturing" ? "Working…" : "📸 Capture screen"}
								</button>
								<button
									type="button"
									onClick={() => fileRef.current?.click()}
									disabled={busy === "capturing"}
									className="rounded-full border border-line px-3.5 py-2 text-sm font-medium text-ink-2 transition-colors hover:text-coral disabled:opacity-60">
									Upload image
								</button>
								<input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
							</div>
						)}
						<p className="mt-1.5 text-[12px] leading-snug text-muted">
							You choose what to share, and you can preview and remove it before sending.
						</p>
						{shotError && <p className="mt-1.5 text-[13px] text-coral">{shotError}</p>}
					</div>

					{/* Transparency: exactly what technical details we include */}
					<div className="rounded-xl border border-line">
						<button
							type="button"
							onClick={() => setShowTech((v) => !v)}
							aria-expanded={showTech}
							className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm font-medium text-ink-2">
							<span>Technical details we'll include</span>
							<span aria-hidden="true" className="text-muted">{showTech ? "▲" : "▼"}</span>
						</button>
						{showTech && (
							<dl className="max-h-44 space-y-1 overflow-y-auto border-t border-line px-3.5 py-3 text-[13px]">
								{debugInfoRows(debug).map((r) => (
									<div key={r.label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2">
										<dt className="text-muted">{r.label}</dt>
										<dd className="min-w-0 break-words text-ink-2">{r.value}</dd>
									</div>
								))}
							</dl>
						)}
					</div>

					{error && (
						<p role="alert" className="rounded-xl border border-coral-soft bg-coral-wash px-3.5 py-2.5 text-sm text-ink-2">
							{error}
						</p>
					)}

					<div className="flex items-center justify-end gap-2 pt-1">
						<button type="button" onClick={close} className="rounded-full px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-ink-2">
							Cancel
						</button>
						<button
							type="submit"
							disabled={submitting}
							className="rounded-full bg-coral px-5 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-60">
							{submitting ? "Sending…" : "Send report"}
						</button>
					</div>
				</form>
			)}
		</Modal>
	);
}
