import { Link } from "react-router-dom";
import { Feed } from "../features/posts/Feed";
import { useCommunities } from "../features/posts/hooks";
import { useAuth } from "../features/auth/AuthProvider";

/** Home: brand hero (guests), community strip, and the global feed. */
export default function HomePage() {
	const { user } = useAuth();
	const communities = useCommunities();

	return (
		<div className="space-y-6">
			{!user && (
				<section className="rounded-2xl border border-line bg-surface p-6 shadow-soft sm:p-8">
					<p className="text-sm font-medium uppercase tracking-wide text-lav">Community</p>
					<h1 className="mt-2 text-2xl font-semibold leading-tight text-ink sm:text-3xl">
						A calmer place to talk about <span className="brand-serif text-coral">your cycle</span>.
					</h1>
					<p className="mt-3 max-w-prose text-muted">
						Ask questions, share what you’ve noticed, and learn from others — without accounts following you around or noise designed to
						keep you scrolling.
					</p>
					<p className="mt-2 max-w-prose text-sm text-muted-2">
						You’re browsing as a guest, so names are hidden. Join (free) to see who’s talking and to post, reply, and vote.
					</p>
					<div className="mt-5">
						<Link
							to="/login"
							className="inline-block rounded-full bg-coral px-5 py-2.5 font-medium text-white transition-transform hover:scale-[1.02]">
							Join the community
						</Link>
					</div>
				</section>
			)}

			<div className="flex items-center justify-between gap-2">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-2">Circles</h2>
				{user && (
					<Link to="/circles/new" className="text-sm font-medium text-coral hover:underline">
						+ New Circle
					</Link>
				)}
			</div>

			{communities.data && communities.data.length > 0 && (
				<nav aria-label="Circles" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
					{communities.data.map((c) => (
						<Link
							key={c.slug}
							to={`/c/${c.slug}`}
							className="whitespace-nowrap rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-coral">
							{c.name}
						</Link>
					))}
				</nav>
			)}

			<Feed />
		</div>
	);
}
