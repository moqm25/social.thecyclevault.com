import type { SponsoredProduct } from "../types/models";
import { recordSponsoredClick } from "../lib/api";
import { CATEGORY_LABELS } from "../features/shop/hooks";

/**
 * A vetted, clearly-labeled sponsored product (docs/MONETIZATION.md). Privacy-first:
 * the outbound link is rel="sponsored nofollow noopener noreferrer" and we only bump
 * an AGGREGATE click counter — no per-user tracking, no third-party ad SDK.
 */
export function SponsoredProductCard({
	product,
	variant = "full",
}: {
	product: SponsoredProduct;
	variant?: "full" | "compact";
}) {
	const onClick = () => {
		// Fire-and-forget; never block the user's navigation.
		void recordSponsoredClick({ id: product.id }).catch(() => undefined);
	};

	const compact = variant === "compact";

	return (
		<a
			href={product.url}
			target="_blank"
			rel="sponsored nofollow noopener noreferrer"
			onClick={onClick}
			className="group flex gap-3 rounded-xl border border-line bg-surface p-3 transition-shadow hover:shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-lav">
			{product.imageUrl ? (
				<img
					src={product.imageUrl}
					alt=""
					loading="lazy"
					referrerPolicy="no-referrer"
					className={`${compact ? "h-14 w-14" : "h-20 w-20"} shrink-0 rounded-lg border border-line object-cover`}
				/>
			) : (
				<div
					className={`${compact ? "h-14 w-14" : "h-20 w-20"} grid shrink-0 place-items-center rounded-lg border border-line bg-bg-2 text-lg`}
					aria-hidden="true">
					🛍️
				</div>
			)}

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="rounded-full bg-bg-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-2">
						Sponsored
					</span>
					<span className="text-[11px] text-muted">{CATEGORY_LABELS[product.category]}</span>
				</div>
				<h3 className="mt-1 truncate font-semibold text-ink group-hover:text-coral">{product.name}</h3>
				<p className={`mt-0.5 text-sm text-muted ${compact ? "line-clamp-2" : "line-clamp-3"}`}>{product.blurb}</p>
				{product.sponsor && <p className="mt-1 text-[11px] text-muted-2">by {product.sponsor}</p>}
			</div>
		</a>
	);
}
