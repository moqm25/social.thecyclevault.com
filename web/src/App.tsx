import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import PlaceholderPage from './pages/PlaceholderPage';

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
        <Route path="/login" element={<PlaceholderPage title="Sign in" />} />
        <Route path="/c/:communitySlug" element={<PlaceholderPage title="Community" />} />
        <Route path="/post/new" element={<PlaceholderPage title="New post" />} />
        <Route path="/post/:postId" element={<PlaceholderPage title="Post" />} />
        <Route path="/u/:username" element={<PlaceholderPage title="Profile" />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        <Route path="/notifications" element={<PlaceholderPage title="Notifications" />} />
        <Route path="/mod" element={<PlaceholderPage title="Moderation" />} />
        <Route path="/admin" element={<PlaceholderPage title="Admin" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}
