/** Calm skeleton block. */
export function Skeleton({ className = "" }: { className?: string }) {
	return <div className={`animate-pulse rounded-lg bg-bg-2 ${className}`} />;
}

/** A few stacked post-card skeletons for feed loading. */
export function FeedSkeleton() {
	return (
		<div className="space-y-3" aria-hidden="true">
			{Array.from({ length: 4 }).map((_, i) => (
				<div key={i} className="flex gap-3 rounded-xl border border-line bg-surface p-4">
					<Skeleton className="h-16 w-9" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-3 w-1/3" />
						<Skeleton className="h-5 w-3/4" />
						<Skeleton className="h-3 w-1/2" />
					</div>
				</div>
			))}
		</div>
	);
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
	return (
		<div className="grid place-items-center rounded-xl border border-dashed border-line py-14 text-center">
			<div className="max-w-xs space-y-2 px-4">
				<h3 className="font-semibold text-ink">{title}</h3>
				{body && <p className="text-sm text-muted">{body}</p>}
				{action && <div className="pt-2">{action}</div>}
			</div>
		</div>
	);
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
	return (
		<div className="grid place-items-center rounded-xl border border-line bg-coral-wash py-12 text-center">
			<div className="space-y-2 px-4">
				<p className="font-medium text-ink">Something went wrong.</p>
				<p className="text-sm text-muted">We couldn’t load this just now.</p>
				{onRetry && (
					<button onClick={onRetry} className="pt-1 font-medium text-coral hover:underline">
						Try again
					</button>
				)}
			</div>
		</div>
	);
}
