import { useParams, Link } from "react-router-dom";
import { Feed } from "../features/posts/Feed";
import { useCommunity } from "../features/posts/hooks";
import { Skeleton } from "../components/states";

/** A single community: header (name, description, rules) + its feed. */
export default function CommunityPage() {
	const { communitySlug } = useParams<{ communitySlug: string }>();
	const community = useCommunity(communitySlug);

	return (
		<div className="space-y-6">
			<section className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
				{community.isPending ? (
					<div className="space-y-2">
						<Skeleton className="h-6 w-40" />
						<Skeleton className="h-4 w-72" />
					</div>
				) : community.data ? (
					<>
						<h1 className="text-xl font-semibold text-ink">{community.data.name}</h1>
						<p className="mt-1 text-muted">{community.data.description}</p>
						{community.data.rules?.length > 0 && (
							<details className="mt-3 text-sm">
								<summary className="cursor-pointer font-medium text-lav">Community rules</summary>
								<ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
									{community.data.rules.map((r, i) => (
										<li key={i}>{r}</li>
									))}
								</ul>
							</details>
						)}
					</>
				) : (
					<div className="text-center">
						<p className="font-medium text-ink">Community not found</p>
						<Link to="/" className="mt-1 inline-block text-sm font-medium text-coral hover:underline">
							Back home
						</Link>
					</div>
				)}
			</section>

			{community.data && <Feed communityId={community.data.slug} />}
		</div>
	);
}
