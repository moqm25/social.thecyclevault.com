import type { BadgeKind } from "../types/models";

/**
 * Renders user flair: Supporter / Verified Clinician / Org badges.
 * Display layer for the monetization + trust system (docs/MONETIZATION.md).
 * Data is function-set only; absent for now until the Supporter/verification
 * flows ship, so these render nothing unless a badge is present.
 */

const META: Record<BadgeKind, { label: string; title: string; className: string; icon: "heart" | "check" | "star" }> = {
	supporter: {
		label: "Supporter",
		title: "Supports the platform",
		className: "bg-coral-wash text-coral",
		icon: "heart",
	},
	founding_supporter: {
		label: "Founding Supporter",
		title: "Early supporter of The CycleVault Social",
		className: "bg-coral-wash text-coral",
		icon: "star",
	},
	clinician: {
		label: "Verified Clinician",
		title: "Credentials verified by The CycleVault",
		className: "bg-lav-wash text-lav",
		icon: "check",
	},
	org: {
		label: "Verified",
		title: "Verified organization",
		className: "bg-lav-wash text-lav",
		icon: "check",
	},
};

function Icon({ kind }: { kind: "heart" | "check" | "star" }) {
	if (kind === "heart")
		return (
			<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
				<path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" />
			</svg>
		);
	if (kind === "star")
		return (
			<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
				<path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8L6.6 19.6l1-6L3.3 9.4l6-.9L12 3z" />
			</svg>
		);
	return (
		<svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path d="M5 12l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

/** A single badge pill. */
export function Badge({ kind }: { kind: BadgeKind }) {
	const m = META[kind];
	return (
		<span title={m.title} className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${m.className}`}>
			<Icon kind={m.icon} />
			{m.label}
		</span>
	);
}

/** Renders a user's badges inline (nothing if they have none). */
export function UserBadges({ badges, supporter, max = 2 }: { badges?: BadgeKind[]; supporter?: boolean; max?: number }) {
	const list = [...(badges ?? [])];
	if (supporter && !list.includes("supporter") && !list.includes("founding_supporter")) {
		list.unshift("supporter");
	}
	if (list.length === 0) return null;
	return (
		<span className="inline-flex flex-wrap items-center gap-1">
			{list.slice(0, max).map((b) => (
				<Badge key={b} kind={b} />
			))}
		</span>
	);
}
