import { Link } from 'react-router-dom';

const COMMUNITIES = [
  { slug: 'general', name: 'General', blurb: 'Anything and everything cycle-related.' },
  { slug: 'cycle-questions', name: 'Cycle Questions', blurb: 'Ask the community.' },
  { slug: 'symptoms', name: 'Symptoms', blurb: 'Compare notes, gently.' },
  { slug: 'privacy-app-feedback', name: 'Privacy & App Feedback', blurb: 'Tell us what you think.' },
  { slug: 'educational-discussion', name: 'Educational Discussion', blurb: 'Learn together.' },
  { slug: 'support', name: 'Support', blurb: 'A kind place to be heard.' },
];

/** Calm landing: brand hero + the seed communities. Real feed lands in Phase 3. */
export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-surface p-6 shadow-soft sm:p-8">
        <p className="text-sm font-medium uppercase tracking-wide text-lav">
          Community
        </p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight text-ink sm:text-3xl">
          A calmer place to talk about{' '}
          <span className="brand-serif text-coral">your cycle</span>.
        </h1>
        <p className="mt-3 max-w-prose text-muted">
          Ask questions, share what you’ve noticed, and learn from others — without
          accounts following you around or noise designed to keep you scrolling.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="rounded-full bg-coral px-5 py-2.5 font-medium text-white transition-transform hover:scale-[1.02]"
          >
            Join the community
          </Link>
          <Link
            to="/c/general"
            className="rounded-full border border-line px-5 py-2.5 font-medium text-ink-2 transition-colors hover:text-coral"
          >
            Browse first
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Communities</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {COMMUNITIES.map((c) => (
            <Link
              key={c.slug}
              to={`/c/${c.slug}`}
              className="group rounded-xl border border-line bg-surface p-4 transition-shadow hover:shadow-lift"
            >
              <div className="font-medium text-ink group-hover:text-coral">
                {c.name}
              </div>
              <div className="mt-1 text-sm text-muted">{c.blurb}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
