import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";

/** Compact auth control in the top bar: sign-in link or username + sign-out. */
export function UserMenu() {
	const { user, profile, signOutUser } = useAuth();
	const navigate = useNavigate();

	if (!user) {
		return (
			<Link to="/login" className="rounded-full bg-coral px-4 py-1.5 text-sm font-medium text-white transition-transform hover:scale-[1.02]">
				Sign in
			</Link>
		);
	}

	const username = profile?.username ?? "You";

	return (
		<div className="flex items-center gap-1.5">
			<Link
				to="/notifications"
				aria-label="Notifications"
				className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink-2 transition-colors hover:text-coral">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path
						d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"
						stroke="currentColor"
						strokeWidth="1.6"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</Link>
			<Link
				to={profile ? `/u/${profile.username}` : "/settings"}
				className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 text-sm transition-colors hover:text-coral">
				<span className="grid h-7 w-7 place-items-center rounded-full bg-lav-wash text-xs font-semibold text-lav">
					{username.slice(0, 1).toUpperCase()}
				</span>
				<span className="max-w-[7rem] truncate">{username}</span>
			</Link>
			<button
				type="button"
				onClick={async () => {
					await signOutUser();
					navigate("/");
				}}
				className="rounded-full px-2 py-1.5 text-sm text-muted transition-colors hover:text-coral"
				aria-label="Sign out">
				Sign out
			</button>
		</div>
	);
}
