import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";

/**
 * A single, calm, clearly-labeled placement for the ad-supported free tier
 * (docs/MONETIZATION.md §A2). Renders NOTHING for Supporters — paying removes ads.
 *
 * Hard rules baked in: no tracking, no third-party ad SDK, no behavioral
 * targeting, always labeled "Sponsored", one unit max, never between content.
 * Until real direct-sold / contextual inventory exists, this shows a quiet
 * house promo for Supporter. When inventory exists, swap the inner block for a
 * vetted contextual unit (still no tracking).
 */
export function AdSlot() {
	const { profile } = useAuth();

	// Supporters (and the app-bundle) never see ads.
	if (profile?.supporter) return null;

	return (
		<aside
			aria-label="Sponsored"
			className="rounded-xl border border-dashed border-line bg-bg-2/60 p-4">
			<div className="mb-1 flex items-center justify-between">
				<span className="text-[10px] font-semibold uppercase tracking-wide text-muted-2">Sponsored</span>
				<Link to="/supporter" className="text-[11px] font-medium text-lav hover:underline">
					Go ad-free
				</Link>
			</div>
			<p className="text-sm text-ink-2">
				The CycleVault Social is free and privacy-first. Become a{" "}
				<Link to="/supporter" className="font-medium text-coral hover:underline">
					Supporter
				</Link>{" "}
				to remove this and support a calmer community.
			</p>
		</aside>
	);
}
