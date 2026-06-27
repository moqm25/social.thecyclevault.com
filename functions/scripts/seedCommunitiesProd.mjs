/**
 * Seed the six MVP communities into PRODUCTION Firestore (docs/DATA_MODEL.md §4).
 *
 * Unlike seedCommunities.mjs (which uses the Admin SDK against the emulator), this
 * script talks to the Firestore REST API using the Firebase CLI's own OAuth token,
 * so it needs no service-account key — just a logged-in `firebase login`.
 *
 * Run:  node scripts/seedCommunitiesProd.mjs
 *
 * Idempotent: existing communities keep their counts; only descriptive fields are
 * refreshed. Missing ones are created with zeroed counters.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PROJECT_ID = "cyclevault-social";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function cliToken() {
	const cfg = JSON.parse(readFileSync(join(homedir(), ".config/configstore/firebase-tools.json"), "utf8"));
	const tok = cfg.tokens?.access_token;
	if (!tok) throw new Error("No Firebase CLI token — run `firebase login` first.");
	return tok;
}

const COMMUNITIES = [
	{ slug: "general", name: "General", description: "Anything and everything cycle-related.", color: "coral" },
	{ slug: "cycle-questions", name: "Cycle Questions", description: "Ask the community about cycles, timing, and patterns.", color: "lav" },
	{ slug: "symptoms", name: "Symptoms", description: "Compare notes on symptoms — gently, no diagnosing.", color: "coral" },
	{ slug: "privacy-app-feedback", name: "Privacy & App Feedback", description: "Tell us what you think about The CycleVault.", color: "lav" },
	{
		slug: "educational-discussion",
		name: "Educational Discussion",
		description: "Learn together from plain-language, non-alarmist sources.",
		color: "coral",
	},
	{ slug: "support", name: "Support", description: "A kind place to be heard.", color: "lav" },
];

const DEFAULT_RULES = [
	"Be kind. This is a calm, supportive space.",
	"No medical advice — share experiences, not diagnoses.",
	"No spam, ads, or self-promotion.",
	"Respect privacy — yours and others’.",
];

const str = (s) => ({ stringValue: s });
const strArr = (arr) => ({ arrayValue: { values: arr.map(str) } });

function describeFields(c, now) {
	return {
		slug: str(c.slug),
		name: str(c.name),
		description: str(c.description),
		rules: strArr(DEFAULT_RULES),
		color: str(c.color),
		visibility: str("public"),
		updatedAt: { timestampValue: now },
	};
}

async function run() {
	const token = cliToken();
	const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
	const now = new Date().toISOString();
	console.log(`Seeding ${COMMUNITIES.length} communities into PRODUCTION (${PROJECT_ID})...`);

	for (const c of COMMUNITIES) {
		const url = `${BASE}/communities/${c.slug}`;
		const existing = await fetch(url, { headers });

		let fields;
		let mask = "";
		if (existing.status === 200) {
			// Update descriptive fields only; preserve counts/createdAt/moderatorIds.
			fields = describeFields(c, now);
			mask = Object.keys(fields)
				.map((f) => `updateMask.fieldPaths=${f}`)
				.join("&");
		} else {
			// Create fresh with zeroed counters.
			fields = {
				...describeFields(c, now),
				icon: { nullValue: null },
				memberCount: { integerValue: "0" },
				postCount: { integerValue: "0" },
				moderatorIds: { arrayValue: {} },
				createdAt: { timestampValue: now },
			};
		}

		const res = await fetch(`${url}${mask ? `?${mask}` : ""}`, {
			method: "PATCH",
			headers,
			body: JSON.stringify({ fields }),
		});
		if (!res.ok) {
			const err = await res.text();
			throw new Error(`Failed to seed ${c.slug}: ${res.status} ${err}`);
		}
		console.log(`  ✓ ${c.slug} (${existing.status === 200 ? "updated" : "created"})`);
	}
	console.log("Done.");
}

run().catch((err) => {
	console.error("Seed failed:", err.message);
	process.exit(1);
});
