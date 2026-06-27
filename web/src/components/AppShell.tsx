import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { BrandWordmark } from "./BrandWordmark";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { AnnouncementBanner } from "./AnnouncementBanner";
import { AdminViewToggle } from "./AdminViewToggle";

/**
 * App shell: calm top bar + centered content column. Mobile-first.
 * The logo links back to the marketing site per docs/UI_REQUIREMENTS.md §4.
 */
export function AppShell({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-full">
			<AnnouncementBanner />
			<header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur">
				<div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
					<Link to="/" className="text-[17px]" aria-label="The CycleVault Social — home">
						<BrandWordmark />
					</Link>
					<div className="flex items-center gap-2">
						<AdminViewToggle />
						<ThemeToggle />
						<UserMenu />
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-3xl px-4 py-6">{children}</main>

			<footer className="mx-auto max-w-3xl px-4 py-10 text-center text-sm text-muted">
				<p>This platform does not provide medical advice. Consult a clinician for health concerns.</p>
				<nav className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
					<Link to="/shop" className="hover:text-coral">
						Shop
					</Link>
					<Link to="/supporter" className="hover:text-coral">
						Supporter
					</Link>
					<Link to="/guidelines" className="hover:text-coral">
						Community Guidelines
					</Link>
					<Link to="/privacy" className="hover:text-coral">
						Privacy
					</Link>
					<Link to="/terms" className="hover:text-coral">
						Terms
					</Link>
				</nav>
				<p className="mt-2">
					<span className="brand-serif">The CycleVault</span> · Private. Local. Yours.
				</p>
			</footer>
		</div>
	);
}
