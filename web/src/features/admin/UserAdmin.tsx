import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { FirebaseError } from "firebase/app";
import { getUserByUsername, getUserModeration } from "../../lib/firestore";
import { grantBadge, suspendUser, banUser, unbanUser, clearUserStrikes, setUserRole, getUserActivityReport, searchUsers, adminDeleteUser } from "../../lib/api";
import { useAuth } from "../auth/AuthProvider";
import { UserBadges } from "../../components/Badge";
import { relativeTime } from "../../lib/time";
import type { UserProfile, UserModeration, BadgeKind, UserRole, UserSearchResult } from "../../types/models";

const STATUS_STYLE: Record<string, string> = {
	active: "bg-lav-wash text-lav",
	suspended: "bg-coral-wash text-coral",
	banned: "bg-ink text-cream",
	deleted: "bg-bg-2 text-muted-2",
};

const BADGES: { kind: BadgeKind; label: string }[] = [
	{ kind: "clinician", label: "Verified Clinician" },
	{ kind: "org", label: "Verified org" },
	{ kind: "founding_supporter", label: "Founding Supporter" },
	{ kind: "supporter", label: "Supporter" },
];

const ROLES: UserRole[] = ["user", "moderator", "admin", "superadmin"];

function friendly(err: unknown): string {
	if (err instanceof FirebaseError) {
		// Our callables throw already-friendly messages for these — surface them.
		if (err.code === "functions/failed-precondition" || err.code === "functions/permission-denied") {
			return err.message || "You don’t have permission for that action.";
		}
		if (err.code === "functions/not-found") return "That user no longer exists.";
	}
	return "Action failed. Please try again.";
}

/**
 * Admin user management. Look a member up by username, then act: grant/revoke
 * verification + Supporter badges, change role (superadmin only), suspend, ban /
 * unban, or clear strikes. Every action runs through an audited Cloud Function.
 */
