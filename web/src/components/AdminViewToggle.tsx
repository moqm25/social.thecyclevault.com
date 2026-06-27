import { useAdminView } from "../features/admin/AdminViewContext";

/**
 * Top-bar control for admins to switch between "Member view" and "Admin view".
 * In Admin view the app reveals deleted/removed content (marked) and moderation
 * details inline. Hidden entirely for non-admins. Server rules still gate every
 * privileged read — this only changes what an authorized admin chooses to see.
 */
export function AdminViewToggle() {
	const { isAdmin, adminView, setAdminView } = useAdminView();
	if (!isAdmin) return null;

	return (
		<button
			type="button"
			onClick={() => setAdminView(!adminView)}
			aria-pressed={adminView}
			title={adminView ? "Currently viewing as admin — click for member view" : "Currently viewing as a member — click for admin view"}
			className={`hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:inline-flex ${
				adminView ? "border-coral bg-coral-wash text-coral" : "border-line text-muted hover:text-coral"
			}`}>
			<span aria-hidden="true">{adminView ? "🛡️" : "👤"}</span>
			{adminView ? "Admin view" : "Member view"}
		</button>
	);
}
