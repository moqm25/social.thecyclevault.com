/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The CycleVault Social — Vite config.
// base '/' because the site is served from the root of social.thecyclevault.com.
export default defineConfig({
	base: "/",
	plugins: [react()],
	build: {
		outDir: "dist",
		sourcemap: false,
		target: "es2020",
		rollupOptions: {
			output: {
				manualChunks: {
					// Split heavy vendors so the app shell caches independently of them.
					firebase: ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/functions", "firebase/storage"],
					react: ["react", "react-dom", "react-router-dom"],
				},
			},
		},
	},
	server: {
		port: 5173,
		strictPort: false,
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./src/test/setup.ts"],
		css: false,
	},
});
