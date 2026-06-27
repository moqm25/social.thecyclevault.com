import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';

/** Compact auth control in the top bar: sign-in link or username + sign-out. */
export function UserMenu() {
  const { user, profile, signOutUser } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <Link
        to="/login"
        className="rounded-full bg-coral px-4 py-1.5 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
      >
        Sign in
      </Link>
    );
  }

  const username = profile?.username ?? 'You';

  return (
    <div className="flex items-center gap-2">
      <Link
        to={profile ? `/u/${profile.username}` : '/settings'}
        className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 text-sm transition-colors hover:text-coral"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-lav-wash text-xs font-semibold text-lav">
          {username.slice(0, 1).toUpperCase()}
        </span>
        <span className="max-w-[8rem] truncate">{username}</span>
      </Link>
      <button
        type="button"
        onClick={async () => {
          await signOutUser();
          navigate('/');
        }}
        className="rounded-full px-2 py-1.5 text-sm text-muted transition-colors hover:text-coral"
        aria-label="Sign out"
      >
        Sign out
      </button>
    </div>
  );
}
