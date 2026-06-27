import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/Button";
import { useAllSponsoredProducts, CATEGORY_LABELS, PRODUCT_CATEGORIES } from "../shop/hooks";
import { upsertSponsoredProduct, setSponsoredProductActive } from "../../lib/api";
import type { ProductCategory, SponsoredProduct } from "../../types/models";

interface Draft {
	id?: string;
	name: string;
	blurb: string;
	url: string;
	imageUrl: string;
	category: ProductCategory;
	sponsor: string;
}

const EMPTY: Draft = { name: "", blurb: "", url: "", imageUrl: "", category: "period-care", sponsor: "" };

/**
 * Admin: manage vetted Sponsored Products (docs/MONETIZATION.md). Create/edit,
 * toggle active, and see aggregate click counts. All writes go through callables;
 * the form mirrors the server Zod schema (https URLs, length caps).
 */
export function SponsoredProductsAdmin() {
	const qc = useQueryClient();
	const { data: products, isPending } = useAllSponsoredProducts(true);
	const [draft, setDraft] = useState<Draft>(EMPTY);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const editing = !!draft.id;

	function set<K extends keyof Draft>(key: K, value: Draft[K]) {
		setDraft((d) => ({ ...d, [key]: value }));
	}

	function startEdit(p: SponsoredProduct) {
		setDraft({
			id: p.id,
			name: p.name,
			blurb: p.blurb,
			url: p.url,
			imageUrl: p.imageUrl ?? "",
			category: p.category,
			sponsor: p.sponsor ?? "",
		});
		setError(null);
	}

	async function save(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		const url = draft.url.trim();
		const imageUrl = draft.imageUrl.trim();
		if (!draft.name.trim() || !draft.blurb.trim() || !url) {
			setError("Name, blurb, and link are required.");
			return;
		}
		if (!url.startsWith("https://")) {
			setError("The product link must start with https://");
			return;
		}
		if (imageUrl && !imageUrl.startsWith("https://")) {
			setError("The image URL must start with https://");
			return;
		}
		setSaving(true);
		try {
			await upsertSponsoredProduct({
				id: draft.id,
				name: draft.name.trim(),
				blurb: draft.blurb.trim(),
				url,
				imageUrl: imageUrl || undefined,
				category: draft.category,
				sponsor: draft.sponsor.trim() || undefined,
			});
			setDraft(EMPTY);
			await qc.invalidateQueries({ queryKey: ["sponsoredProducts"] });
		} catch {
			setError("Couldn’t save the product. Please try again.");
		} finally {
			setSaving(false);
		}
	}

	async function toggleActive(p: SponsoredProduct) {
		await setSponsoredProductActive({ id: p.id, active: !p.active });
		await qc.invalidateQueries({ queryKey: ["sponsoredProducts"] });
	}

	return (
		<div className="space-y-4">
			<form onSubmit={save} className="space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-soft">
				<div className="flex items-center justify-between">
					<h3 className="font-semibold text-ink">{editing ? "Edit product" : "Add a product"}</h3>
					{editing && (
						<button type="button" onClick={() => setDraft(EMPTY)} className="text-xs text-muted hover:text-coral">
							Cancel edit
						</button>
					)}
				</div>

				<div className="grid gap-3 sm:grid-cols-2">
					<Field label="Name">
						<input className={inputCls} value={draft.name} maxLength={120} onChange={(e) => set("name", e.target.value)} />
					</Field>
					<Field label="Category">
						<select
							className={inputCls}
							value={draft.category}
							onChange={(e) => set("category", e.target.value as ProductCategory)}>
							{PRODUCT_CATEGORIES.map((c) => (
								<option key={c} value={c}>
									{CATEGORY_LABELS[c]}
								</option>
							))}
						</select>
					</Field>
				</div>

				<Field label="Blurb">
					<textarea
						className={inputCls}
						rows={2}
						maxLength={400}
						value={draft.blurb}
						onChange={(e) => set("blurb", e.target.value)}
					/>
				</Field>

				<div className="grid gap-3 sm:grid-cols-2">
					<Field label="Link (https://)">
						<input className={inputCls} value={draft.url} maxLength={2000} onChange={(e) => set("url", e.target.value)} />
					</Field>
					<Field label="Image URL (optional, https://)">
						<input
							className={inputCls}
							value={draft.imageUrl}
							maxLength={2000}
							onChange={(e) => set("imageUrl", e.target.value)}
						/>
					</Field>
				</div>

				<Field label="Sponsor / brand (optional)">
					<input className={inputCls} value={draft.sponsor} maxLength={120} onChange={(e) => set("sponsor", e.target.value)} />
				</Field>

				{error && <p className="text-sm text-coral">{error}</p>}
				<Button type="submit" loading={saving} className="!px-4 !py-1.5 text-sm">
					{editing ? "Save changes" : "Add product"}
				</Button>
			</form>

			<div className="space-y-2">
				<h3 className="text-sm font-semibold text-ink">All products</h3>
				{isPending ? (
					<p className="text-sm text-muted">Loading…</p>
				) : !products || products.length === 0 ? (
					<p className="text-sm text-muted">No products yet. Add your first above.</p>
				) : (
					products.map((p) => (
						<div key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<span className="truncate font-medium text-ink">{p.name}</span>
									{!p.active && (
										<span className="rounded-full bg-bg-2 px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-2">
											Paused
										</span>
									)}
								</div>
								<p className="text-xs text-muted">
									{CATEGORY_LABELS[p.category]} · {p.clickCount ?? 0} clicks
								</p>
							</div>
							<button onClick={() => startEdit(p)} className="text-xs font-medium text-lav hover:underline">
								Edit
							</button>
							<button
								onClick={() => toggleActive(p)}
								className="text-xs font-medium text-muted hover:text-coral">
								{p.active ? "Pause" : "Activate"}
							</button>
						</div>
					))
				)}
			</div>
		</div>
	);
}

const inputCls =
	"w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-lav";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<label className="block space-y-1">
			<span className="text-xs font-medium text-muted">{label}</span>
			{children}
		</label>
	);
}
