import { Routes, Route } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import LoginPage from "./features/auth/LoginPage";

/**
 * Route table — see docs/UI_REQUIREMENTS.md §3.
 * Pages not yet implemented render a calm PlaceholderPage so navigation works
 * end-to-end during the build-out. They are replaced feature-by-feature.
 */
export default function App() {
	return (
		<AppShell>
			<Routes>
				<Route path="/" element={<HomePage />} />
				<Route path="/login" element={<LoginPage />} />
				<Route path="/c/:communitySlug" element={<PlaceholderPage title="Community" />} />
				<Route
					path="/post/new"
					element={
						<ProtectedRoute>
							<PlaceholderPage title="New post" />
						</ProtectedRoute>
					}
				/>
				<Route path="/post/:postId" element={<PlaceholderPage title="Post" />} />
				<Route path="/u/:username" element={<PlaceholderPage title="Profile" />} />
				<Route
					path="/settings"
					element={
						<ProtectedRoute>
							<PlaceholderPage title="Settings" />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/notifications"
					element={
						<ProtectedRoute>
							<PlaceholderPage title="Notifications" />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/mod"
					element={
						<ProtectedRoute minRole="moderator">
							<PlaceholderPage title="Moderation" />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/admin"
					element={
						<ProtectedRoute minRole="admin">
							<PlaceholderPage title="Admin" />
						</ProtectedRoute>
					}
				/>
				<Route path="*" element={<NotFoundPage />} />
			</Routes>
		</AppShell>
	);
}
