import type { ContentModeration, ContentStatus } from "../types/models";

const STATUS_LABEL: Partial<Record<ContentStatus, string>> = {
	removed: "Removed by moderation",
	deleted: "Deleted by author",
	pending: "Held for review",
	locked: "Locked",
};

/**
 * Admin-only inline panel showing a content item's moderation status + AI/heuristic
 * details (state, severity, flags, scores). Rendered only when an admin is in
 * "Admin view". Keeps moderation context one glance away without leaving the thread.
 */
export function ModerationDetails({ status, moderation }: { status: ContentStatus; moderation?: ContentModeration }) {
	const statusLabel = STATUS_LABEL[status];
	if (!statusLabel && !moderation) return null;

	return (
		<div className="mt-2 rounded-lg border border-dashed border-line bg-bg-2/60 px-3 py-2 text-xs text-muted">
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
				<span className="font-semibold uppercase tracking-wide text-muted-2">Admin</span>
				{statusLabel && <span className="font-medium text-ink-2">{statusLabel}</span>}
				{moderation && (
					<>
						<span>state: {moderation.state}</span>
						<span>severity: {moderation.severity}</span>
						<span>score: {moderation.score.toFixed(2)}</span>
						{typeof moderation.safeConfidence === "number" && <span>safe: {moderation.safeConfidence.toFixed(2)}</span>}
					</>
				)}
			</div>
			{moderation && moderation.flags.length > 0 && <p className="mt-1">flags: {moderation.flags.join(", ")}</p>}
		</div>
	);
}
