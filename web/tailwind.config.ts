import type { Config } from "tailwindcss";

/**
 * The CycleVault Social — Tailwind theme.
 * Brand tokens mirror thecyclevault.com/site.css (see docs/UI_REQUIREMENTS.md §2)
 * so the forum is visually continuous with the app and marketing site.
 * Tokens are driven by CSS variables (defined in src/index.css) to support
 * light/dark theming from a single source of truth.
 */
export default {
	content: ["./index.html", "./src/**/*.{ts,tsx}"],
	darkMode: "class",
	theme: {
		extend: {
			colors: {
				coral: {
					DEFAULT: "var(--coral)",
					soft: "var(--coral-soft)",
					wash: "var(--coral-wash)",
				},
				lav: {
					DEFAULT: "var(--lav)",
					soft: "var(--lav-soft)",
					wash: "var(--lav-wash)",
				},
				cream: "var(--cream)",
				bg: {
					DEFAULT: "var(--bg)",
					2: "var(--bg-2)",
				},
				ink: {
					DEFAULT: "var(--ink)",
					2: "var(--ink-2)",
				},
				muted: {
					DEFAULT: "var(--muted)",
					2: "var(--muted-2)",
				},
				line: "var(--line)",
				surface: "var(--surface)",
			},
			fontFamily: {
				sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
				serif: ["Fraunces", "ui-serif", "Georgia", "serif"],
			},
			borderRadius: {
				xl: "22px",
				"2xl": "32px",
			},
			boxShadow: {
				soft: "0 1px 2px rgba(15,17,22,.04), 0 8px 24px rgba(15,17,22,.06)",
				lift: "0 4px 14px rgba(168,155,255,.18), 0 22px 60px rgba(255,122,133,.12)",
			},
			transitionTimingFunction: {
				smooth: "cubic-bezier(.2,.7,.1,1)",
				spring: "cubic-bezier(.16,1,.3,1)",
			},
			fontSize: {
				// Minimum body size is 15px per UI_REQUIREMENTS.md §6 (accessibility).
				base: ["15px", { lineHeight: "1.55" }],
			},
		},
	},
	plugins: [],
} satisfies Config;
