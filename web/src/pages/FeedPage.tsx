import { Link } from "react-router-dom";
import { Feed } from "../features/posts/Feed";
import { useCommunities } from "../features/posts/hooks";

/**
 * The signed-in / browsing home: the global feed. The guest hero now lives on the
 * landing page (`/`), and Circle navigation lives in the sidebar — so this page
 * stays focused on the conversation. A horizontal Circle strip appears only on
 * small screens, where the sidebar is tucked into the drawer.
 */
export default function FeedPage() {
	const communities = useCommunities();
	const circles = communities.data ?? [];

	return (
		<div className="space-y-5">
			{circles.length > 0 && (
				<nav aria-label="Circles" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
					{circles.map((c) => (
						<Link
							key={c.slug}
							to={`/c/${c.slug}`}
							className="whitespace-nowrap rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-coral">
							{c.name}
						</Link>
					))}
				</nav>
			)}

			<div>
				<h1 className="font-serif text-[22px] font-semibold leading-tight text-ink">Home</h1>
				<p className="mt-0.5 text-sm text-muted">A calm view of the latest across the community.</p>
			</div>

			<Feed />
		</div>
	);
}
