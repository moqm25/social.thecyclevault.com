import { Routes, Route } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import CommunityPage from "./pages/CommunityPage";
import NewPostPage from "./pages/NewPostPage";
import PostDetailPage from "./pages/PostDetailPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import NotificationsPage from "./pages/NotificationsPage";
import ModDashboard from "./pages/ModDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFoundPage from "./pages/NotFoundPage";
import LoginPage from "./features/auth/LoginPage";

/**
 * Route table — see docs/UI_REQUIREMENTS.md §3. Every MVP route is implemented.
 */
export default function App() {
	return (
		<AppShell>
			<Routes>
				<Route path="/" element={<HomePage />} />
				<Route path="/login" element={<LoginPage />} />
				<Route path="/c/:communitySlug" element={<CommunityPage />} />
				<Route
					path="/post/new"
					element={
						<ProtectedRoute>
							<NewPostPage />
						</ProtectedRoute>
					}
				/>
				<Route path="/post/:postId" element={<PostDetailPage />} />
				<Route path="/u/:username" element={<ProfilePage />} />
				<Route
					path="/settings"
					element={
						<ProtectedRoute>
							<SettingsPage />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/notifications"
					element={
						<ProtectedRoute>
							<NotificationsPage />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/mod"
					element={
						<ProtectedRoute minRole="moderator">
							<ModDashboard />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/admin"
					element={
						<ProtectedRoute minRole="admin">
							<AdminDashboard />
						</ProtectedRoute>
					}
				/>
				<Route path="*" element={<NotFoundPage />} />
			</Routes>
		</AppShell>
	);
}
