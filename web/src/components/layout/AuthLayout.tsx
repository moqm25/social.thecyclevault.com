import { Link, Outlet } from "react-router-dom";
import { BrandWordmark } from "../BrandWordmark";
import { ThemeToggle } from "../ThemeToggle";
import { ArrowRightIcon } from "./icons";

/**
 * Minimal chrome for the auth screen: a slim branded header and vertically centered
 * content over the calm brand aura. No app sidebar — sign-in is its own quiet moment.
 */
export function AuthLayout() {
	return (
		<div className="relative flex min-h-dvh flex-col overflow-hidden bg-bg">
			<div className="landing-aura" aria-hidden="true" />
			<header className="relative z-10 mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
				<Link to="/" aria-label="The CycleVault Social — home" className="text-[17px]">
					<BrandWordmark />
				</Link>
				<div className="flex items-center gap-2">
					<ThemeToggle />
					<Link to="/" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:text-coral">
						<ArrowRightIcon size={15} className="rotate-180" />
						Home
					</Link>
				</div>
			</header>
			<main className="relative z-10 flex flex-1 items-center justify-center px-5 py-8">
				<div className="w-full">
					<Outlet />
				</div>
			</main>
		</div>
	);
}
