import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";
import { useTheme } from "../app/ThemeProvider";
import { updateMyProfile } from "../lib/firestore";
import { exportMyData, deleteMyAccount } from "../lib/api";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";
import { Skeleton } from "../components/states";

type Theme = "light" | "dark" | "system";

export default function SettingsPage() {
	const { user, profile, signOutUser } = useAuth();
	const { theme, setTheme } = useTheme();
	const navigate = useNavigate();

	const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
	const [bio, setBio] = useState(profile?.bio ?? "");
	const [savedMsg, setSavedMsg] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const [exporting, setExporting] = useState(false);
	const [confirmText, setConfirmText] = useState("");
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	if (!profile) {
		return <Skeleton className="h-40 w-full" />;
	}

	async function saveProfile() {
		if (!user) return;
		setSaving(true);
		setSavedMsg(null);
		try {
			await updateMyProfile(user.uid, {
				displayName: displayName.trim() || null,
				bio: bio.trim(),
			});
			setSavedMsg("Saved.");
		} catch {
			setSavedMsg("Couldn’t save. Please try again.");
		} finally {
			setSaving(false);
		}
	}

	async function handleExport() {
		setExporting(true);
		try {
			const data = await exportMyData({});
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `cyclevault-social-${profile!.username}-export.json`;
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			// no-op; surfaced minimally
		} finally {
			setExporting(false);
		}
	}

	async function handleDelete() {
		if (confirmText !== profile!.username) return;
		setDeleting(true);
		setDeleteError(null);
		try {
			await deleteMyAccount({});
			await signOutUser();
			navigate("/");
		} catch {
			setDeleteError("Couldn’t delete your account. Please try again or contact support.");
			setDeleting(false);
		}
	}

	const themes: { key: Theme; label: string }[] = [
		{ key: "light", label: "Light" },
		{ key: "dark", label: "Dark" },
		{ key: "system", label: "System" },
	];

	return (
		<div className="mx-auto max-w-2xl space-y-6">
			<h1 className="text-xl font-semibold text-ink">Settings</h1>

			{/* Profile */}
			<section className="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-soft">
				<h2 className="font-semibold text-ink">Profile</h2>
				<div className="space-y-1">
					<span className="block text-sm font-medium text-ink-2">Username</span>
					<p className="text-sm text-muted">@{profile.username} · can’t be changed</p>
				</div>
				<TextField
					label="Display name"
					value={displayName}
					onChange={(e) => setDisplayName(e.target.value)}
					maxLength={50}
					hint="Optional. Shown instead of your username."
				/>
				<div className="space-y-1.5">
					<label htmlFor="bio" className="block text-sm font-medium text-ink-2">
						Bio
					</label>
					<textarea
						id="bio"
						value={bio}
						onChange={(e) => setBio(e.target.value)}
						rows={3}
						maxLength={300}
						placeholder="A little about you (optional)."
						className="w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-lav"
					/>
					<p className="text-right text-xs text-muted">{bio.length}/300</p>
				</div>
				<div className="flex items-center gap-3">
					<Button onClick={saveProfile} loading={saving}>
						Save
					</Button>
					{savedMsg && <span className="text-sm text-muted">{savedMsg}</span>}
				</div>
			</section>

			{/* Appearance */}
			<section className="space-y-3 rounded-2xl border border-line bg-surface p-5 shadow-soft">
				<h2 className="font-semibold text-ink">Appearance</h2>
				<div className="inline-flex rounded-full border border-line p-0.5">
					{themes.map((t) => (
						<button
							key={t.key}
							onClick={() => setTheme(t.key)}
							aria-pressed={theme === t.key}
							className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
								theme === t.key ? "bg-coral text-white" : "text-muted hover:text-coral"
							}`}>
							{t.label}
						</button>
					))}
				</div>
			</section>

			{/* Privacy & data */}
			<section className="space-y-3 rounded-2xl border border-line bg-surface p-5 shadow-soft">
				<h2 className="font-semibold text-ink">Your data</h2>
				<p className="text-sm text-muted">
					Download everything you’ve posted here as a portable JSON file — your posts, comments, and votes.
				</p>
				<Button variant="ghost" onClick={handleExport} loading={exporting}>
					Export my data
				</Button>
			</section>

			{/* Danger zone */}
			<section className="space-y-3 rounded-2xl border border-coral-soft bg-coral-wash p-5">
				<h2 className="font-semibold text-ink">Delete account</h2>
				<p className="text-sm text-ink-2">
					This permanently removes your account and anonymizes your posts and comments. This can’t be undone.
					To confirm, type your username <strong>{profile.username}</strong> below.
				</p>
				<TextField
					label="Confirm username"
					value={confirmText}
					onChange={(e) => setConfirmText(e.target.value)}
					placeholder={profile.username}
				/>
				{deleteError && <p className="text-sm text-coral">{deleteError}</p>}
				<button
					onClick={handleDelete}
					disabled={confirmText !== profile.username || deleting}
					className="rounded-full bg-coral px-5 py-2.5 font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50">
					{deleting ? "Deleting…" : "Permanently delete my account"}
				</button>
			</section>

			<div className="pt-2">
				<button
					onClick={async () => {
						await signOutUser();
						navigate("/");
					}}
					className="text-sm font-medium text-muted hover:text-coral">
					Sign out
				</button>
			</div>
		</div>
	);
}
