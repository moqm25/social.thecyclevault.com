import { useQuery } from "@tanstack/react-query";
import { listSponsoredProducts, listAllSponsoredProducts, getAnnouncement } from "../../lib/firestore";
import type { ProductCategory } from "../../types/models";

/** Human labels for product categories (kept in one place for the Shop + admin). */
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
	"period-care": "Period care",
	femtech: "Femtech",
	books: "Books",
	wellness: "Wellness",
	supplements: "Supplements",
	tools: "Tools",
	other: "Other",
};

export const PRODUCT_CATEGORIES = Object.keys(CATEGORY_LABELS) as ProductCategory[];

/** Active sponsored products for the public Shop / in-feed placement. */
export function useSponsoredProducts(category?: ProductCategory) {
	return useQuery({
		queryKey: ["sponsoredProducts", category ?? "all"],
		queryFn: () => listSponsoredProducts(category),
		staleTime: 5 * 60_000,
	});
}

/** Admin view of ALL products (incl. paused). */
export function useAllSponsoredProducts(enabled: boolean) {
	return useQuery({
		queryKey: ["sponsoredProducts", "admin-all"],
		queryFn: listAllSponsoredProducts,
		enabled,
	});
}

/** The current page-wide announcement banner (polled lightly). */
export function useAnnouncement() {
	return useQuery({
		queryKey: ["announcement"],
		queryFn: getAnnouncement,
		staleTime: 60_000,
		refetchInterval: 5 * 60_000,
	});
}
