import { useQuery } from "@tanstack/react-query";
import { searchContent } from "../../lib/api";

/**
 * Run a community search (+ curated answer). Disabled until there's a query.
 * Cached briefly so re-opening the same search is instant; search is stateless
 * server-side (no query is ever stored), so caching is purely a client nicety.
 */
export function useSearch(query: string) {
	const q = query.trim();
	return useQuery({
		queryKey: ["search", q],
		queryFn: () => searchContent({ query: q }),
		enabled: q.length > 0,
		staleTime: 2 * 60_000,
		retry: 0,
	});
}
