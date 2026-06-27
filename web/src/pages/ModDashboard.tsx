import { AdminConsole } from "../features/admin/AdminConsole";

/** Moderator console — content review, reports, and removed content (community-scoped). */
export default function ModDashboard() {
	return <AdminConsole scope="mod" />;
}
