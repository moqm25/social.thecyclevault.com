import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { BrandWordmark } from './BrandWordmark';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

/**
 * App shell: calm top bar + centered content column. Mobile-first.
 * The logo links back to the marketing site per docs/UI_REQUIREMENTS.md §4.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link to="/" className="text-[17px]" aria-label="The CycleVault Social — home">
            <BrandWordmark />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>

      <footer className="mx-auto max-w-3xl px-4 py-10 text-center text-sm text-muted">
        <p>
          This platform does not provide medical advice. Consult a clinician for
          health concerns.
        </p>
        <p className="mt-2">
          <span className="brand-serif">The CycleVault</span> · Private. Local. Yours.
        </p>
      </footer>
    </div>
  );
}