export function UserAdmin() {
	const { profile: me } = useAuth();
	const qc = useQueryClient();
	const isSuperadmin = me?.role === "superadmin";

	const [query, setQuery] = useState("");
	const [results, setResults] = useState<UserSearchResult[] | null>(null);
	const [user, setUser] = useState<UserProfile | null>(null);
	const [mod, setMod] = useState<UserModeration | null>(null);
	const [searching, setSearching] = useState(false);
	const [notFound, setNotFound] = useState(false);
	const [busy, setBusy] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [okMsg, setOkMsg] = useState<string | null>(null);
	const [confirmDelete, setConfirmDelete] = useState(false);

	async function load(username: string) {
		const u = await getUserByUsername(username);
		setUser(u);
		setNotFound(!u);
		setMod(u ? await getUserModeration(u.uid) : null);
		setConfirmDelete(false);
	}

	async function select(r: UserSearchResult) {
		setError(null);
		setOkMsg(null);
		setResults(null);
		try {
			await load(r.username);
		} catch {
			setError("Couldn’t open that member. Please try again.");
		}
	}

	async function search(e: React.FormEvent) {
		e.preventDefault();
		const q = query.trim();
		if (!q) return;
		setSearching(true);
		setError(null);
		setOkMsg(null);
		setNotFound(false);
		setResults(null);
		setUser(null);
		try {
			const { results: found } = await searchUsers({ query: q });
			if (found.length === 1) {
				await load(found[0].username); // jump straight into the only match
			} else if (found.length === 0) {
				setNotFound(true);
			} else {
				setResults(found);
			}
		} catch {
			setError("Couldn’t search right now. Please try again.");
		} finally {
			setSearching(false);
		}
	}

	async function run(key: string, fn: () => Promise<unknown>, successMsg: string) {
		if (!user) return;
		setBusy(key);
		setError(null);
		setOkMsg(null);
		try {
			await fn();
			await load(user.username); // refetch the now-changed user
			await qc.invalidateQueries({ queryKey: ["accountsNeedingReview"] });
			setOkMsg(successMsg);
		} catch (err) {
			setError(friendly(err));
		} finally {
			setBusy(null);
		}
	}

	const hasBadge = (k: BadgeKind) => user?.badges?.includes(k) ?? false;

	async function downloadReport() {
		if (!user) return;
		setBusy("report");
		setError(null);
		setOkMsg(null);
		try {
			const report = await getUserActivityReport({ uid: user.uid });
			const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			const stamp = new Date().toISOString().slice(0, 10);
			a.href = url;
			a.download = `cyclevault-user-report-${user.username}-${stamp}.json`;
			a.click();
			URL.revokeObjectURL(url);
			setOkMsg("Report downloaded.");
		} catch (err) {
			setError(friendly(err));
		} finally {
			setBusy(null);
		}
	}

	async function deleteAccount() {
		if (!user) return;
		setBusy("delete");
		setError(null);
		setOkMsg(null);
		try {
			await adminDeleteUser({ uid: user.uid, reason: "Admin account deletion" });
			await qc.invalidateQueries({ queryKey: ["accountsNeedingReview"] });
			setOkMsg(`Account @${user.username} was deleted and its content anonymized.`);
			setUser(null);
			setMod(null);
			setConfirmDelete(false);
		} catch (err) {
			setError(friendly(err));
			setBusy(null);
		}
	}

	return (
		<div className="space-y-5">
			<form onSubmit={search} className="flex gap-2">
				<div className="relative flex-1">
					<span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2">🔍</span>
					<input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search by username or email"
						className="w-full rounded-full border border-line bg-surface py-2.5 pl-9 pr-4 text-[15px] text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-lav"
					/>
				</div>
				<button
					type="submit"
					disabled={searching}
					className="rounded-full bg-coral px-5 py-2.5 text-[15px] font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-50">
					{searching ? "Searching…" : "Search"}
				</button>
			</form>

			{notFound && <p className="text-sm text-muted">No member found for that username or email.</p>}

			{/* Multiple matches → pick one */}
			{results && results.length > 0 && (
				<ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
					{results.map((r) => (
						<li key={r.uid}>
							<button
								onClick={() => select(r)}
								className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-2/50">
								<span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lav-wash text-sm font-semibold text-lav">
									{r.username.slice(0, 1).toUpperCase()}
								</span>
								<span className="min-w-0 flex-1">
									<span className="flex flex-wrap items-center gap-2">
										<span className="font-medium text-ink">{r.displayName || r.username}</span>
										<span className="text-sm text-muted">@{r.username}</span>
									</span>
									<span className="flex flex-wrap items-center gap-x-2 text-xs">
										<span className={`rounded-full px-1.5 py-0.5 font-semibold uppercase tracking-wide ${STATUS_STYLE[r.status] ?? "bg-bg-2 text-muted"}`}>
											{r.status}
										</span>
										<span className="text-muted-2">{r.role}</span>
										{r.email && <span className="text-muted-2">· {r.email}</span>}
									</span>
								</span>
								<span className="shrink-0 text-muted-2">›</span>
							</button>
						</li>
					))}
				</ul>
			)}

			{user && (
				<div className="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-soft">
					{/* Identity */}
					<div className="flex items-start gap-3">
						<span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-lav-wash text-lg font-semibold text-lav">
							{user.username.slice(0, 1).toUpperCase()}
						</span>
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2">
								<Link to={`/u/${user.username}`} className="font-semibold text-ink hover:text-coral">
									{user.displayName || user.username}
								</Link>
								<UserBadges badges={user.badges} supporter={user.supporter} max={4} />
							</div>
							<p className="text-sm text-muted">@{user.username}</p>
							<div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
								<span className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${STATUS_STYLE[user.status] ?? "bg-bg-2 text-muted"}`}>
									{user.status}
								</span>
								<span className="rounded-full bg-bg-2 px-2 py-0.5 font-medium text-ink-2">{user.role}</span>
								<span className="text-muted-2">
									{user.postCount} posts · {user.commentCount} comments · {user.karma} karma
								</span>
							</div>
						</div>
					</div>

					{/* Strikes */}
					<div className="rounded-xl border border-line bg-bg-2/40 p-3 text-sm">
						{mod && (mod.strikeCount > 0 || mod.strikeTotal > 0) ? (
							<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
								<span className="font-medium text-ink">
									{mod.strikeCount} active strike{mod.strikeCount === 1 ? "" : "s"}
								</span>
								<span className="text-muted-2">· {mod.strikeTotal} all-time</span>
								{mod.needsAdminReview && (
									<span className="rounded-full bg-coral-wash px-2 py-0.5 text-[11px] font-semibold uppercase text-coral">Needs review</span>
								)}
								{mod.lastReason && <span className="text-muted">· last: {mod.lastReason}</span>}
								{mod.lastStrikeAt && <span className="text-muted-2">· {relativeTime(mod.lastStrikeAt)}</span>}
							</div>
						) : (
							<span className="text-muted">No strikes. 🌿</span>
						)}
					</div>

					{/* Badges */}
					<ActionGroup label="Verification & Supporter">
						{BADGES.map((b) => {
							const on = hasBadge(b.kind);
							return (
								<button
									key={b.kind}
									disabled={busy !== null}
									onClick={() => run(`badge-${b.kind}`, () => grantBadge({ uid: user.uid, badge: b.kind, grant: !on }), `${on ? "Removed" : "Granted"} ${b.label}.`)}
									className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
										on ? "border-coral bg-coral-wash text-coral" : "border-line text-ink-2 hover:text-coral"
									}`}>
									{on ? `✓ ${b.label}` : `Grant ${b.label}`}
								</button>
							);
						})}
					</ActionGroup>

					{/* Role */}
					{isSuperadmin && (
						<ActionGroup label="Role">
							{ROLES.map((r) => (
								<button
									key={r}
									disabled={busy !== null || user.role === r}
									onClick={() => run(`role-${r}`, () => setUserRole({ uid: user.uid, role: r }), `Role set to ${r}.`)}
									className={`rounded-full border px-3 py-1.5 text-sm font-medium capitalize transition-colors disabled:opacity-40 ${
										user.role === r ? "border-lav bg-lav-wash text-lav" : "border-line text-ink-2 hover:text-coral"
									}`}>
									{r}
								</button>
							))}
						</ActionGroup>
					)}

					{/* Enforcement */}
					<ActionGroup label="Enforcement">
						<button
							disabled={busy !== null}
							onClick={() => run("suspend7", () => suspendUser({ uid: user.uid, durationHours: 168, reason: "Admin action" }), "Suspended for 7 days.")}
							className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-coral disabled:opacity-50">
							Suspend 7d
						</button>
						<button
							disabled={busy !== null}
							onClick={() => run("suspend30", () => suspendUser({ uid: user.uid, durationHours: 720, reason: "Admin action" }), "Suspended for 30 days.")}
							className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-coral disabled:opacity-50">
							Suspend 30d
						</button>
						{(mod?.strikeCount ?? 0) > 0 && (
							<button
								disabled={busy !== null}
								onClick={() => run("clear", () => clearUserStrikes({ uid: user.uid, reason: "Reviewed — cleared" }), "Strikes cleared.")}
								className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-ink disabled:opacity-50">
								Clear strikes
							</button>
						)}
						{user.status === "banned" ? (
							<button
								disabled={busy !== null}
								onClick={() => run("unban", () => unbanUser({ uid: user.uid }), "Account reinstated.")}
								className="rounded-full border border-lav px-3 py-1.5 text-sm font-medium text-lav transition-colors hover:bg-lav-wash disabled:opacity-50">
								Unban
							</button>
						) : (
							<button
								disabled={busy !== null}
								onClick={() => run("ban", () => banUser({ uid: user.uid, reason: "Admin action", permanent: true }), "Account banned.")}
								className="rounded-full bg-ink px-3 py-1.5 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-50">
								Ban
							</button>
						)}
					</ActionGroup>

					{error && <p className="text-sm text-coral">{error}</p>}
					{okMsg && <p className="text-sm text-lav">{okMsg}</p>}

					{/* Accountability */}
					<ActionGroup label="Accountability">
						<button
							disabled={busy !== null}
							onClick={downloadReport}
							className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-coral disabled:opacity-50">
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
							{busy === "report" ? "Generating…" : "Download activity report"}
						</button>
					</ActionGroup>
					<p className="text-[12px] text-muted-2">
						A full record — profile, strikes, bans, moderation actions, reports, and everything they posted — for disputes or appeals. Generating
						it is itself logged.
					</p>

					{/* Danger zone — superadmin only */}
					{isSuperadmin && user.status !== "deleted" && (
						<div className="rounded-xl border border-coral-soft bg-coral-wash/40 p-3">
							<p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-coral">Danger zone</p>
							{!confirmDelete ? (
								<button
									disabled={busy !== null}
									onClick={() => {
										setConfirmDelete(true);
										setError(null);
										setOkMsg(null);
									}}
									className="rounded-full border border-coral px-3 py-1.5 text-sm font-medium text-coral transition-colors hover:bg-coral hover:text-white disabled:opacity-50">
									Delete account
								</button>
							) : (
								<div className="space-y-2">
									<p className="text-sm text-ink-2">
										Permanently delete <strong>@{user.username}</strong>? Their Auth login is removed and all their content is anonymized. This
										can’t be undone.
									</p>
									<div className="flex flex-wrap gap-2">
										<button
											disabled={busy !== null}
											onClick={deleteAccount}
											className="rounded-full bg-coral px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
											{busy === "delete" ? "Deleting…" : "Yes, delete permanently"}
										</button>
										<button
											disabled={busy !== null}
											onClick={() => setConfirmDelete(false)}
											className="rounded-full px-4 py-1.5 text-sm font-medium text-muted transition-colors hover:text-ink-2 disabled:opacity-50">
											Cancel
										</button>
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function ActionGroup({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div>
			<p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-2">{label}</p>
			<div className="flex flex-wrap gap-2">{children}</div>
		</div>
	);
}
