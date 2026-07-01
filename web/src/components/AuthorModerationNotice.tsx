import { Link } from "react-router-dom";
import type { ContentModeration, ContentStatus } from "../types/models";

/**
 * Author-facing "what happened" notice for their OWN moderated content.
 *
 * Unlike ModerationDetails (admin-only, shows raw scores/flags), this speaks to
 * the person whose post/comment it is: a calm explanation of the current state,
 * the moderator's reason when there is one, and a path to the guidelines. Shown
 * on the content itself so a moderation notification always lands somewhere that
 * actually explains the situation (docs/MODERATION_PLAN.md — author transparency).
 */
export function AuthorModerationNotice({
	status,
	moderation,
	kind,
}: {
	status: ContentStatus;
	moderation?: ContentModeration;
	kind: "post" | "comment";
}) {
	// Only meaningful while the item isn't a normal, visible one.
	if (status !== "pending" && status !== "removed" && status !== "deleted") return null;

	const reason = moderation?.reviewReason?.trim() || null;

	const tone =
		status === "removed"
			? "border-coral-soft bg-coral-wash"
			: status === "pending"
				? "border-lav-soft bg-lav-wash"
				: "border-line bg-bg-2";

	let heading: string;
	let lead: string;
	if (status === "pending") {
		heading = "Under review";
		lead = `This ${kind} is visible only to you while a moderator takes a quick look. You’ll get a notification once it’s decided.`;
	} else if (status === "removed") {
		heading = `Your ${kind} was removed`;
		lead = `This ${kind} wasn’t approved and isn’t visible to others. You can still see it here.`;
	} else {
		heading = `You deleted this ${kind}`;
		lead = `Only you can see it here. It isn’t visible to others.`;
	}

	return (
		<div className={`mt-3 rounded-xl border px-4 py-3 text-sm text-ink-2 ${tone}`}>
			<p>
				<strong className="text-ink">{heading}.</strong> {lead}
			</p>
			{reason && (
				<p className="mt-1.5">
					<span className="font-medium text-ink">Reason:</span> {reason}
				</p>
			)}
			{status !== "deleted" && (
				<p className="mt-1.5 text-xs text-muted">
					Questions about this? Review the{" "}
					<Link to="/guidelines" className="font-medium text-coral hover:underline">
						Community Guidelines
					</Link>
					.
				</p>
			)}
		</div>
	);
}
