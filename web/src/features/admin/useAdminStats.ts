import { useQuery } from "@tanstack/react-query";
import {
	listAwaitingReview,
	listOpenReports,
	listAccountsNeedingReview,
	listRemovedPosts,
	listRemovedComments,
	listAllSponsoredProducts,
	getAnnouncement,
} from "../../lib/firestore";

/**
 * Triage counts for the admin/mod Overview. Fetched SEQUENTIALLY inside one query
 * (not 7 parallel hooks): against the emulator's long-polling transport, firing
 * many concurrent reads at once exhausts the browser's per-host connection limit
 * and stalls. One ordered pass is plenty for "at least N" triage signals and keeps
 * the connection budget free for the live profile + announcement listeners.
 */
export function useAdminStats(enabled = true) {
	const q = useQuery({
		queryKey: ["admin-stats"],
		enabled,
		staleTime: 30_000,
		queryFn: async () => {
			const awaiting = await listAwaitingReview();
			const reports = await listOpenReports();
			const flagged = await listAccountsNeedingReview();
			const removedPosts = await listRemovedPosts();
			const removedComments = await listRemovedComments();
			const products = await listAllSponsoredProducts();
			const announcement = await getAnnouncement();
			return {
				awaiting: awaiting.length,
				reports: reports.length,
				flagged: flagged.length,
				removed: removedPosts.length + removedComments.length,
				activeProducts: products.filter((p) => p.active).length,
				totalProducts: products.length,
				announcementLive: !!announcement?.body,
			};
		},
	});

	return {
		awaiting: q.data?.awaiting ?? 0,
		reports: q.data?.reports ?? 0,
		flagged: q.data?.flagged ?? 0,
		removed: q.data?.removed ?? 0,
		activeProducts: q.data?.activeProducts ?? 0,
		totalProducts: q.data?.totalProducts ?? 0,
		announcementLive: q.data?.announcementLive ?? false,
		isLoading: q.isPending,
	};
}
