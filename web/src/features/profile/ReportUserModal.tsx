import { useState } from "react";
import { Modal } from "../../components/Modal";
import { useReportContent } from "../posts/hooks";
import type { ReportReason } from "../../types/models";

// User-appropriate subset of the shared report reasons (off-topic doesn't apply
// to a person). Mirrors the content report flow so moderators see one queue.
const USER_REASONS: { value: ReportReason; label: string }[] = [
	{ value: "harassment", label: "Harassment or bullying" },
	{ value: "hate", label: "Hate or discrimination" },
	{ value: "spam", label: "Spam or advertising" },
	{ value: "medical_misinfo", label: "Harmful medical misinformation" },
	{ value: "self_harm", label: "Self-harm or crisis" },
	{ value: "other", label: "Something else" },
];

/**
 * Report a member for moderator review. Reuses the same reportContent pipeline as
 * post/comment reports (targetType "user"), so reports land in the one moderation
 * queue. Calm, minimal, and only offered to signed-in members viewing someone else.
 */
export function ReportUserModal({
	open,
	onClose,
	uid,
	username,
}: {
	open: boolean;
	onClose: () => void;
	uid: string;
	username: string;
}) {
	const report = useReportContent();
	const [reason, setReason] = useState<ReportReason | null>(null);
	const [details, setDetails] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);
	const busy = report.isPending;

	function close() {
		onClose();
		// Reset after the close animation so it doesn't flicker on reopen.
		setTimeout(() => {
			setReason(null);
			setDetails("");
			setError(null);
			setDone(false);
		}, 200);
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!reason) {
			setError("Please choose a reason.");
			return;
		}
		setError(null);
		try {
			await report.mutateAsync({
				targetType: "user",
				targetId: uid,
				reason,
				details: details.trim() ? details.trim().slice(0, 1000) : undefined,
			});
			setDone(true);
		} catch (err) {
			const code = (err as { code?: string })?.code ?? "";
			if (code.includes("resource-exhausted")) setError("You've sent a few reports just now — please wait a little, then try again.");
			else setError("Couldn't send the report. Please try again.");
		}
	}

	return (
		<Modal
			open={open}
			onClose={close}
			title={done ? "Thank you" : `Report @${username}`}
			description={done ? undefined : "Reports are private and go to our moderators. Choose what best describes the problem."}>
			{done ? (
				<div className="py-2 text-center">
					<p className="text-[15px] text-ink-2">
						A moderator will take a look. Thank you for helping keep this space calm and safe.
					</p>
					<button
						onClick={close}
						className="mt-4 rounded-full bg-coral px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-coral/90">
						Close
					</button>
				</div>
			) : (
				<form onSubmit={onSubmit} className="space-y-4">
					<fieldset className="space-y-1.5">
						<legend className="mb-1 text-sm font-medium text-ink">Reason</legend>
						{USER_REASONS.map((r) => (
							<label
								key={r.value}
								className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-[15px] transition-colors ${
									reason === r.value ? "border-lav bg-lav-wash text-ink" : "border-line text-ink-2 hover:bg-bg-2"
								}`}>
								<input
									type="radio"
									name="report-reason"
									value={r.value}
									checked={reason === r.value}
									onChange={() => setReason(r.value)}
									className="accent-lav"
								/>
								{r.label}
							</label>
						))}
					</fieldset>

					<div>
						<label htmlFor="report-details" className="mb-1 block text-sm font-medium text-ink">
							Anything else? <span className="font-normal text-muted">(optional)</span>
						</label>
						<textarea
							id="report-details"
							value={details}
							onChange={(e) => setDetails(e.target.value)}
							rows={3}
							maxLength={1000}
							placeholder="Add any context that would help a moderator."
							className="w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-lav"
						/>
					</div>

					{error && <p className="text-sm text-coral">{error}</p>}

					<div className="flex items-center justify-end gap-2">
						<button type="button" onClick={close} className="rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-ink">
							Cancel
						</button>
						<button
							type="submit"
							disabled={busy}
							className="rounded-full bg-coral px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-coral/90 disabled:opacity-60">
							{busy ? "Sending…" : "Submit report"}
						</button>
					</div>
				</form>
			)}
		</Modal>
	);
}
