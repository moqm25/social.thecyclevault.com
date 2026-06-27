import { env, useEmulators } from "./env";

/**
 * Build/version identifier surfaced in the admin Debug panel and attached to issue
 * reports. Bump on meaningful releases so support can correlate a report with a
 * build. (Kept a hand-maintained constant to avoid wiring a build-time inject.)
 */
export const APP_VERSION = "social-web 2026.06.27";

/** A flat, human-readable snapshot of the running client — no secrets, no PII
 *  beyond the viewer's own (pseudonymous) account, which they can review before
 *  anything is sent. Shared by the admin Debug panel and "Report a problem". */
export interface DebugInfo {
	appVersion: string;
	mode: string;
	environment: "emulator" | "production";
	projectId: string;
	url: string;
	route: string;
	referrer: string;
	userAgent: string;
	language: string;
	platform: string;
	viewport: string;
	screen: string;
	devicePixelRatio: number;
	timezone: string;
	online: boolean;
	colorScheme: "dark" | "light";
	reducedMotion: boolean;
	localTime: string;
	/** Signed-in context — null/false for guests. */
	uid: string | null;
	username: string | null;
	role: string | null;
	emailVerified: boolean | null;
	adminView: boolean;
}

export interface DebugContextInput {
	uid?: string | null;
	username?: string | null;
	role?: string | null;
	emailVerified?: boolean | null;
	adminView?: boolean;
}

function matches(query: string): boolean {
	try {
		return typeof window !== "undefined" && window.matchMedia(query).matches;
	} catch {
		return false;
	}
}

function safeTimezone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
	} catch {
		return "";
	}
}

/** Collect the current client/debug context. Pass the viewer's auth bits so the
 *  snapshot includes who they were when the issue happened. */
export function collectDebugInfo(ctx: DebugContextInput = {}): DebugInfo {
	const hasWindow = typeof window !== "undefined";
	return {
		appVersion: APP_VERSION,
		mode: import.meta.env.MODE,
		environment: useEmulators ? "emulator" : "production",
		projectId: env.VITE_FIREBASE_PROJECT_ID || "(unknown)",
		url: hasWindow ? window.location.href : "",
		route: hasWindow ? window.location.pathname + window.location.search : "",
		referrer: typeof document !== "undefined" ? document.referrer : "",
		userAgent: hasWindow ? window.navigator.userAgent : "",
		language: hasWindow ? window.navigator.language : "",
		platform: hasWindow ? window.navigator.platform : "",
		viewport: hasWindow ? `${window.innerWidth}\u00d7${window.innerHeight}` : "",
		screen: hasWindow && window.screen ? `${window.screen.width}\u00d7${window.screen.height}` : "",
		devicePixelRatio: hasWindow ? window.devicePixelRatio : 1,
		timezone: safeTimezone(),
		online: hasWindow ? window.navigator.onLine : true,
		colorScheme: matches("(prefers-color-scheme: dark)") ? "dark" : "light",
		reducedMotion: matches("(prefers-reduced-motion: reduce)"),
		localTime: new Date().toISOString(),
		uid: ctx.uid ?? null,
		username: ctx.username ?? null,
		role: ctx.role ?? null,
		emailVerified: ctx.emailVerified ?? null,
		adminView: ctx.adminView ?? false,
	};
}

/** Ordered label/value rows for compact display in the Debug panel and report. */
export function debugInfoRows(info: DebugInfo): { label: string; value: string }[] {
	return [
		{ label: "App version", value: info.appVersion },
		{ label: "Build mode", value: info.mode },
		{ label: "Environment", value: info.environment },
		{ label: "Firebase project", value: info.projectId },
		{ label: "Signed in as", value: info.username ? `${info.username} (${info.role ?? "user"})` : "Guest" },
		{ label: "User ID", value: info.uid ?? "\u2014" },
		{ label: "Email verified", value: info.emailVerified === null ? "\u2014" : info.emailVerified ? "Yes" : "No" },
		{ label: "Admin view", value: info.adminView ? "On" : "Off" },
		{ label: "Route", value: info.route || "/" },
		{ label: "Full URL", value: info.url },
		{ label: "Referrer", value: info.referrer || "\u2014" },
		{ label: "Viewport", value: info.viewport },
		{ label: "Screen", value: `${info.screen} @${info.devicePixelRatio}x` },
		{ label: "Color scheme", value: info.colorScheme },
		{ label: "Reduced motion", value: info.reducedMotion ? "On" : "Off" },
		{ label: "Online", value: info.online ? "Yes" : "No" },
		{ label: "Language", value: info.language },
		{ label: "Timezone", value: info.timezone },
		{ label: "Platform", value: info.platform || "\u2014" },
		{ label: "Local time", value: info.localTime },
		{ label: "User agent", value: info.userAgent },
	];
}

/** Plain-text rendering (for the clipboard copy + email body). */
export function debugInfoToText(info: DebugInfo): string {
	return debugInfoRows(info)
		.map((r) => `${r.label}: ${r.value}`)
		.join("\n");
}
