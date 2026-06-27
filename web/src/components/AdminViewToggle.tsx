import { useAdminView } from "../features/admin/AdminViewContext";

/**
 * Member / Admin view switch.
 *
 * A clear two-state SEGMENTED control (not the old ambiguous single button): both
 * choices are always visible and the active one is filled, so it reads as a real
 * toggle and it's obvious which view you're in. "Admin view" reveals removed/held
 * content and moderation details inline — server Security Rules still gate every
 * privileged read, so this only changes what an authorized admin chooses to see.
 * Hidden entirely for non-admins.
 *
 * `variant="bar"` is the compact top-bar pill (hidden on narrow screens, where the
 * mobile drawer shows the full-width `variant="panel"` instead).
 */
export function AdminViewToggle({ variant = "bar" }: { variant?: "bar" | "panel" }) {
	const { isAdmin, adminView, setAdminView } = useAdminView();
	if (!isAdmin) return null;

	if (variant === "panel") {
		return (
			<div className="rounded-2xl border border-line bg-bg-2/60 p-3">
				<p className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-2">View mode</p>
				<div role="group" aria-label="View mode" className="grid grid-cols-2 gap-1 rounded-full border border-line bg-surface p-1">
					<Segment active={!adminView} onClick={() => setAdminView(false)} icon="👤" label="Member" tone="member" block />
					<Segment active={adminView} onClick={() => setAdminView(true)} icon="🛡️" label="Admin" tone="admin" block />
				</div>
				<p className="mt-2 px-0.5 text-[12px] leading-snug text-muted">
					{adminView ? "Seeing moderation details and removed content." : "Seeing the app exactly as a member does."}
				</p>
			</div>
		);
	}

	return (
		<div
			role="group"
			aria-label="View mode"
			title={adminView ? "Admin view — moderation details visible" : "Member view — seeing the app as a member"}
			className={`hidden items-center gap-0.5 rounded-full border p-0.5 text-xs font-medium sm:inline-flex ${
				adminView ? "border-coral/50 bg-coral-wash" : "border-line bg-bg-2"
			}`}>
			<Segment active={!adminView} onClick={() => setAdminView(false)} icon="👤" label="Member" tone="member" />
			<Segment active={adminView} onClick={() => setAdminView(true)} icon="🛡️" label="Admin" tone="admin" />
		</div>
	);
}

function Segment({
	active,
	onClick,
	icon,
	label,
	tone,
	block = false,
}: {
	active: boolean;
	onClick: () => void;
	icon: string;
	label: string;
	tone: "member" | "admin";
	block?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			className={`inline-flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1 transition-colors ${block ? "w-full py-1.5" : ""} ${
				active
					? tone === "admin"
						? "bg-coral text-white shadow-soft"
						: "bg-surface text-ink shadow-soft"
					: "text-muted hover:text-ink-2"
			}`}>
			<span aria-hidden="true">{icon}</span>
			{label}
		</button>
	);
}
