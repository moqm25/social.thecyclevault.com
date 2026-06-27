import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthProvider";
import { useCommunities } from "../../features/posts/hooks";
import {
	HomeIcon,
	ShopIcon,
	HeartIcon,
	BellIcon,
	UserIcon,
	SettingsIcon,
	ShieldIcon,
	PlusIcon,
	CirclesIcon,
	SearchIcon,
} from "./icons";
import type { ComponentType, SVGProps } from "react";

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

/**
 * Left navigation for the app shell (product register). Used both in the sticky
 * desktop sidebar and inside the mobile drawer. `onNavigate` lets the drawer close
 * itself when a destination is chosen.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
	const { user, profile } = useAuth();
	const communities = useCommunities();
	const role = profile?.role;
	const isMod = role === "moderator" || role === "admin" || role === "superadmin";
	const isAdmin = role === "admin" || role === "superadmin";

	const circles = (communities.data ?? [])
		.slice()
		.sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0))
		.slice(0, 8);

	return (
		<nav aria-label="Primary" className="flex flex-col gap-6 text-[15px]">
			{user && (
				<Link
					to="/post/new"
					onClick={onNavigate}
					className="inline-flex items-center justify-center gap-2 rounded-full bg-coral px-4 py-2.5 font-medium text-white shadow-soft transition-transform hover:scale-[1.015] focus-visible:outline-none">
					<PlusIcon size={18} />
					New post
				</Link>
			)}

			<Section>
				<Item to="/feed" icon={HomeIcon} label="Home" end onNavigate={onNavigate} />
				<Item to="/search" icon={SearchIcon} label="Search" onNavigate={onNavigate} />
				<Item to="/shop" icon={ShopIcon} label="Shop" onNavigate={onNavigate} />
				<Item to="/supporter" icon={HeartIcon} label="Become a Supporter" onNavigate={onNavigate} />
			</Section>

			{user && (
				<Section label="You">
					<Item to="/notifications" icon={BellIcon} label="Notifications" onNavigate={onNavigate} />
					{profile && <Item to={`/u/${profile.username}`} icon={UserIcon} label="Your profile" onNavigate={onNavigate} />}
					<Item to="/settings" icon={SettingsIcon} label="Settings" onNavigate={onNavigate} />
				</Section>
			)}

			{isMod && (
				<Section label="Team">
					<Item to="/mod" icon={ShieldIcon} label="Moderate" onNavigate={onNavigate} />
					{isAdmin && <Item to="/admin" icon={ShieldIcon} label="Admin" onNavigate={onNavigate} />}
				</Section>
			)}

			<Section label="Circles">
				{circles.map((c) => (
					<NavLink
						key={c.slug}
						to={`/c/${c.slug}`}
						onClick={onNavigate}
						className={({ isActive }) =>
							`flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors ${
								isActive ? "bg-coral-wash font-medium text-coral" : "text-ink-2 hover:bg-bg-2 hover:text-coral"
							}`
						}>
						<span
							aria-hidden="true"
							className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
								c.color === "lav" ? "bg-lav-wash text-lav" : "bg-coral-wash text-coral"
							}`}>
							{c.name.slice(0, 1)}
						</span>
						<span className="truncate">{c.name}</span>
					</NavLink>
				))}
				<Link
					to="/circles"
					onClick={onNavigate}
					className="mt-0.5 flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted transition-colors hover:bg-bg-2 hover:text-coral">
					<span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line">
						<CirclesIcon size={13} />
					</span>
					<span>Browse all Circles</span>
				</Link>
				{user && (
					<Link
						to="/circles/new"
						onClick={onNavigate}
						className="mt-0.5 flex items-center gap-2.5 rounded-xl px-3 py-2 text-muted transition-colors hover:bg-bg-2 hover:text-coral">
						<span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-dashed border-line">
							<PlusIcon size={13} />
						</span>
						<span>Create a Circle</span>
					</Link>
				)}
				{!user && (
					<p className="px-3 pt-1 text-[13px] leading-relaxed text-muted-2">
						<CirclesIcon size={14} className="mb-0.5 mr-1 inline" />
						Circles are member-made spaces.{" "}
						<Link to="/login" onClick={onNavigate} className="font-medium text-coral hover:underline">
							Join free
						</Link>{" "}
						to start one.
					</p>
				)}
			</Section>
		</nav>
	);
}

function Section({ label, children }: { label?: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-0.5">
			{label && <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-2">{label}</p>}
			{children}
		</div>
	);
}

function Item({
	to,
	icon: Icon,
	label,
	end,
	onNavigate,
}: {
	to: string;
	icon: IconType;
	label: string;
	end?: boolean;
	onNavigate?: () => void;
}) {
	return (
		<NavLink
			to={to}
			end={end}
			onClick={onNavigate}
			className={({ isActive }) =>
				`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
					isActive ? "bg-coral-wash font-medium text-coral" : "text-ink-2 hover:bg-bg-2 hover:text-coral"
				}`
			}>
			<Icon size={20} className="shrink-0" />
			<span className="truncate">{label}</span>
		</NavLink>
	);
}
