import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCommunities } from "../features/posts/hooks";
import { useAuth } from "../features/auth/AuthProvider";
import { EmptyState, ErrorState, Skeleton } from "../components/states";

/**
 * Circles directory (/circles) — browse and discover every community. A core
 * forum pattern (vs only showing a handful in the sidebar): members can find
 * niche Circles, see how active each is, and jump in. Search filters by name.
 */
export default function CirclesPage() {
	const { user } = useAuth();
	const communities = useCommunities();
	const [q, setQ] = useState("");

	const circles = useMemo(() => {
		const all = (communities.data ?? []).slice().sort((a, b) => b.memberCount - a.memberCount);
		const needle = q.trim().toLowerCase();
		if (!needle) return all;
		return all.filter((c) => `${c.name} ${c.description}`.toLowerCase().includes(needle));
	}, [communities.data, q]);

	return (
		<div className="mx-auto max-w-3xl space-y-6">
			<header className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="font-serif text-2xl font-semibold text-ink">Circles</h1>
					<p className="mt-1 text-sm text-muted">
						Member-made spaces for specific topics. Find your people — or start your own.
					</p>
				</div>
				{user && (
					<Link
						to="/circles/new"
						className="shrink-0 rounded-full bg-coral px-4 py-2 text-sm font-medium text-white shadow-soft transition-transform hover:scale-[1.015]">
						Create a Circle
					</Link>
				)}
			</header>

			<input
				value={q}
				onChange={(e) => setQ(e.target.value)}
				placeholder="Filter Circles…"
				aria-label="Filter Circles"
				className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-[15px] text-ink shadow-soft outline-none transition-colors placeholder:text-muted-2 focus:border-lav"
			/>

			{communities.isPending ? (
				<div className="grid gap-3 sm:grid-cols-2">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-28 w-full rounded-2xl" />
					))}
				</div>
			) : communities.isError ? (
				<ErrorState onRetry={() => communities.refetch()} />
			) : circles.length === 0 ? (
				<EmptyState title="No Circles found" body="Try a different word, or create the first Circle on this topic." />
			) : (
				<div className="grid gap-3 sm:grid-cols-2">
					{circles.map((c) => (
						<Link
							key={c.slug}
							to={`/c/${c.slug}`}
							className="group rounded-2xl border border-line bg-surface p-4 transition-shadow hover:shadow-soft">
							<div className="flex items-center gap-3">
								<span
									aria-hidden="true"
									className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold ${
										c.color === "lav" ? "bg-lav-wash text-lav" : "bg-coral-wash text-coral"
									}`}>
									{c.name.slice(0, 1)}
								</span>
								<div className="min-w-0">
									<p className="truncate font-semibold text-ink group-hover:text-coral">{c.name}</p>
									<p className="text-xs text-muted-2">
										{c.memberCount.toLocaleString()} {c.memberCount === 1 ? "member" : "members"} ·{" "}
										{c.postCount.toLocaleString()} {c.postCount === 1 ? "post" : "posts"}
									</p>
								</div>
							</div>
							{c.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{c.description}</p>}
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
