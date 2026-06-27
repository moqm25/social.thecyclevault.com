import { useState } from "react";
import { FirebaseError } from "firebase/app";
import { Button } from "../../components/Button";

function friendly(err: unknown): string {
	if (err instanceof FirebaseError) {
		if (err.code === "functions/failed-precondition") return "Please verify your email, or this post may be locked.";
		if (err.code === "functions/resource-exhausted") return "You’re commenting quickly — take a short breather.";
	}
	return "Couldn’t post your comment. Please try again.";
}

/** Textarea composer for a comment or reply. */
export function CommentComposer({
	placeholder = "Add a comment…",
	submitLabel = "Comment",
	autoFocus = false,
	onSubmit,
	onCancel,
}: {
	placeholder?: string;
	submitLabel?: string;
	autoFocus?: boolean;
	onSubmit: (body: string) => Promise<unknown>;
	onCancel?: () => void;
}) {
	const [body, setBody] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function handle(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = body.trim();
		if (!trimmed) return;
		setSubmitting(true);
		setError(null);
		try {
			await onSubmit(trimmed);
			setBody("");
		} catch (err) {
			setError(friendly(err));
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<form onSubmit={handle} className="space-y-2">
			<textarea
				value={body}
				onChange={(e) => setBody(e.target.value)}
				rows={3}
				maxLength={10_000}
				autoFocus={autoFocus}
				placeholder={placeholder}
				className="w-full resize-y rounded-xl border border-line bg-surface px-3 py-2 text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-lav"
			/>
			{error && <p className="text-sm text-coral">{error}</p>}
			<div className="flex items-center gap-2">
				<Button type="submit" loading={submitting} className="!px-4 !py-1.5 text-sm">
					{submitLabel}
				</Button>
				{onCancel && (
					<button type="button" onClick={onCancel} className="text-sm text-muted hover:text-coral">
						Cancel
					</button>
				)}
			</div>
		</form>
	);
}
