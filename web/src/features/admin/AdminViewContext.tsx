import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthProvider";

interface AdminViewValue {
	/** True if the signed-in user is an admin/superadmin. */
	isAdmin: boolean;
	/** Whether the admin is currently viewing the app "as admin" (extra details,
	 *  deleted/removed content) vs "as a regular member". No effect for non-admins. */
	adminView: boolean;
	setAdminView: (on: boolean) => void;
}

const AdminViewContext = createContext<AdminViewValue | null>(null);
const STORAGE_KEY = "tcv.adminView";

/**
 * Admin "view as" toggle (founder request). Lets an admin flip between seeing the
 * app as a regular member and as an admin (un-blurred names, deleted/removed
 * content, moderation details). Persisted in localStorage. Purely a client-side
 * presentation choice — every privileged READ is still enforced by Security Rules
 * (mods/admins may read non-active content; regular users cannot).
 */
export function AdminViewProvider({ children }: { children: ReactNode }) {
	const { profile } = useAuth();
	const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";
	const [adminView, setAdminViewState] = useState<boolean>(() => {
		try {
			return localStorage.getItem(STORAGE_KEY) === "true";
		} catch {
			return false;
		}
	});

	// If the user isn't an admin, force the flag off.
	useEffect(() => {
		if (!isAdmin && adminView) setAdminViewState(false);
	}, [isAdmin, adminView]);

	function setAdminView(on: boolean) {
		setAdminViewState(on);
		try {
			localStorage.setItem(STORAGE_KEY, String(on));
		} catch {
			/* ignore storage failures */
		}
	}

	const value = useMemo<AdminViewValue>(
		() => ({ isAdmin: !!isAdmin, adminView: !!isAdmin && adminView, setAdminView }),
		[isAdmin, adminView],
	);

	return <AdminViewContext.Provider value={value}>{children}</AdminViewContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminView(): AdminViewValue {
	const ctx = useContext(AdminViewContext);
	if (!ctx) return { isAdmin: false, adminView: false, setAdminView: () => {} };
	return ctx;
}
