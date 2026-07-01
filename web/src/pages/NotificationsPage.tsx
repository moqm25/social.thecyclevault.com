import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listMyNotifications } from "../lib/firestore";
import { markNotificationRead } from "../lib/api";
import { useAuth } from "../features/auth/AuthProvider";
import { relativeTime } from "../lib/time";
import { Skeleton, EmptyState, ErrorState } from "../components/states";

export default function NotificationsPage() {
	const { user } = useAuth();
	const qc = useQueryClient();

	const q = useQuery({
		queryKey: ["notifications", user?.uid],
		queryFn: () => listMyNotifications(user!.uid),
		enabled: !!user,
	});

	const markAll = useMutation({
		mutationFn: () => markNotificationRead({ all: true }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.uid] }),
	});

	const markOne = useMutation({
		mutationFn: (notificationId: string) => markNotificationRead({ notificationId }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.uid] }),
	});

	const items = q.data ?? [];
	const hasUnread = items.some((n) => !n.read);

	return (
		<div className="mx-auto max-w-2xl space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-semibold text-ink">Notifications</h1>
				{hasUnread && (
					<button
						onClick={() => markAll.mutate()}
						className="text-sm font-medium text-coral hover:underline disabled:opacity-50"
						disabled={markAll.isPending}>
						Mark all read
					</button>
				)}
			</div>

			{q.isPending ? (
				<div className="space-y-2">
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
			) : q.isError ? (
				<ErrorState onRetry={() => q.refetch()} />
			) : items.length === 0 ? (
				<EmptyState title="You're all caught up" body="Replies, mentions, and updates will show up here." />
			) : (
				<ul className="space-y-2">
					{items.map((n) => (
						<li key={n.id}>
							<Link
								to={n.link || "/"}
								onClick={() => !n.read && markOne.mutate(n.id)}
								className={`block rounded-xl border p-3 transition-colors ${
									n.read ? "border-line bg-surface" : "border-lav-soft bg-lav-wash"
								}`}>
								<div className="flex items-start gap-2">
									{!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lav" aria-hidden="true" />}
									<div className="min-w-0 flex-1">
										<p className="font-medium text-ink">{n.title}</p>
										<p className={`text-sm text-muted ${n.type === "mod_action" ? "whitespace-pre-line" : "truncate"}`}>{n.body}</p>
										<p className="mt-0.5 text-xs text-muted-2">{relativeTime(n.createdAt)}</p>
									</div>
								</div>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
