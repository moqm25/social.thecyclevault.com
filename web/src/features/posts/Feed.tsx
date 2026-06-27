import { Link } from "react-router-dom";
import { useState } from "react";
import type { FeedSort } from "../../lib/firestore";
import { useFeed } from "./hooks";
import { PostCard } from "../../components/PostCard";
import { FeedSkeleton, EmptyState, ErrorState } from "../../components/states";
import { Button } from "../../components/Button";
import { AdSlot } from "../../components/AdSlot";
import { useAuth } from "../auth/AuthProvider";

const SORTS: { key: FeedSort; label: string }[] = [
	{ key: "hot", label: "Hot" },
	{ key: "new", label: "New" },
	{ key: "top", label: "Top" },
];

/** Feed of posts — global (no communityId) or scoped to one community. */
export function Feed({ communityId }: { communityId?: string }) {
	const [sort, setSort] = useState<FeedSort>("hot");
	const { user } = useAuth();
	const q = useFeed({ communityId, sort });

	const posts = q.data?.pages.flatMap((p) => p.items) ?? [];

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="inline-flex rounded-full border border-line bg-surface p-0.5">
					{SORTS.map((s) => (
						<button
							key={s.key}
							onClick={() => setSort(s.key)}
							aria-pressed={sort === s.key}
							className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
								sort === s.key ? "bg-coral text-white" : "text-muted hover:text-coral"
							}`}>
							{s.label}
						</button>
					))}
				</div>
				{user && (
					<Link
						to={communityId ? `/post/new?c=${communityId}` : "/post/new"}
						className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-coral">
						New post
					</Link>
				)}
			</div>

			{q.isPending ? (
				<FeedSkeleton />
			) : q.isError ? (
				<ErrorState onRetry={() => q.refetch()} />
			) : posts.length === 0 ? (
				<EmptyState
					title="Nothing here yet"
					body="Be the first to start a calm conversation."
					action={
						<Link to={communityId ? `/post/new?c=${communityId}` : "/post/new"} className="font-medium text-coral hover:underline">
							Write a post
						</Link>
					}
				/>
			) : (
				<div className="space-y-3">
					{posts.map((p, i) => (
						<div key={p.id} className="space-y-3">
							<PostCard post={p} />
							{/* One calm, ad-free-upgradeable placement after the 3rd post. */}
							{i === 2 && <AdSlot />}
						</div>
					))}
					{q.hasNextPage && (
						<div className="pt-2 text-center">
							<Button variant="ghost" loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
								Load more
							</Button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
