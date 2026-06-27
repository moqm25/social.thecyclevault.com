import { Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthLayout } from "./components/layout/AuthLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import FeedPage from "./pages/FeedPage";
import CommunityPage from "./pages/CommunityPage";
import NewPostPage from "./pages/NewPostPage";
import PostDetailPage from "./pages/PostDetailPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import SupporterPage from "./pages/SupporterPage";
import ShopPage from "./pages/ShopPage";
import SearchPage from "./pages/SearchPage";
import CreateCirclePage from "./pages/CreateCirclePage";
import NotificationsPage from "./pages/NotificationsPage";
import ModDashboard from "./pages/ModDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFoundPage from "./pages/NotFoundPage";
import LoginPage from "./features/auth/LoginPage";
import PrivacyPage from "./pages/legal/PrivacyPage";
import TermsPage from "./pages/legal/TermsPage";
import GuidelinesPage from "./pages/legal/GuidelinesPage";

/**
 * Route table (docs/UI_REQUIREMENTS.md §3).
 * Three layouts: a brand landing front door (`/`), a minimal auth screen (`/login`),
 * and the app workspace shell (sidebar + content + context rail) for everything else.
 */
export default function App() {
	return (
		<Routes>
			{/* Public front door — brand welcome (redirects members to /feed). */}
			<Route path="/" element={<LandingPage />} />

			{/* Auth — its own quiet chrome. */}
			<Route element={<AuthLayout />}>
				<Route path="/login" element={<LoginPage />} />
			</Route>

			{/* App workspace — sidebar shell. */}
			<Route element={<AppLayout />}>
				<Route path="/feed" element={<FeedPage />} />
				<Route path="/c/:communitySlug" element={<CommunityPage />} />
				<Route path="/supporter" element={<SupporterPage />} />
				<Route path="/shop" element={<ShopPage />} />
				<Route path="/search" element={<SearchPage />} />
				<Route path="/post/:postId" element={<PostDetailPage />} />
				<Route path="/u/:username" element={<ProfilePage />} />
				<Route path="/privacy" element={<PrivacyPage />} />
				<Route path="/terms" element={<TermsPage />} />
				<Route path="/guidelines" element={<GuidelinesPage />} />
				<Route
					path="/circles/new"
					element={
						<ProtectedRoute>
							<CreateCirclePage />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/post/new"
					element={
						<ProtectedRoute>
							<NewPostPage />
						</ProtectedRoute>
					}
				/>
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
			</Route>
		</Routes>
	);
}
