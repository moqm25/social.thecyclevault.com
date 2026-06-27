import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/Button";
import { useAnnouncement } from "../shop/hooks";
import { broadcastAnnouncement } from "../../lib/api";

/**
 * Admin: set or clear the page-wide announcement banner (founder request).
 * Writes settings/global.announcement via broadcastAnnouncement; every client
 * picks it up. Clearing removes it for everyone.
 */
export function AnnouncementAdmin() {
	const qc = useQueryClient();
	const { data: current } = useAnnouncement();
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [level, setLevel] = useState<"info" | "warning">("info");
	const [busy, setBusy] = useState(false);
	const [msg, setMsg] = useState<string | null>(null);

	async function publish(e: React.FormEvent) {
		e.preventDefault();
		if (!body.trim()) {
			setMsg("Write a short message first.");
			return;
		}
		setBusy(true);
		setMsg(null);
		try {
			await broadcastAnnouncement({ title: title.trim() || undefined, body: body.trim(), level, active: true });
			await qc.invalidateQueries({ queryKey: ["announcement"] });
			setMsg("Announcement is live for everyone.");
		} catch {
			setMsg("Couldn’t publish. Please try again.");
		} finally {
			setBusy(false);
		}
	}

	async function clear() {
		setBusy(true);
		setMsg(null);
		try {
			await broadcastAnnouncement({ active: false });
			await qc.invalidateQueries({ queryKey: ["announcement"] });
			setTitle("");
			setBody("");
			setMsg("Announcement cleared.");
		} catch {
			setMsg("Couldn’t clear. Please try again.");
		} finally {
			setBusy(false);
		}
	}

	const inputCls =
		"w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-lav";

	return (
		<form onSubmit={publish} className="space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-soft">
			{current?.body && (
				<div className="rounded-xl border border-lav-soft bg-lav-wash px-3 py-2 text-sm text-ink-2">
					<span className="font-medium text-ink">Currently live:</span> {current.title ? `${current.title} — ` : ""}
					{current.body}
				</div>
			)}
			<label className="block space-y-1">
				<span className="text-xs font-medium text-muted">Title (optional)</span>
				<input className={inputCls} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
			</label>
			<label className="block space-y-1">
				<span className="text-xs font-medium text-muted">Message</span>
				<textarea className={inputCls} rows={2} maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} />
			</label>
			<div className="flex items-center gap-3">
				<label className="flex items-center gap-2 text-sm text-muted">
					<span>Style</span>
					<select className={inputCls} value={level} onChange={(e) => setLevel(e.target.value as "info" | "warning")}>
						<option value="info">Info</option>
						<option value="warning">Warning</option>
					</select>
				</label>
			</div>
			{msg && <p className="text-sm text-muted">{msg}</p>}
			<div className="flex items-center gap-2">
				<Button type="submit" loading={busy} className="!px-4 !py-1.5 text-sm">
					Publish to everyone
				</Button>
				<button type="button" onClick={clear} disabled={busy} className="text-sm font-medium text-muted hover:text-coral disabled:opacity-50">
					Clear current
				</button>
			</div>
		</form>
	);
}
