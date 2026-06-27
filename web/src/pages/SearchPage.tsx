import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useSearch } from "../features/search/hooks";
import { useCommunities } from "../features/posts/hooks";
import { PostCard } from "../components/PostCard";
import { FeedSkeleton, EmptyState, ErrorState, Skeleton } from "../components/states";
import { SearchIcon, SparkIcon } from "../components/layout/icons";
import type { SearchAnswer } from "../types/models";

/**
 * Phrases that suggest someone may be in crisis. We keep this intentionally small
 * and high-signal (whole-word matched) so we surface support when it matters
 * without crying wolf. Not a diagnosis — just a gentle, always-available off-ramp.
 */
const CRISIS_PATTERN =
	/\b(suicid\w*|kill myself|killing myself|end my life|want to die|self[\s-]?harm|hurt myself|hurting myself|overdose|abuse|abused|assault|rape|raped)\b/i;

function isCrisisQuery(q: string): boolean {
	return CRISIS_PATTERN.test(q);
}

/**
 * Search results surface (/search?q=…). Shows a curated answer (AI when configured,
 * otherwise a grounded community snapshot), matching Circles, and post results.
 * Privacy: search is stateless server-side; nothing is stored or tied to you.
 */
export default function SearchPage() {
	const [params, setParams] = useSearchParams();
	const q = params.get("q") ?? "";
	const [draft, setDraft] = useState(q);
	const search = useSearch(q);
	const communities = useCommunities();

	useEffect(() => setDraft(q), [q]);

	function submit(e: React.FormEvent) {
		e.preventDefault();
		const next = draft.trim();
		setParams(next ? { q: next } : {}, { replace: false });
	}

	const data = search.data;

	return (
		<div className="mx-auto max-w-2xl space-y-6">
			{/* On-page search field (also the primary input on mobile) */}
			<form onSubmit={submit} role="search" className="relative">
				<span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-2">
					<SearchIcon size={19} />
				</span>
				<input
					autoFocus={!q}
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					placeholder="Search posts, circles, and topics…"
					aria-label="Search the community"
					className="w-full rounded-full border border-line bg-surface py-3 pl-11 pr-4 text-[15px] text-ink shadow-soft outline-none transition-colors placeholder:text-muted-2 focus:border-lav"
				/>
			</form>

			{/* No query yet → browse topics */}
			{!q && (
				<section>
					<h1 className="font-serif text-xl font-semibold text-ink">Search the community</h1>
					<p className="mt-1 text-sm text-muted">
						Look up symptoms, questions, and experiences — and get a calm, curated summary grounded in what members have shared.
					</p>
					<h2 className="mt-6 text-[13px] font-semibold uppercase tracking-wider text-muted-2">Popular topics</h2>
					{communities.data && communities.data.length > 0 ? (
						<div className="mt-2 flex flex-wrap gap-2">
							{communities.data.map((c) => (
								<Link
									key={c.slug}
									to={`/search?q=${encodeURIComponent(c.name)}`}
									className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-coral">
									{c.name}
								</Link>
							))}
						</div>
					) : (
						<div className="mt-2 flex flex-wrap gap-2">
							{Array.from({ length: 6 }).map((_, i) => (
								<Skeleton key={i} className="h-8 w-28 rounded-full" />
							))}
						</div>
					)}
				</section>
			)}

			{/* Query → results */}
			{q && (
				<section className="space-y-5">
					{isCrisisQuery(q) && <CrisisBanner />}
					<div>
						<h1 className="font-serif text-xl font-semibold text-ink">
							Results for <span className="text-coral">“{q}”</span>
						</h1>
					</div>

					{search.isPending ? (
						<>
							<Skeleton className="h-28 w-full rounded-2xl" />
							<FeedSkeleton />
						</>
					) : search.isError ? (
						<ErrorState onRetry={() => search.refetch()} />
					) : !data || (data.posts.length === 0 && data.communities.length === 0) ? (
						<EmptyState
							title="No matches yet"
							body="Try fewer or different words. Some discussions may use other terms."
						/>
					) : (
						<>
							{data.answer && <AnswerCard answer={data.answer} aiAvailable={data.aiAvailable} />}

							{data.communities.length > 0 && (
								<div>
									<h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted-2">Circles</h2>
									<div className="flex flex-wrap gap-2">
										{data.communities.map((c) => (
											<Link
												key={c.slug}
												to={`/c/${c.slug}`}
												className="group flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm transition-colors hover:text-coral">
												<span
													aria-hidden="true"
													className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold ${
														c.color === "lav" ? "bg-lav-wash text-lav" : "bg-coral-wash text-coral"
													}`}>
													{c.name.slice(0, 1)}
												</span>
												<span className="font-medium text-ink-2 group-hover:text-coral">{c.name}</span>
											</Link>
										))}
									</div>
								</div>
							)}

							{data.posts.length > 0 && (
								<div>
									<h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted-2">
										Discussions ({data.posts.length})
									</h2>
									<div className="space-y-3">
										{data.posts.map((p) => (
											<PostCard key={p.id} post={p} />
										))}
									</div>
								</div>
							)}
						</>
					)}
				</section>
			)}
		</div>
	);
}

/** The curated answer — calm, clearly labeled, grounded, with cited sources. */
function AnswerCard({ answer, aiAvailable }: { answer: SearchAnswer; aiAvailable: boolean }) {
	const isAI = answer.source === "ai";
	return (
		<section className="rounded-2xl border border-lav-soft/60 bg-lav-wash/40 p-4 sm:p-5">
			<div className="mb-2 flex items-center gap-2">
				<span className="grid h-7 w-7 place-items-center rounded-full bg-lav text-white">
					<SparkIcon size={16} />
				</span>
				<div className="leading-tight">
					<p className="text-sm font-semibold text-ink">{isAI ? "AI summary" : "Community snapshot"}</p>
					<p className="text-[11px] text-muted-2">
						{isAI ? "Curated from public discussions" : "Summarized from public discussions"}
					</p>
				</div>
			</div>

			<p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">{answer.text}</p>

			{answer.sources.length > 0 && (
				<div className="mt-3">
					<p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-2">Sources</p>
					<div className="flex flex-col gap-1.5">
						{answer.sources.map((s, i) => (
							<Link
								key={s.id}
								to={`/post/${s.id}`}
								className="flex items-start gap-2 text-sm text-ink-2 transition-colors hover:text-coral">
								<span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface text-[11px] font-semibold text-lav">
									{i + 1}
								</span>
								<span className="min-w-0">
									<span className="line-clamp-1">{s.title}</span>
									<span className="text-[11px] text-muted-2">{s.communityId}</span>
								</span>
							</Link>
						))}
					</div>
				</div>
			)}

			{aiAvailable && (
				<p className="mt-3 text-[12px] text-muted">
					<Link to="/login" className="font-medium text-coral hover:underline">
						Sign in
					</Link>{" "}
					for a richer AI-written answer.
				</p>
			)}

			<p className="mt-3 border-t border-lav-soft/40 pt-2 text-[12px] text-muted-2">
				This is a summary of community discussions, not medical advice. For anything personal, please check with a clinician.
			</p>
		</section>
	);
}

/**
 * Calm, non-alarmist crisis-support banner shown above results when a search looks
 * like someone may be struggling. Always offers a real, human off-ramp (988 in the
 * US / 911 for emergencies) without being preachy. Surfacing care here matters more
 * than search results.
 */
function CrisisBanner() {
	return (
		<section
			role="note"
			className="rounded-2xl border border-coral-soft/60 bg-coral-wash/40 p-4 sm:p-5">
			<p className="text-sm font-semibold text-ink">If you’re going through something hard, you’re not alone.</p>
			<p className="mt-1 text-sm text-ink-2">
				If you might be in danger or thinking about harming yourself, please reach out — talking to someone helps.
			</p>
			<ul className="mt-3 space-y-1.5 text-sm text-ink-2">
				<li>
					<span className="font-medium">US:</span> call or text{" "}
					<a href="tel:988" className="font-semibold text-coral hover:underline">
						988
					</a>{" "}
					(Suicide &amp; Crisis Lifeline, 24/7)
				</li>
				<li>
					<span className="font-medium">Emergency:</span> call{" "}
					<a href="tel:911" className="font-semibold text-coral hover:underline">
						911
					</a>{" "}
					or your local emergency number
				</li>
				<li>
					Outside the US:{" "}
					<a
						href="https://findahelpline.com"
						target="_blank"
						rel="noopener noreferrer"
						className="font-semibold text-coral hover:underline">
						findahelpline.com
					</a>
				</li>
			</ul>
			<p className="mt-3 text-[12px] text-muted-2">
				The CycleVault is a peer community, not a crisis or medical service.
			</p>
		</section>
	);
}

