import { useTheme } from "../app/ThemeProvider";

/** Calm light/dark toggle. Icon-only, with an accessible label. */
export function ThemeToggle() {
	const { resolved, toggle } = useTheme();
	const isDark = resolved === "dark";
	return (
		<button
			type="button"
			onClick={toggle}
			aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
			className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-ink-2 transition-colors hover:text-coral">
			{isDark ? (
				// sun
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
					<path
						d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"
						stroke="currentColor"
						strokeWidth="1.6"
						strokeLinecap="round"
					/>
				</svg>
			) : (
				// moon
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
				</svg>
			)}
		</button>
	);
}
