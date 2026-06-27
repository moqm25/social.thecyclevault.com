/**
 * Seed the six MVP communities (docs/DATA_MODEL.md §4).
 *
 * Local (emulator):
 *   firebase emulators:exec --only firestore "node scripts/seedCommunities.mjs"
 *   — or with the emulator already running:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=cyclevault-social \
 *     node scripts/seedCommunities.mjs
 *
 * Production (after deploy, gated): authenticate via ADC, then:
 *   GCLOUD_PROJECT=cyclevault-social node scripts/seedCommunities.mjs
 *
 * Idempotent: re-running only fills missing fields (merge), never clobbers counts.
 */
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

if (getApps().length === 0) initializeApp();
const db = getFirestore();

const COMMUNITIES = [
	{
		slug: "general",
		name: "General",
		description: "Anything and everything cycle-related.",
		color: "coral",
	},
	{
		slug: "cycle-questions",
		name: "Cycle Questions",
		description: "Ask the community about cycles, timing, and patterns.",
		color: "lav",
	},
	{
		slug: "symptoms",
		name: "Symptoms",
		description: "Compare notes on symptoms — gently, no diagnosing.",
		color: "coral",
	},
	{
		slug: "privacy-app-feedback",
		name: "Privacy & App Feedback",
		description: "Tell us what you think about The CycleVault.",
		color: "lav",
	},
	{
		slug: "educational-discussion",
		name: "Educational Discussion",
		description: "Learn together from plain-language, non-alarmist sources.",
		color: "coral",
	},
	{
		slug: "support",
		name: "Support",
		description: "A kind place to be heard.",
		color: "lav",
	},
];

const DEFAULT_RULES = [
	"Be kind. This is a calm, supportive space.",
	"No medical advice — share experiences, not diagnoses.",
	"No spam, ads, or self-promotion.",
	"Respect privacy — yours and others’.",
];

async function run() {
	const target = process.env.FIRESTORE_EMULATOR_HOST ? `emulator (${process.env.FIRESTORE_EMULATOR_HOST})` : "PRODUCTION";
	console.log(`Seeding ${COMMUNITIES.length} communities into ${target}...`);

	for (const c of COMMUNITIES) {
		const ref = db.collection("communities").doc(c.slug);
		const existing = await ref.get();
		await ref.set(
			{
				slug: c.slug,
				name: c.name,
				description: c.description,
				rules: DEFAULT_RULES,
				color: c.color,
				icon: null,
				visibility: "public",
				// Preserve counts if the doc already exists.
				memberCount: existing.exists ? (existing.data().memberCount ?? 0) : 0,
				postCount: existing.exists ? (existing.data().postCount ?? 0) : 0,
				moderatorIds: existing.exists ? (existing.data().moderatorIds ?? []) : [],
				updatedAt: FieldValue.serverTimestamp(),
				...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
			},
			{ merge: true },
		);
		console.log(`  ✓ ${c.slug}`);
	}
	console.log("Done.");
}

run().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});
