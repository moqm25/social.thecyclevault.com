import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";
import { useSponsoredProducts } from "../features/shop/hooks";
import { SponsoredProductCard } from "./SponsoredProductCard";

/**
 * The single, calm, clearly-labeled placement for the free tier
 * (docs/MONETIZATION.md). Shows a vetted Sponsored Product when inventory exists,
 * otherwise a quiet house promo. Renders NOTHING for Supporters — upgrading
 * removes sponsored placements.
 *
 * Hard rules baked in: no tracking, no third-party ad SDK, no behavioral
 * targeting, always labeled "Sponsored", one unit max, never mid-content.
 */
export function AdSlot() {
	const { profile } = useAuth();
	const { data: products } = useSponsoredProducts();

	// Supporters (and the app bundle) never see sponsored placements.
	if (profile?.supporter) return null;

	// Rotate by day so the same person doesn't always see the same product
	// (no per-user data involved — purely time-based).
	const featured =
		products && products.length > 0 ? products[Math.floor(Date.now() / 86_400_000) % products.length] : null;

	return (
		<aside aria-label="Sponsored" className="space-y-1.5">
			<div className="flex items-center justify-between px-1">
				<Link to="/shop" className="text-[11px] font-medium text-muted hover:text-coral hover:underline">
					Browse the Shop
				</Link>
				<Link to="/supporter" className="text-[11px] font-medium text-lav hover:underline">
					Go ad-free
				</Link>
			</div>

			{featured ? (
				<SponsoredProductCard product={featured} variant="compact" />
			) : (
				<div className="rounded-xl border border-dashed border-line bg-bg-2/60 p-4">
					<span className="text-[10px] font-semibold uppercase tracking-wide text-muted-2">Sponsored</span>
					<p className="mt-1 text-sm text-ink-2">
						The CycleVault Social is free and privacy-first. Become a{" "}
						<Link to="/supporter" className="font-medium text-coral hover:underline">
							Supporter
						</Link>{" "}
						to remove sponsored placements and support a calmer community.
					</p>
				</div>
			)}
		</aside>
	);
}
