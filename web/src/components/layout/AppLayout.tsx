import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { BrandWordmark } from "../BrandWordmark";
import { ThemeToggle } from "../ThemeToggle";
import { UserMenu } from "../UserMenu";
import { AnnouncementBanner } from "../AnnouncementBanner";
import { AdminViewToggle } from "../AdminViewToggle";
import { AdminModeRibbon } from "../AdminModeRibbon";
import { useAdminView } from "../../features/admin/AdminViewContext";
import { SidebarNav } from "./SidebarNav";
import { RightRail } from "./RightRail";
import { TopSearch } from "./TopSearch";
import { MenuIcon, CloseIcon } from "./icons";

/**
 * App shell (product register): slim sticky top bar + 3-column workspace
 * (sticky left nav · content · context rail) that uses the full screen on large
 * displays, collapsing to a single column with a slide-over drawer on mobile.
 * Renders the matched route via <Outlet/>.
 */
export function AppLayout() {
	const [drawerOpen, setDrawerOpen] = useState(false);
	const location = useLocation();
	const { adminView } = useAdminView();

	// Dense, task-focused pages use the full content width (no context rail).
	const fullWidthPrefixes = ["/admin", "/mod", "/settings", "/post/new", "/circles/new"];
	const showRail = !fullWidthPrefixes.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));

	// Close the mobile drawer whenever the route changes.
	useEffect(() => setDrawerOpen(false), [location.pathname]);

	// Close on Escape + lock background scroll while the drawer is open.
	useEffect(() => {
		if (!drawerOpen) return;
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
		document.addEventListener("keydown", onKey);
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = "";
		};
	}, [drawerOpen]);

	return (
		<div className="min-h-full">
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-coral focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lift">
				Skip to content
			</a>
			<AdminModeRibbon />
			<AnnouncementBanner />

			<header
				className={`sticky top-0 z-30 border-b backdrop-blur transition-colors ${
					adminView ? "border-coral/40 bg-coral-wash/80 shadow-[inset_0_2px_0_0_var(--coral)]" : "border-line bg-bg/85"
				}`}>
				<div className="mx-auto flex h-14 max-w-[1320px] items-center gap-3 px-4">
					<button
						type="button"
						onClick={() => setDrawerOpen(true)}
						aria-label="Open menu"
						className="-ml-1 grid h-9 w-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-bg-2 hover:text-coral lg:hidden">
						<MenuIcon />
					</button>
					<Link to="/feed" className="text-[17px]" aria-label="The CycleVault Social — home">
						<BrandWordmark />
					</Link>
					<TopSearch />
					<div className="ml-auto flex items-center gap-2">
						<AdminViewToggle />
						<ThemeToggle />
						<UserMenu />
					</div>
				</div>
			</header>

			<div
				className={`mx-auto grid max-w-[1320px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[15rem_minmax(0,1fr)] ${
					showRail ? "xl:grid-cols-[15rem_minmax(0,1fr)_19rem]" : ""
				}`}>
				{/* Desktop left nav */}
				<aside className="hidden lg:block">
					<div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pb-6 pr-1">
						<SidebarNav />
					</div>
				</aside>

				{/* Content */}
				<main id="main-content" className="min-w-0">
					<Outlet />
				</main>

				{/* Context rail — hidden on dense, task-focused pages so they use full width. */}
				{showRail && (
					<aside className="hidden xl:block">
						<div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pb-6">
							<RightRail />
						</div>
					</aside>
				)}
			</div>

			{/* Mobile drawer */}
			{drawerOpen && (
				<div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
					<div
						className="absolute inset-0 bg-ink/30 backdrop-blur-sm motion-safe:animate-[fade_.15s_ease-out]"
						onClick={() => setDrawerOpen(false)}
					/>
					<div className="absolute inset-y-0 left-0 flex w-[18rem] max-w-[85%] flex-col bg-surface shadow-lift motion-safe:animate-[slideIn_.22s_cubic-bezier(.16,1,.3,1)]">
						<div className="flex h-14 items-center justify-between border-b border-line px-4">
							<BrandWordmark className="text-[16px]" />
							<button
								type="button"
								onClick={() => setDrawerOpen(false)}
								aria-label="Close menu"
								className="grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-bg-2 hover:text-coral">
								<CloseIcon />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto px-3 py-4">
							<SidebarNav mobile onNavigate={() => setDrawerOpen(false)} />
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
