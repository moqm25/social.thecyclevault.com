import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import { ThemeProvider } from "./app/ThemeProvider.tsx";
import { AuthProvider } from "./features/auth/AuthProvider.tsx";
import { AdminViewProvider } from "./features/admin/AdminViewContext.tsx";
import "./index.css";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Forums are read-heavy; cache aggressively to keep Firestore reads (and
			// cost) down. See docs/COST_MODEL.md §5.
			staleTime: 60_000,
			gcTime: 5 * 60_000,
			retry: 1,
			refetchOnWindowFocus: false,
		},
	},
});

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<ThemeProvider>
				<BrowserRouter>
					<AuthProvider>
						<AdminViewProvider>
							<App />
						</AdminViewProvider>
					</AuthProvider>
				</BrowserRouter>
			</ThemeProvider>
		</QueryClientProvider>
	</StrictMode>,
);
