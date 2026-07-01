import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useUserProfile, useUserPosts, useUserComments } from "../features/profile/hooks";
import { ReportUserModal } from "../features/profile/ReportUserModal";
import { PostCard } from "../components/PostCard";
import { UserBadges } from "../components/Badge";
import { Skeleton, EmptyState, ErrorState } from "../components/states";
import { relativeTime } from "../lib/time";
import { useAuth } from "../features/auth/AuthProvider";

type Tab = "posts" | "comments";

function statusLabel(status: string): string {
	if (status === "pending") return "Under review";
	if (status === "removed") return "Removed";
	if (status === "deleted") return "Deleted";
	if (status === "locked") return "Locked";
	return status;
}

/** Public pseudonymous profile: identity, badges, karma, posts/comments tabs. */
export default function ProfilePage() {
	const { username } = useParams<{ username: string }>();
	const { profile: me } = useAuth();
	const profile = useUserProfile(username);
	const [tab, setTab] = useState<Tab>("posts");
	const [reportOpen, setReportOpen] = useState(false);

	const uid = profile.data?.uid;
	const ownView = !!me && !!uid && me.uid === uid;
	const posts = useUserPosts(tab === "posts" ? uid : undefined, ownView);
	const comments = useUserComments(tab === "comments" ? uid : undefined, ownView);

	if (profile.isPending) {
		return (
			<div className="space-y-3">
				<Skeleton className="h-24 w-full" />
				<Skeleton className="h-16 w-full" />
			</div>
		);
	}
	if (profile.isError) return <ErrorState onRetry={() => profile.refetch()} />;
	if (!profile.data) {
		return (
			<div className="py-16 text-center">
				<p className="font-medium text-ink">User not found</p>
				<Link to="/" className="mt-1 inline-block text-sm font-medium text-coral hover:underline">
					Back home
				</Link>
			</div>
		);
	}

	const u = profile.data;
	const isMe = me?.uid === u.uid;

	return (
		<div className="space-y-6">
			<section className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
				<div className="flex items-start gap-4">
					<div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-lav-wash text-xl font-semibold text-lav">
						{u.username.slice(0, 1).toUpperCase()}
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="text-xl font-semibold text-ink">{u.displayName || u.username}</h1>
							<UserBadges badges={u.badges} supporter={u.supporter} max={3} />
						</div>
						<p className="text-sm text-muted">@{u.username}</p>
						{u.bio && <p className="mt-2 text-[15px] text-ink-2">{u.bio}</p>}
						<div className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
							<span>
								<strong className="text-ink-2">{u.karma}</strong> karma
							</span>
							<span>
								<strong className="text-ink-2">{u.postCount}</strong> posts
							</span>
							<span>
								<strong className="text-ink-2">{u.commentCount}</strong> comments
							</span>
							<span>Joined {relativeTime(u.createdAt)}</span>
						</div>
						{isMe && (
							<Link
								to="/settings"
								className="mt-3 inline-block rounded-full border border-line px-3.5 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-coral">
								Edit profile
							</Link>
						)}
						{!isMe && me && (
							<button
								type="button"
								onClick={() => setReportOpen(true)}
								className="mt-3 inline-block rounded-full border border-line px-3.5 py-1.5 text-sm font-medium text-muted transition-colors hover:border-coral hover:text-coral">
								Report
							</button>
						)}
					</div>
				</div>
			</section>

			<div className="inline-flex rounded-full border border-line bg-surface p-0.5">
				{(["posts", "comments"] as Tab[]).map((t) => (
					<button
						key={t}
						onClick={() => setTab(t)}
						aria-pressed={tab === t}
						className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
							tab === t ? "bg-coral text-white" : "text-muted hover:text-coral"
						}`}>
						{t}
					</button>
				))}
			</div>

			{tab === "posts" ? (
				posts.isPending ? (
					<Skeleton className="h-20 w-full" />
				) : posts.isError ? (
					<ErrorState onRetry={() => posts.refetch()} />
				) : (posts.data?.length ?? 0) === 0 ? (
					<EmptyState title="No posts yet" />
				) : (
					<div className="space-y-3">
						{posts.data!.map((p) =>
							ownView && p.status !== "active" ? (
								<div key={p.id} className="rounded-2xl border border-dashed border-line bg-bg-2/40 p-1">
									<p className="px-3 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-coral">{statusLabel(p.status)}</p>
									<PostCard post={p} />
								</div>
							) : (
								<PostCard key={p.id} post={p} />
							),
						)}
					</div>
				)
			) : comments.isPending ? (
				<Skeleton className="h-20 w-full" />
			) : comments.isError ? (
				<ErrorState onRetry={() => comments.refetch()} />
			) : (comments.data?.length ?? 0) === 0 ? (
				<EmptyState title="No comments yet" />
			) : (
				<ul className="space-y-2">
					{comments.data!.map((c) => (
						<li
							key={c.id}
							className={`rounded-xl border p-3 ${ownView && c.status !== "active" ? "border-dashed border-line bg-bg-2/40" : "border-line bg-surface"}`}>
							<Link to={ownView && c.status !== "active" ? `/post/${c.postId}?focus=${c.id}` : `/post/${c.postId}`} className="block hover:text-coral">
								{ownView && c.status !== "active" && (
									<p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-coral">{statusLabel(c.status)}</p>
								)}
								<p className="whitespace-pre-wrap text-[15px] text-ink-2">{c.body}</p>
								<p className="mt-1 text-xs text-muted">
									{c.score} points · {relativeTime(c.createdAt)} · in a thread
								</p>
							</Link>
						</li>
					))}
				</ul>
			)}

			{!isMe && me && <ReportUserModal open={reportOpen} onClose={() => setReportOpen(false)} uid={u.uid} username={u.username} />}
		</div>
	);
}
