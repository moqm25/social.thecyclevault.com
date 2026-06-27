import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
	theme: Theme;
	resolved: "light" | "dark";
	setTheme: (t: Theme) => void;
	toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "tcv-social-theme";

function systemPrefersDark(): boolean {
	return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyThemeClass(resolved: "light" | "dark") {
	const root = document.documentElement;
	root.classList.toggle("dark", resolved === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setThemeState] = useState<Theme>(() => {
		const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
		return stored ?? "system";
	});

	const resolved: "light" | "dark" = useMemo(() => {
		if (theme === "system") return systemPrefersDark() ? "dark" : "light";
		return theme;
	}, [theme]);

	useEffect(() => {
		applyThemeClass(resolved);
	}, [resolved]);

	// React to OS theme changes while in "system" mode.
	useEffect(() => {
		if (theme !== "system") return;
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = () => applyThemeClass(mq.matches ? "dark" : "light");
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, [theme]);

	const setTheme = useCallback((t: Theme) => {
		setThemeState(t);
		localStorage.setItem(STORAGE_KEY, t);
	}, []);

	const toggle = useCallback(() => {
		setTheme(resolved === "dark" ? "light" : "dark");
	}, [resolved, setTheme]);

	const value = useMemo(() => ({ theme, resolved, setTheme, toggle }), [theme, resolved, setTheme, toggle]);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
	return ctx;
}
