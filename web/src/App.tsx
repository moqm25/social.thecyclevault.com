import { Routes, Route } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import CommunityPage from "./pages/CommunityPage";
import NewPostPage from "./pages/NewPostPage";
import PostDetailPage from "./pages/PostDetailPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import SupporterPage from "./pages/SupporterPage";
import ShopPage from "./pages/ShopPage";
import NotificationsPage from "./pages/NotificationsPage";
import ModDashboard from "./pages/ModDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFoundPage from "./pages/NotFoundPage";
import LoginPage from "./features/auth/LoginPage";
import PrivacyPage from "./pages/legal/PrivacyPage";
import TermsPage from "./pages/legal/TermsPage";
import GuidelinesPage from "./pages/legal/GuidelinesPage";

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
				<Route path="/supporter" element={<SupporterPage />} />
				<Route path="/shop" element={<ShopPage />} />
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
				<Route path="/privacy" element={<PrivacyPage />} />
				<Route path="/terms" element={<TermsPage />} />
				<Route path="/guidelines" element={<GuidelinesPage />} />
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
