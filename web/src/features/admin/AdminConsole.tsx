import { useSearchParams } from "react-router-dom";
import { ContentReviewQueue } from "../moderation/ContentReviewQueue";
import { ReportQueue } from "../moderation/ReportQueue";
import { AccountReviewQueue } from "../moderation/AccountReviewQueue";
import { RemovedContentQueue } from "../moderation/RemovedContentQueue";
import { SponsoredProductsAdmin } from "./SponsoredProductsAdmin";
import { AnnouncementAdmin } from "./AnnouncementAdmin";
import { UserAdmin } from "./UserAdmin";
import { InsightsPanel } from "./InsightsPanel";
import { IssuesQueue } from "./IssuesQueue";
import { useAdminStats } from "./useAdminStats";

type Scope = "admin" | "mod";
type TabId = "overview" | "insights" | "content" | "reports" | "users" | "removed" | "issues" | "shop" | "announcement";

interface TabDef {
	id: TabId;
	label: string;
	scopes: Scope[];
}

const TABS: TabDef[] = [
	{ id: "overview", label: "Overview", scopes: ["admin", "mod"] },
	{ id: "insights", label: "Insights", scopes: ["admin"] },
	{ id: "content", label: "Content review", scopes: ["admin", "mod"] },
	{ id: "reports", label: "Reports", scopes: ["admin", "mod"] },
	{ id: "users", label: "Users", scopes: ["admin"] },
	{ id: "removed", label: "Removed", scopes: ["admin", "mod"] },
	{ id: "issues", label: "Issues", scopes: ["admin"] },
	{ id: "shop", label: "Shop", scopes: ["admin"] },
	{ id: "announcement", label: "Announcement", scopes: ["admin"] },
];

/**
 * Unified moderation / admin console (product register). A triage Overview with
 * live stat tiles routes to focused tabs; only the active tab mounts, so each
 * tab's queries fire on demand instead of all at once. `scope` gates admin-only
 * tabs (Users / Shop / Announcement) so moderators get a clean, smaller console.
 * Tabs are URL-driven (?tab=) so they're linkable and survive refresh.
 */
export function AdminConsole({ scope }: { scope: Scope }) {
	const tabs = TABS.filter((t) => t.scopes.includes(scope));
	const [params, setParams] = useSearchParams();
	const requested = params.get("tab") as TabId | null;
	const active: TabId = tabs.some((t) => t.id === requested) ? requested! : "overview";

	const setTab = (id: TabId) => setParams(id === "overview" ? {} : { tab: id }, { replace: true });

	return (
		<div className="space-y-6">
			<header>
				<h1 className="font-serif text-2xl font-semibold text-ink">{scope === "admin" ? "Admin console" : "Moderation"}</h1>
				<p className="mt-0.5 text-sm text-muted">
					{scope === "admin"
						? "Keep the community calm, safe, and fairly run — content, reports, members, and the Shop."
						: "Review held content and open reports across your communities."}
				</p>
			</header>

			{/* Tab bar */}
			<nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-line pb-px" aria-label="Admin sections">
				{tabs.map((t) => (
					<button
						key={t.id}
						onClick={() => setTab(t.id)}
						aria-current={active === t.id ? "page" : undefined}
						className={`relative whitespace-nowrap rounded-t-lg px-3.5 py-2 text-sm font-medium transition-colors ${
							active === t.id ? "text-coral" : "text-muted hover:text-ink-2"
						}`}>
						{t.label}
						{active === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-coral" />}
					</button>
				))}
			</nav>

			{/* Active panel */}
			<div>
				{active === "overview" && <Overview scope={scope} onJump={setTab} />}
				{active === "insights" && scope === "admin" && <InsightsPanel />}
				{active === "content" && <ContentReviewQueue />}
				{active === "reports" && <ReportQueue isAdmin={scope === "admin"} />}
				{active === "users" && scope === "admin" && (
					<div className="space-y-8">
						<section>
							<h2 className="mb-1 text-base font-semibold text-ink">Accounts to review</h2>
							<p className="mb-3 text-sm text-muted">
								Flagged automatically after repeated strikes. Strikes decay after 90 days; you can suspend, ban, or clear.
							</p>
							<AccountReviewQueue />
						</section>
						<section>
							<h2 className="mb-1 text-base font-semibold text-ink">Look up a member</h2>
							<p className="mb-3 text-sm text-muted">Find anyone by username to manage badges, role, and enforcement.</p>
							<UserAdmin />
						</section>
					</div>
				)}
				{active === "removed" && <RemovedContentQueue />}
				{active === "issues" && scope === "admin" && <IssuesQueue />}
				{active === "shop" && scope === "admin" && <SponsoredProductsAdmin />}
				{active === "announcement" && scope === "admin" && <AnnouncementAdmin />}
			</div>
		</div>
	);
}

/** Triage landing: stat tiles that say where to look first, each routing to its tab. */
function Overview({ scope, onJump }: { scope: Scope; onJump: (id: TabId) => void }) {
	const s = useAdminStats();

	const needsYou = s.awaiting + s.reports + s.flagged;

	const tiles: { id: TabId; label: string; value: number | string; hint: string; urgent: boolean; admin?: boolean }[] = [
		{ id: "content", label: "Awaiting review", value: s.awaiting, hint: "Held content for a human", urgent: s.awaiting > 0 },
		{ id: "reports", label: "Open reports", value: s.reports, hint: "Flagged by members", urgent: s.reports > 0 },
		{ id: "users", label: "Accounts to review", value: s.flagged, hint: "Repeated strikes", urgent: s.flagged > 0, admin: true },
		{ id: "removed", label: "Removed recently", value: s.removed, hint: "Taken down or deleted", urgent: false },
		{ id: "shop", label: "Active products", value: `${s.activeProducts}/${s.totalProducts}`, hint: "Live in the Shop", urgent: false, admin: true },
		{
			id: "announcement",
			label: "Announcement",
			value: s.announcementLive ? "Live" : "Off",
			hint: s.announcementLive ? "Banner showing" : "No banner",
			urgent: false,
			admin: true,
		},
	];

	const visible = tiles.filter((t) => !t.admin || scope === "admin");

	return (
		<div className="space-y-5">
			<div
				className={`rounded-2xl border p-4 ${
					needsYou > 0 ? "border-coral-soft bg-coral-wash/50" : "border-line bg-surface"
				}`}>
				<p className="text-sm text-ink-2">
					{s.isLoading ? (
						"Checking the queues…"
					) : needsYou > 0 ? (
						<>
							<span className="font-semibold text-ink">{needsYou}</span> item{needsYou === 1 ? "" : "s"} need attention right now.
						</>
					) : (
						<>All clear — nothing needs you this moment. 🌿</>
					)}
				</p>
			</div>

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
				{visible.map((t) => (
					<button
						key={t.id}
						onClick={() => onJump(t.id)}
						className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-shadow hover:shadow-soft ${
							t.urgent ? "border-coral-soft bg-coral-wash/40" : "border-line bg-surface"
						}`}>
						<span className={`text-3xl font-semibold tabular-nums ${t.urgent ? "text-coral" : "text-ink"}`}>{t.value}</span>
						<span className="mt-1 text-[13px] font-medium text-ink-2">{t.label}</span>
						<span className="text-[12px] text-muted-2">{t.hint}</span>
					</button>
				))}
			</div>

			<p className="text-[12px] text-muted-2">
				Counts show at least the most recent items in each queue. Every privileged action is written to the append-only audit log.
			</p>
		</div>
	);
}
