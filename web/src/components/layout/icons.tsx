import type { SVGProps } from "react";

/**
 * Small, consistent line-icon set for the app shell navigation. The project
 * established a hand-rolled inline-SVG convention (ThemeToggle, UserMenu, PostCard);
 * these match it — 24×24 viewBox, 1.6 stroke, round caps/joins — so the whole UI
 * shares one icon family (product register: consistent affordances).
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 20, children, ...props }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			{...props}>
			{children}
		</svg>
	);
}

export const HomeIcon = (p: IconProps) => (
	<Base {...p}>
		<path d="M4 11.5 12 4l8 7.5" />
		<path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
		<path d="M10 20v-5h4v5" />
	</Base>
);

export const CirclesIcon = (p: IconProps) => (
	<Base {...p}>
		<circle cx="8" cy="9" r="3.2" />
		<path d="M2.5 19a5.5 5.5 0 0 1 11 0" />
		<path d="M15.5 6.4a3.2 3.2 0 0 1 0 5.2" />
		<path d="M16.5 14.2A5.5 5.5 0 0 1 21.5 19" />
	</Base>
);

export const ShopIcon = (p: IconProps) => (
	<Base {...p}>
		<path d="M6 8h12l-1 11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 8Z" />
		<path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
	</Base>
);

export const HeartIcon = (p: IconProps) => (
	<Base {...p}>
		<path d="M12 20s-7-4.6-9.3-9A4.8 4.8 0 0 1 12 6.6 4.8 4.8 0 0 1 21.3 11c-2.3 4.4-9.3 9-9.3 9Z" />
	</Base>
);

export const BellIcon = (p: IconProps) => (
	<Base {...p}>
		<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
		<path d="M13.7 21a2 2 0 0 1-3.4 0" />
	</Base>
);

export const UserIcon = (p: IconProps) => (
	<Base {...p}>
		<circle cx="12" cy="8" r="3.4" />
		<path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
	</Base>
);

export const SettingsIcon = (p: IconProps) => (
	<Base {...p}>
		<circle cx="12" cy="12" r="3" />
		<path d="M12 2.8v2.4M12 18.8v2.4M4.8 4.8l1.7 1.7M17.5 17.5l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.8 19.2l1.7-1.7M17.5 6.5l1.7-1.7" />
	</Base>
);

export const ShieldIcon = (p: IconProps) => (
	<Base {...p}>
		<path d="M12 3.2 19 6v5.5c0 4.5-3 7.6-7 8.8-4-1.2-7-4.3-7-8.8V6l7-2.8Z" />
		<path d="m9.2 12 1.9 1.9 3.7-3.8" />
	</Base>
);

export const PlusIcon = (p: IconProps) => (
	<Base {...p}>
		<path d="M12 5v14M5 12h14" />
	</Base>
);

export const SparkIcon = (p: IconProps) => (
	<Base {...p}>
		<path d="M12 3.5c.6 3.7 1.8 4.9 5.5 5.5-3.7.6-4.9 1.8-5.5 5.5-.6-3.7-1.8-4.9-5.5-5.5 3.7-.6 4.9-1.8 5.5-5.5Z" />
		<path d="M18.5 14c.3 1.6.8 2.1 2.4 2.4-1.6.3-2.1.8-2.4 2.4-.3-1.6-.8-2.1-2.4-2.4 1.6-.3 2.1-.8 2.4-2.4Z" />
	</Base>
);

export const LockIcon = (p: IconProps) => (
	<Base {...p}>
		<rect x="5" y="11" width="14" height="9" rx="2" />
		<path d="M8 11V8a4 4 0 0 1 8 0v3" />
	</Base>
);

export const MenuIcon = (p: IconProps) => (
	<Base {...p}>
		<path d="M4 7h16M4 12h16M4 17h16" />
	</Base>
);

export const CloseIcon = (p: IconProps) => (
	<Base {...p}>
		<path d="M6 6l12 12M18 6 6 18" />
	</Base>
);

export const ArrowRightIcon = (p: IconProps) => (
	<Base {...p}>
		<path d="M5 12h14M13 6l6 6-6 6" />
	</Base>
);

export const EyeOffIcon = (p: IconProps) => (
	<Base {...p}>
		<path d="M10.6 6.2A8.6 8.6 0 0 1 12 6c5 0 8.5 6 8.5 6a14 14 0 0 1-2.2 2.8M6.3 7.8A14 14 0 0 0 3.5 12S7 18 12 18a8.3 8.3 0 0 0 3.3-.7" />
		<path d="M10.2 10.2a2.4 2.4 0 0 0 3.4 3.4" />
		<path d="M3.5 3.5 20.5 20.5" />
	</Base>
);

export const LeafIcon = (p: IconProps) => (
	<Base {...p}>
		<path d="M5 19c0-7 5-12 14-13 .5 8-3.5 14-11 14a6 6 0 0 1-3-1Z" />
		<path d="M9 16c2.5-3 5-4.5 8-5.5" />
	</Base>
);
