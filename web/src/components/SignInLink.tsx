import { Link, useLocation, type LinkProps } from "react-router-dom";

/**
 * The current path to return to after auth. Excludes auth routes themselves so we
 * never bounce a user back to /login after they sign in.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useReturnTo(): string {
	const location = useLocation();
	const here = location.pathname + location.search;
	return here.startsWith("/login") ? "/feed" : here;
}

/**
 * A "Sign in" link that remembers where the guest was, so login returns them to
 * the exact page (e.g. the post they were reading) instead of the generic feed.
 * `LoginPage` reads this `from` state. Use this everywhere we invite a guest to
 * sign in from within the app.
 */
export function SignInLink({ children, ...props }: Omit<LinkProps, "to" | "state">) {
	const from = useReturnTo();
	return (
		<Link to="/login" state={{ from }} {...props}>
			{children}
		</Link>
	);
}
