import { Link } from 'react-router-dom';

/** Reusable calm placeholder for routes not yet implemented. */
export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="grid place-items-center py-16 text-center">
      <div className="max-w-sm space-y-3">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-lav-wash text-lav">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        <p className="text-muted">
          This part of the community is being built with care. Check back soon.
        </p>
        <Link to="/" className="inline-block font-medium text-coral hover:underline">
          Back home
        </Link>
      </div>
    </div>
  );
}
