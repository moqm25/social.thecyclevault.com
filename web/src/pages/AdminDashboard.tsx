import { AdminConsole } from "../features/admin/AdminConsole";

/** Admin console — full triage workspace (content, reports, users, removed, shop, announcement). */
export default function AdminDashboard() {
	return <AdminConsole scope="admin" />;
}
