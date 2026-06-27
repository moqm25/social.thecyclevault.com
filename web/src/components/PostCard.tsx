import { Link } from 'react-router-dom';
import type { Post } from '../types/models';
import { VoteControl } from './VoteControl';
import { relativeTime } from '../lib/time';
import { useVotePost } from '../features/posts/hooks';

/** A single post in a feed: vote rail + title + meta + comment count. */
export function PostCard({ post }: { post: Post }) {
  const vote = useVotePost(post.id);

  return (
    <article className="flex gap-3 rounded-xl border border-line bg-surface p-4 transition-shadow hover:shadow-soft">
      <div className="pt-0.5">
        <VoteControl
          baseScore={post.score}
          onVote={(next, prev) => vote.mutateAsync({ next, prev })}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
          <Link
            to={`/c/${post.communityId}`}
            className="font-medium text-lav hover:underline"
          >
            {post.communityId}
          </Link>
          <span aria-hidden="true">·</span>
          <Link to={`/u/${post.authorUsername}`} className="hover:underline">
            {post.authorUsername}
          </Link>
          <span aria-hidden="true">·</span>
          <span>{relativeTime(post.createdAt)}</span>
          {post.edited && <span className="italic">(edited)</span>}
        </div>

        <Link to={`/post/${post.id}`} className="mt-1 block">
          <h2 className="text-lg font-semibold leading-snug text-ink hover:text-coral">
            {post.title}
          </h2>
          {post.body && (
            <p className="mt-1 line-clamp-2 text-sm text-muted">{post.body}</p>
          )}
        </Link>

        <div className="mt-2 flex items-center gap-3 text-xs text-muted">
          <Link
            to={`/post/${post.id}`}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors hover:bg-bg-2 hover:text-coral"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.9 8.9 0 0 1-4-.9L3 20l1.1-5a8.4 8.4 0 1 1 16.9-3.5z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
          </Link>
          {post.tags?.slice(0, 3).map((t) => (
            <span key={t} className="rounded-full bg-bg-2 px-2 py-0.5 text-muted-2">
              #{t}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
