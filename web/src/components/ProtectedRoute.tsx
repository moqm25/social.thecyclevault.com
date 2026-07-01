import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";
import type { UserRole } from "../types/models";

const ROLE_RANK: Record<UserRole, number> = {
	user: 0,
	moderator: 1,
	admin: 2,
	superadmin: 3,
};

/**
 * Guards routes that require authentication and optionally a minimum role.
 * Client-side gating is UX only — the server re-checks every privileged action
 * (docs/SECURITY_RULES.md, API_CONTRACT.md).
 */
export function ProtectedRoute({ children, minRole = "user" }: { children: ReactNode; minRole?: UserRole }) {
	const { user, profile, loading } = useAuth();
	const location = useLocation();

	if (loading) {
		return (
			<div className="grid place-items-center py-20">
				<div className="h-6 w-6 animate-spin rounded-full border-2 border-lav border-t-transparent" />
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace state={{ from: location.pathname }} />;
	}

	if (minRole !== "user") {
		// Role lives on the profile doc, which loads after auth. Wait for it before
		// deciding, otherwise a hard refresh would bounce a real admin/mod home.
		if (profile === null) {
			return (
				<div className="grid place-items-center py-20">
					<div className="h-6 w-6 animate-spin rounded-full border-2 border-lav border-t-transparent" />
				</div>
			);
		}
		// Fail closed: an unknown/corrupt role resolves to rank -1 so a broken
		// profile can never satisfy an admin/mod gate (undefined < n is false in JS).
		const rank = ROLE_RANK[profile.role] ?? -1;
		if (rank < ROLE_RANK[minRole]) {
			return <Navigate to="/" replace />;
		}
	}

	return <>{children}</>;
}
