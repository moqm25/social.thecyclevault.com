import { useState } from "react";
import { Link } from "react-router-dom";
import { useSponsoredProducts, CATEGORY_LABELS, PRODUCT_CATEGORIES } from "../features/shop/hooks";
import { SponsoredProductCard } from "../components/SponsoredProductCard";
import { EmptyState, ErrorState } from "../components/states";
import type { ProductCategory } from "../types/models";

/**
 * The Shop — a calm, browsable directory of vetted, clearly-labeled products
 * (docs/MONETIZATION.md). Open to everyone (Supporters included). Privacy-first:
 * no tracking, no behavioral targeting; outbound links are rel="sponsored nofollow".
 */
export default function ShopPage() {
	const [category, setCategory] = useState<ProductCategory | "all">("all");
	const q = useSponsoredProducts(category === "all" ? undefined : category);
	const products = q.data ?? [];

	return (
		<div className="mx-auto max-w-3xl space-y-5 py-2">
			<header>
				<h1 className="font-serif text-2xl font-semibold text-ink">Shop</h1>
				<p className="mt-1 text-sm text-muted">
					A small, hand-picked set of products we think this community might like. Every item is clearly labeled{" "}
					<span className="font-medium text-ink-2">Sponsored</span>. We don’t track you, sell your data, or use
					behavioral ads — and{" "}
					<Link to="/supporter" className="font-medium text-coral hover:underline">
						Supporters
					</Link>{" "}
					never see sponsored placements in their feed.
				</p>
			</header>

			<div className="flex flex-wrap gap-1.5">
				<CategoryChip label="All" active={category === "all"} onClick={() => setCategory("all")} />
				{PRODUCT_CATEGORIES.map((c) => (
					<CategoryChip key={c} label={CATEGORY_LABELS[c]} active={category === c} onClick={() => setCategory(c)} />
				))}
			</div>

			{q.isError ? (
				<ErrorState onRetry={() => q.refetch()} />
			) : q.isPending ? (
				<div className="grid gap-3 sm:grid-cols-2">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="h-28 animate-pulse rounded-xl border border-line bg-bg-2/60" />
					))}
				</div>
			) : products.length === 0 ? (
				<EmptyState
					title="Nothing here yet"
					body="We’re still curating this space. Check back soon — we only add things we’d genuinely recommend."
				/>
			) : (
				<div className="grid gap-3 sm:grid-cols-2">
					{products.map((p) => (
						<SponsoredProductCard key={p.id} product={p} />
					))}
				</div>
			)}

			<p className="pt-2 text-center text-[11px] text-muted-2">
				Sponsored placements help keep The CycleVault Social free. They’re never personalized to you.
			</p>
		</div>
	);
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
	return (
		<button
			onClick={onClick}
			aria-pressed={active}
			className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
				active ? "border-coral bg-coral text-white" : "border-line text-muted hover:text-coral"
			}`}>
			{label}
		</button>
	);
}
