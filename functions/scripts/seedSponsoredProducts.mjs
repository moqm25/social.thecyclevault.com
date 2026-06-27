/**
 * Seed a few EXAMPLE sponsored products for local demos / browser testing
 * (docs/MONETIZATION.md). These are placeholder entries — in production, admins
 * add real vetted products through the Admin → Sponsored products dashboard.
 *
 * Local (emulator already running):
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=cyclevault-social \
 *     node scripts/seedSponsoredProducts.mjs
 *
 * Idempotent: fixed doc ids, merge writes; re-running won't duplicate.
 */
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

if (getApps().length === 0) initializeApp();
const db = getFirestore();

const PRODUCTS = [
	{
		id: "demo-organic-pads",
		name: "Organic Cotton Pads",
		blurb: "Plant-based, fragrance-free period pads in plastic-free packaging. A gentle everyday option.",
		url: "https://example.com/organic-pads",
		category: "period-care",
		sponsor: "Example Co.",
	},
	{
		id: "demo-heat-patch",
		name: "Reusable Heat Patches",
		blurb: "Low-profile warming patches for cramps that you can wear under clothes. Rechargeable, no cords.",
		url: "https://example.com/heat-patch",
		category: "wellness",
		sponsor: "Example Co.",
	},
	{
		id: "demo-cycle-book",
		name: "“Understanding Your Cycle” (Book)",
		blurb: "A plain-language, non-alarmist guide to how cycles work — written by an OB-GYN.",
		url: "https://example.com/cycle-book",
		category: "books",
		sponsor: "Example Press",
	},
	{
		id: "demo-iron-supplement",
		name: "Gentle Iron + Vitamin C",
		blurb: "An easy-on-the-stomach iron supplement. Always check with your clinician before starting supplements.",
		url: "https://example.com/iron",
		category: "supplements",
		sponsor: "Example Labs",
	},
];

async function run() {
	const target = process.env.FIRESTORE_EMULATOR_HOST ? `emulator (${process.env.FIRESTORE_EMULATOR_HOST})` : "PRODUCTION";
	console.log(`Seeding ${PRODUCTS.length} EXAMPLE sponsored products into ${target}...`);
	if (!process.env.FIRESTORE_EMULATOR_HOST) {
		console.log("⚠️  Targeting PRODUCTION. These are placeholder/demo entries — remove or replace with real products.");
	}

	for (const p of PRODUCTS) {
		const ref = db.collection("sponsoredProducts").doc(p.id);
		const existing = await ref.get();
		await ref.set(
			{
				name: p.name,
				blurb: p.blurb,
				imageUrl: null,
				url: p.url,
				category: p.category,
				sponsor: p.sponsor,
				active: true,
				clickCount: existing.exists ? (existing.data().clickCount ?? 0) : 0,
				updatedAt: FieldValue.serverTimestamp(),
				...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
			},
			{ merge: true },
		);
		console.log(`  ✓ ${p.id}`);
	}
	console.log("Done.");
}

run().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});
