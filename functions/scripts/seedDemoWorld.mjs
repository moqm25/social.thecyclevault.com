/**
 * seedDemoWorld — populate the LOCAL EMULATOR with a full, realistic demo world
 * for reviewing The CycleVault Social: 100+ accounts (members, experts, mods,
 * admins, and a few rule-breakers), Circles, acceptable + unacceptable posts and
 * comments in every moderation state, reports, the moderation queue, strikes,
 * sponsored products, an announcement, and notifications.
 *
 * EMULATOR ONLY. This wipes and reseeds the emulator's data — it never touches
 * production. Emulator data resets when you stop the emulators, so just re-run.
 *
 * Run (with emulators already running):
 *   cd functions
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *   GCLOUD_PROJECT=cyclevault-social \
 *   node scripts/seedDemoWorld.mjs
 *
 * It also writes ../DEMO_ACCOUNTS.md with the full credentials table.
 */
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
	console.error(
		"\n✋ Refusing to run: this script is EMULATOR-ONLY.\n" +
			"   Set FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST (see the header).\n",
	);
	process.exit(1);
}

if (getApps().length === 0) initializeApp({ projectId: process.env.GCLOUD_PROJECT || "cyclevault-social" });
const db = getFirestore();
const auth = getAuth();

const SHARED_PASSWORD = "CycleVault123!";
const now = Date.now();
const EPOCH = 1_700_000_000;

// ---------------------------------------------------------------- helpers ----
const T = (daysAgo = 0, hoursAgo = 0) => Timestamp.fromMillis(now - daysAgo * 864e5 - hoursAgo * 36e5);
const ms = (daysAgo = 0, hoursAgo = 0) => now - daysAgo * 864e5 - hoursAgo * 36e5;
function hotRank(score, createdAtMs) {
	const sign = score > 0 ? 1 : score < 0 ? -1 : 0;
	const order = Math.log10(Math.max(Math.abs(score), 1));
	const seconds = Math.floor(createdAtMs / 1000) - EPOCH;
	return Math.round((sign * order + seconds / 45000) * 1e7) / 1e7;
}
// Tiny deterministic PRNG so re-runs produce the same world.
let _seed = 1337;
function rnd() {
	_seed = (_seed * 1103515245 + 12345) & 0x7fffffff;
	return _seed / 0x7fffffff;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const pickN = (arr, n) => {
	const c = [...arr];
	const out = [];
	while (out.length < n && c.length) out.push(c.splice(Math.floor(rnd() * c.length), 1)[0]);
	return out;
};
const intBetween = (a, b) => a + Math.floor(rnd() * (b - a + 1));

// Buffered writes, committed in chunks (Firestore batch cap = 500).
const writes = [];
const W = (ref, data) => writes.push([ref, data]);
async function flush() {
	for (let i = 0; i < writes.length; i += 400) {
		const b = db.batch();
		for (const [ref, data] of writes.slice(i, i + 400)) b.set(ref, data, { merge: true });
		await b.commit();
	}
	writes.length = 0;
}

// ------------------------------------------------------------- accounts -------
// Calm, nature-y pseudonyms (matches the brand voice).
const ADJ = [
	"calm","quiet","gentle","soft","warm","brave","kind","still","bright","mellow",
	"sunny","misty","rosy","cozy","lucky","merry","dreamy","breezy","golden","velvet",
	"amber","clever","humble","noble","plucky","serene","tender","wise","fern","willow",
];
const NOUN = [
	"fox","willow","river","meadow","sparrow","fern","robin","maple","wren","dove",
	"otter","lark","ivy","sage","heron","finch","moss","brook","cedar","poppy",
	"daisy","lotus","aspen","juniper","hazel","luna","marigold","clover","reed","thistle",
	"bramble","laurel","pebble","harbor","season","feather","willow","meadow","bloom","tide",
];

/** @type {Array<any>} */
const accounts = [];
const usernamesTaken = new Set();
function addAccount(a) {
	const usernameLower = a.username.toLowerCase();
	if (usernamesTaken.has(usernameLower)) return null;
	usernamesTaken.add(usernameLower);
	const acc = {
		uid: `dw_${usernameLower}`,
		username: a.username,
		usernameLower,
		email: a.email ?? `${usernameLower}@example.test`,
		password: SHARED_PASSWORD,
		role: a.role ?? "user",
		status: a.status ?? "active",
		badges: a.badges ?? [],
		supporter: a.supporter ?? false,
		supporterSince: a.supporter ? ms(intBetween(20, 300)) : null,
		displayName: a.displayName ?? null,
		bio: a.bio ?? "",
		suspendedUntil: a.suspendedUntil ?? null,
		moderatorOf: a.moderatorOf ?? [],
		note: a.note ?? "",
	};
	accounts.push(acc);
	return acc;
}

// --- Named / special accounts -------------------------------------------------
addAccount({ username: "TheCycleVault", email: "team@cyclevault.test", role: "superadmin", badges: ["org"], supporter: true,
	displayName: "The CycleVault", bio: "Official account of The CycleVault. Here to keep things calm, kind, and private.", note: "OFFICIAL · superadmin" });
addAccount({ username: "calmfox", email: "admin@example.com", role: "admin", supporter: true,
	displayName: "Robin (Admin)", bio: "Community admin. If you need a human, reply in-thread.", note: "Admin (easy login)" });
addAccount({ username: "gentleheron", role: "moderator", displayName: "Heron", bio: "Volunteer moderator. Be kind 🌿", note: "Moderator" });
addAccount({ username: "quietbrook", role: "moderator", displayName: "Brook", bio: "Moderator. Here to keep threads gentle.", note: "Moderator" });
addAccount({ username: "kindmarlow", role: "moderator", displayName: "Marlow", bio: "Moderator + long-time member.", note: "Moderator" });
// Experts (Verified Clinician / Verified org)
addAccount({ username: "Dr_Maya", role: "user", badges: ["clinician"], supporter: true, displayName: "Dr. Maya · OB-GYN",
	bio: "Board-certified OB-GYN. General info only — not a substitute for your own clinician.", note: "Verified Clinician" });
addAccount({ username: "Nurse_Priya", role: "user", badges: ["clinician"], displayName: "Priya, RN",
	bio: "Women's-health nurse. Sharing gentle, evidence-based info.", note: "Verified Clinician" });
addAccount({ username: "Dr_Elena", role: "user", badges: ["clinician"], supporter: true, displayName: "Dr. Elena · Endocrinology",
	bio: "Reproductive endocrinologist. PCOS & hormones.", note: "Verified Clinician" });
addAccount({ username: "Midwife_Rosa", role: "user", badges: ["clinician"], displayName: "Rosa · Midwife",
	bio: "Registered midwife. Cycles, fertility, and the in-between.", note: "Verified Clinician" });
addAccount({ username: "RedSchool", role: "user", badges: ["org"], supporter: true, displayName: "Red School",
	bio: "Menstrual education collective. Verified organization.", note: "Verified org" });
addAccount({ username: "PeriodPositive", role: "user", badges: ["org"], displayName: "Period Positive",
	bio: "Nonprofit for period education & access. Verified organization.", note: "Verified org" });
addAccount({ username: "quietwillow", role: "user", badges: ["founding_supporter"], supporter: true,
	displayName: "Willow", bio: "Tracking since forever. Tea enthusiast.", note: "Founding Supporter" });
// Rule-breakers (populate the moderation tools)
addAccount({ username: "spammyvibes", role: "user", status: "banned", displayName: "deals deals deals",
	bio: "", note: "BANNED · spam ring" });
addAccount({ username: "pushyseller", role: "user", status: "suspended", suspendedUntil: ms(-1), // until ~1 day from now
	displayName: "Best Supplements", bio: "", note: "SUSPENDED · 2 strikes" });
addAccount({ username: "loudtroll", role: "user", status: "active", displayName: "loud one",
	bio: "", note: "FLAGGED for review · 5 strikes" });
addAccount({ username: "misinfomara", role: "user", status: "suspended", suspendedUntil: ms(-7),
	displayName: "Mara", bio: "", note: "FLAGGED for review · 3 strikes" });
addAccount({ username: "anon_member", role: "user", status: "active", displayName: "anonymous",
	bio: "", note: "Posted crisis content — handled with care, not punished" });

// --- Regular members (fill to 110+) ------------------------------------------
const SUPPORTER_EVERY = 7; // ~1 in 7 regulars is a Supporter
let made = 0;
for (let i = 0; made < 96; i++) {
	const adj = ADJ[i % ADJ.length];
	const noun = NOUN[(i * 7) % NOUN.length];
	let username = `${adj}${noun}`;
	if (username.length > 20) username = username.slice(0, 20);
	let u = username;
	let n = 2;
	while (usernamesTaken.has(u.toLowerCase())) u = `${username}${n++}`.slice(0, 20);
	const isSupporter = made % SUPPORTER_EVERY === 0;
	const acc = addAccount({
		username: u,
		role: "user",
		badges: isSupporter && made % (SUPPORTER_EVERY * 2) === 0 ? ["founding_supporter"] : [],
		supporter: isSupporter,
		bio: pick(["", "", "here to learn 🌙", "tracking for a year now", "tea + early nights", "just listening, mostly", "cycle-curious", "be kind ✨"]),
	});
	if (acc) made++;
}

const GOOD = accounts.filter((a) => a.status === "active" && a.role === "user" && !["spammyvibes", "pushyseller", "loudtroll", "misinfomara"].includes(a.usernameLower === a.username.toLowerCase() ? a.username : ""));
const POSTERS = accounts.filter((a) => a.status === "active"); // anyone active can author
const byName = Object.fromEntries(accounts.map((a) => [a.username, a]));
const badgeOf = (a) => ({ authorBadges: a.badges, authorSupporter: a.supporter });

console.log(`Prepared ${accounts.length} accounts.`);

// ----------------------------------------------------------- communities ------
const DEFAULT_RULES = [
	"Be kind. This is a calm, supportive space.",
	"No medical advice — share experiences, not diagnoses.",
	"No spam, ads, or self-promotion.",
	"Respect privacy — yours and others’.",
];
const seededCommunities = [
	{ slug: "general", name: "General", description: "Anything and everything cycle-related.", color: "coral" },
	{ slug: "cycle-questions", name: "Cycle Questions", description: "Ask the community about cycles, timing, and patterns.", color: "lav" },
	{ slug: "symptoms", name: "Symptoms", description: "Compare notes on symptoms — gently, no diagnosing.", color: "coral" },
	{ slug: "privacy-app-feedback", name: "Privacy & App Feedback", description: "Tell us what you think about The CycleVault.", color: "lav" },
	{ slug: "educational-discussion", name: "Educational Discussion", description: "Learn together from plain-language, non-alarmist sources.", color: "coral" },
	{ slug: "support", name: "Support", description: "A kind place to be heard.", color: "lav" },
];
// Member-created "Circles"
const memberCircles = [
	{ slug: "pcos-support", name: "PCOS Support", description: "For anyone navigating PCOS — cysts, hormones, and hope.", color: "coral", createdBy: "Dr_Elena" },
	{ slug: "ttc", name: "TTC — Trying to Conceive", description: "Tracking, timing, and tenderness on the TTC road.", color: "lav", createdBy: "Midwife_Rosa" },
	{ slug: "perimenopause", name: "Perimenopause", description: "The in-between years, talked about honestly.", color: "coral", createdBy: "quietwillow" },
	{ slug: "endo-warriors", name: "Endo Warriors", description: "Endometriosis support, pain tips, and solidarity.", color: "lav", createdBy: "Nurse_Priya" },
	{ slug: "cycle-and-sleep", name: "Cycle & Sleep", description: "How your cycle and your sleep talk to each other.", color: "coral", createdBy: "calmfox" },
];
const allCommunities = [...seededCommunities, ...memberCircles];
const communityPostCount = Object.fromEntries(allCommunities.map((c) => [c.slug, 0]));

for (const c of seededCommunities) {
	W(db.collection("communities").doc(c.slug), {
		slug: c.slug, name: c.name, description: c.description, rules: DEFAULT_RULES, color: c.color,
		icon: null, visibility: "public", memberCount: intBetween(40, 900), postCount: 0, moderatorIds: [],
		createdAt: T(120), updatedAt: T(1),
	});
}
for (const c of memberCircles) {
	const creator = byName[c.createdBy];
	W(db.collection("communities").doc(c.slug), {
		slug: c.slug, name: c.name, description: c.description, rules: DEFAULT_RULES, color: c.color,
		icon: null, visibility: "public", memberCount: intBetween(8, 220), postCount: 0,
		moderatorIds: [creator.uid], createdBy: creator.uid, createdAt: T(intBetween(10, 60)), updatedAt: T(1),
	});
	creator.moderatorOf = [...new Set([...(creator.moderatorOf || []), c.slug])];
	W(db.collection("auditLogs").doc(), { actorId: creator.uid, event: "create_community", targetType: "community", targetId: c.slug, metadata: { name: c.name }, createdAt: T(intBetween(10, 60)) });
}

// ---------------------------------------------------------------- posts -------
const userPostCount = {};
const userCommentCount = {};
const userKarma = {};
const bump = (map, uid, by = 1) => (map[uid] = (map[uid] || 0) + by);

const ACCEPTABLE = {
	general: [
		["First time here — hi 🌿", "Found this app through a friend. Loving how calm it is compared to other forums. How long have you all been tracking?"],
		["What helped you start tracking?", "I kept forgetting. What finally made it stick for you — an app, a journal, a habit?"],
		["Small win: 3 months of consistent logging", "Just wanted to share a tiny victory. Three months in a row. Feeling proud."],
		["Favorite cozy period rituals?", "Heating pad + chamomile + an early night is my go-to. What are yours?"],
	],
	"cycle-questions": [
		["Is a 26-day cycle normal?", "Mine has been 26 days for a few months. Curious how common that is for others."],
		["Cycle length changing with the seasons?", "I swear my cycle gets a little shorter in winter. Anyone else notice a seasonal pattern?"],
		["How do you track ovulation gently?", "I don’t want to get obsessive about it. What’s a low-pressure way to notice ovulation signs?"],
		["Spotting mid-cycle — when to ask a doctor?", "Light spotting around day 14 a couple of times. Sharing experiences only — when did you decide to check in with a clinician?"],
	],
	symptoms: [
		["Cramps that move to my back — anyone?", "My cramps sometimes settle in my lower back. Curious if others feel that and what eases it (no diagnosing, just sharing)."],
		["Energy dip the week before — tips?", "The week before my period my energy tanks. Gentle movement helps me a bit. What works for you?"],
		["Tracking mood alongside symptoms", "I started noting mood + symptoms together and the patterns are eye-opening. Anyone else do this?"],
		["Headaches around my period", "Sharing experiences: I get a mild headache day 1. Hydration and rest help me most."],
	],
	"privacy-app-feedback": [
		["Love that it’s local-first", "The fact that my data stays on my phone is the whole reason I switched. Thank you for building it this way."],
		["Feature idea: gentle reminders", "Would love an optional, quiet reminder to log — nothing naggy. Anyone else want this?"],
		["The widgets are lovely", "Just a quick note of appreciation for the home-screen widget. Calm and clear."],
	],
	"educational-discussion": [
		["Plain-language explainer: the follicular phase", "Sharing a calm, non-alarmist summary I found helpful about the follicular phase. Sources matter — always check with your clinician."],
		["Iron and your cycle (general info)", "General, non-prescriptive note on iron and periods. Please check with a professional before any supplement."],
		["Understanding luteal phase length", "A gentle overview of why luteal phase length matters when tracking."],
	],
	support: [
		["Rough month — just need to vent", "Nothing dramatic, just a heavy week. Grateful this space exists."],
		["Thank you to this community", "The kindness here genuinely helps. Just wanted to say it out loud."],
		["Feeling discouraged about tracking", "I fell off for a while and felt like a failure. Reading your posts helped me start again."],
	],
	"pcos-support": [
		["Newly diagnosed with PCOS", "Just got the diagnosis and feeling a lot of things. Gentle advice or just solidarity welcome."],
		["What helped your PCOS symptoms?", "Sharing experiences only — what lifestyle changes felt kind and sustainable for you?"],
	],
	ttc: [
		["Month 4 of TTC", "Trying to stay hopeful and gentle with myself. How do you keep the pressure low?"],
		["Tracking basal temperature — worth it?", "Curious whether BBT tracking helped you, without making it stressful."],
	],
	perimenopause: [
		["Cycles getting unpredictable", "Mid-40s and my cycle is all over the place. Reassuring to know I’m not alone."],
		["Sleep + perimenopause", "Sleep has gotten lighter. Sharing what’s helped me wind down."],
	],
	"endo-warriors": [
		["Heat is my best friend", "On bad days, a heat patch under my clothes gets me through. Solidarity to everyone hurting today."],
		["How do you explain endo to people?", "Struggling to describe the pain to friends. How do you put it into words?"],
	],
	"cycle-and-sleep": [
		["My sleep shifts before my period", "I sleep lighter the few nights before. Anyone track this together?"],
		["Wind-down routine that helps", "Warm shower, no screens, herbal tea. Curious what your routine looks like."],
	],
};

const postIds = []; // active post ids for comments/reports
const allPostMeta = {}; // id -> {communityId, authorUid}
let postSeq = 0; // monotonic — unique id for every post (active OR not)

function createPost({ author, community, title, body, status = "active", state = "auto_approved", flags = [], severity = "none", score = null, daysAgo, enqueue = false, tier2 = null }) {
	const id = `dw-post-${String(++postSeq).padStart(3, "0")}`;
	const sc = score ?? intBetween(0, 180);
	const created = ms(daysAgo ?? intBetween(0, 30), intBetween(0, 23));
	const a = author;
	W(db.collection("posts").doc(id), {
		authorId: a.uid, authorUsername: a.username, ...badgeOf(a),
		communityId: community, title, body, tags: [],
		score: status === "active" ? sc : Math.max(0, Math.floor(sc / 4)),
		upvoteCount: status === "active" ? sc + intBetween(0, 12) : 0,
		downvoteCount: intBetween(0, 6), commentCount: 0,
		hotRank: hotRank(status === "active" ? sc : 0, created),
		status,
		moderation: { state, score: severity === "high" ? 0.92 : severity === "low" ? 0.5 : 0.05, severity, flags, safeConfidence: tier2?.safeConfidence ?? null },
		locked: false, edited: false, createdAt: Timestamp.fromMillis(created), updatedAt: Timestamp.fromMillis(created),
	});
	allPostMeta[id] = { communityId: community, authorUid: a.uid, authorUsername: a.username, created };
	if (status === "active") {
		postIds.push(id);
		communityPostCount[community]++;
		bump(userPostCount, a.uid);
		bump(userKarma, a.uid, sc);
	}
	if (enqueue) {
		W(db.collection("moderationQueue").doc(), {
			contentType: "post", contentId: id, communityId: community, postId: id,
			authorId: a.uid, authorUsername: a.username, excerpt: `${title} ${body}`.slice(0, 160),
			state, tier1: { score: severity === "high" ? 0.92 : 0.5, severity, flags }, tier2,
			decidedBy: state === "auto_approved" ? "system" : state === "ai_approved" ? "ai" : byName.gentleheron.uid,
			reason: status === "removed" ? "Removed: breaks the Community Guidelines" : null,
			createdAt: Timestamp.fromMillis(created), decidedAt: state.startsWith("human") ? Timestamp.fromMillis(created + 36e5) : null,
		});
	}
	return id;
}

// Acceptable posts — spread across all communities.
for (const [slug, list] of Object.entries(ACCEPTABLE)) {
	for (const [title, body] of list) {
		const author = pick(GOOD);
		createPost({ author, community: slug, title, body, daysAgo: intBetween(0, 28) });
	}
}
// A few more acceptable posts to push past ~70, authored by experts too (nice badges in-feed).
const experts = ["Dr_Maya", "Nurse_Priya", "Dr_Elena", "Midwife_Rosa", "RedSchool", "PeriodPositive"].map((n) => byName[n]);
const expertPosts = [
	["cycle-questions", "Gentle note: ‘normal’ is a range", "From a clinician’s view — cycle length 21–35 days is common. Sharing general info; your own clinician knows your history best."],
	["educational-discussion", "Why tracking symptoms helps your doctor", "When you bring patterns to an appointment, it helps us help you. A few notes go a long way."],
	["pcos-support", "PCOS is a spectrum", "General info: PCOS looks different for everyone. Be gentle with comparisons. Happy to point to reputable sources."],
	["endo-warriors", "Pain that disrupts life deserves care", "If pain is stopping you from living, it’s worth raising with a clinician. You deserve to be heard."],
	["educational-discussion", "Hydration, iron, and energy", "General, non-prescriptive note: low energy around your period can have many causes. Please don’t start supplements without checking in."],
];
for (const [slug, title, body] of expertPosts) createPost({ author: pick(experts), community: slug, title, body, score: intBetween(40, 230), daysAgo: intBetween(0, 20) });

// Extra acceptable posts so every Circle feels active (varied titles/bodies).
const GENERIC_TITLES = [
	"A small thing that helped this month",
	"Question for the gentle hive mind",
	"Anyone else notice this?",
	"Trying something new with my routine",
	"What I wish I knew when I started",
	"Checking in 🌙",
	"A win worth sharing",
	"How do you stay consistent?",
	"Reassurance appreciated",
	"Curious about your experience",
	"Sharing in case it helps someone",
	"Gentle question about tracking",
	"My go-to comfort on hard days",
	"Slow morning kind of day",
	"Grateful for this calm corner",
];
const GENERIC_BODIES = [
	"Nothing dramatic — just wanted to share and hear how others handle it. Sharing experiences only, not advice.",
	"I’ve been paying closer attention lately and noticing patterns I never saw before. Anyone relate?",
	"Be gentle with me, still new to all this. What worked for you without becoming stressful?",
	"Some months are smooth, some aren’t. Today’s a good one and I wanted to put that into the world.",
	"Tea, an early night, and logging before bed has become my little ritual. What’s yours?",
	"Reading this community has genuinely made me kinder to myself. Thank you all.",
	"If you’re having a hard day, this is your gentle reminder to rest. 🌿",
	"Tried tracking my mood alongside symptoms and it’s been quietly eye-opening.",
];
for (const c of allCommunities) {
	const target = intBetween(6, 11); // posts per circle
	const have = communityPostCount[c.slug];
	for (let k = have; k < target; k++) {
		const roll = rnd();
		const author = roll > 0.85 ? pick(experts) : pick(GOOD);
		createPost({
			author, community: c.slug,
			title: pick(GENERIC_TITLES), body: pick(GENERIC_BODIES),
			score: intBetween(0, 160), daysAgo: intBetween(0, 30),
		});
	}
}

// ---- Unacceptable / rule-breaking posts (various states) --------------------
const removedAuthor = () => pick([byName.spammyvibes, byName.pushyseller, byName.loudtroll, byName.misinfomara]);
const problem = [
	// REMOVED (taken down by a human)
	{ community: "general", title: "🔥 BUY FOLLOWERS + CHEAP MIRACLE TEA 🔥", body: "DM me to buy now!! Detox tea cures cramps INSTANTLY, limited offer, click my profile link link link!!!", author: "spammyvibes", status: "removed", state: "human_removed", flags: ["spam", "solicitation", "excessive_links"], severity: "high", report: true },
	{ community: "symptoms", title: "Stop taking your prescribed medication", body: "Doctors lie. Just drink this and quit your meds, it healed me completely, trust me not them.", author: "misinfomara", status: "removed", state: "human_removed", flags: ["medical_misinfo"], severity: "high", report: true },
	{ community: "support", title: "you’re all pathetic", body: "honestly this place is full of losers, nobody cares about your stupid cramps lmao", author: "loudtroll", status: "removed", state: "human_removed", flags: ["abuse", "harassment"], severity: "high", report: true },
	{ community: "general", title: "Make $$$ from home — cycle coaching scheme", body: "Join my downline, pay $99 to start, recruit 5 friends. Guaranteed income!!! contact 555-0199.", author: "pushyseller", status: "removed", state: "human_removed", flags: ["spam", "solicitation", "contact_info"], severity: "high", report: true },
	// PENDING — held by AI, awaiting a human (hidden from the feed)
	{ community: "cycle-questions", title: "Is it normal to bleed for 14 days??", body: "Asking because someone told me to take a huge dose of an herbal supplement to stop it. Should I?", author: "anon_member", status: "pending", state: "awaiting_human", flags: ["medical_misinfo"], severity: "low", tier2: { safeConfidence: 0.62, decision: "human", usedAI: true } },
	{ community: "general", title: "check out my shop", body: "not spam i promise but here’s my link and discount code CYCLE10, dm for more, also my phone is 555-2020", author: "pushyseller", status: "pending", state: "awaiting_human", flags: ["solicitation", "contact_info"], severity: "low", tier2: { safeConfidence: 0.55, decision: "human", usedAI: true } },
	{ community: "support", title: "I don’t want to be here anymore", body: "Everything feels heavy and I don’t see the point lately. I just needed to say it somewhere.", author: "anon_member", status: "pending", state: "awaiting_human", flags: ["self_harm"], severity: "high", tier2: { safeConfidence: 0.2, decision: "human", usedAI: true }, crisis: true },
];
const problemIds = [];
for (const p of problem) {
	const author = byName[p.author] ?? removedAuthor();
	const id = createPost({
		author, community: p.community, title: p.title, body: p.body, status: p.status, state: p.state,
		flags: p.flags, severity: p.severity, score: p.status === "removed" ? intBetween(0, 3) : 0,
		daysAgo: intBetween(0, 6), enqueue: true, tier2: p.tier2 ?? null,
	});
	problemIds.push({ id, ...p, authorUid: author.uid });
	if (p.report) {
		W(db.collection("reports").doc(), {
			reporterId: pick(GOOD).uid, targetType: "post", targetId: id, reason: p.flags[0] === "medical_misinfo" ? "medical_misinfo" : p.flags[0] === "abuse" || p.flags[0] === "harassment" ? "harassment" : "spam",
			details: "Auto-seeded report for review.", status: "resolved", resolution: "Removed", handledBy: byName.gentleheron.uid,
			createdAt: T(intBetween(1, 5)), updatedAt: T(intBetween(0, 1)),
		});
		W(db.collection("moderationActions").doc(), {
			actorId: byName.gentleheron.uid, actionType: "remove_post", targetType: "post", targetId: id,
			communityId: p.community, reason: "Breaks the Community Guidelines", relatedReportId: null, metadata: {}, createdAt: T(intBetween(0, 1)),
		});
	}
	if (p.crisis) {
		// Supportive, non-punitive notification to the author (mirrors the real pipeline).
		W(db.collection("notifications").doc(), {
			recipientId: author.uid, type: "mod_action", title: "We’re here with you",
			body: "Thank you for sharing. A person will read this with care. If you’re in immediate danger, please contact a local helpline — in the U.S. call or text 988.",
			link: "/guidelines", actorId: null, actorUsername: null, read: false, createdAt: T(0, 2),
		});
	}
}

// ---- A few OPEN reports on otherwise-active content (so the queue isn’t empty)
for (let i = 0; i < 6; i++) {
	const pid = pick(postIds);
	W(db.collection("reports").doc(), {
		reporterId: pick(GOOD).uid, targetType: "post", targetId: pid,
		reason: pick(["spam", "off_topic", "medical_misinfo", "harassment", "other"]),
		details: pick(["Not sure this belongs here.", "Felt a bit off.", "Possible misinformation?", "Seems like an ad."]),
		status: "open", resolution: null, handledBy: null, createdAt: T(intBetween(0, 4)), updatedAt: T(intBetween(0, 4)),
	});
}

// --------------------------------------------------------------- comments -----
const NICE_COMMENTS = [
	"This resonates so much. Thank you for sharing 🌿",
	"You’re not alone in this — sending warmth.",
	"I track mine the same way! Glad it’s not just me.",
	"Gentle reminder to be kind to yourself today.",
	"Mine is similar. Definitely worth mentioning to your clinician if it worries you.",
	"Heating pad gang 🙌",
	"Thank you for putting words to this.",
	"Saving this. Really helpful, calmly put.",
	"Solidarity. Today was a hard one for me too.",
	"Love this community.",
	"Oof, felt this. Thank you for being honest.",
	"Adding a heating pad to my cart right now 😅",
	"This is such a kind way to put it.",
	"Came here to say exactly this.",
	"Bookmarking. Thank you for sharing so gently.",
	"Sending you a quiet bit of strength today.",
];
const EXPERT_COMMENTS = [
	"General info only: a range here is common, but your own clinician knows your history best. 💛",
	"Lovely to see people sharing gently. If pain disrupts daily life, it’s worth raising with a professional.",
	"Great question — patterns like this are exactly what’s useful to bring to an appointment.",
];
let commentCount = 0;
const postCommentCount = {}; // postId -> # active comments (mirrors createComment's counter increment)
const commentReplyCount = {}; // parentCommentId -> # active direct replies
const commentRefById = {}; // commentId -> Firestore ref (to patch replyCount at the end)
function addComment(postId, author, body, { parent = null, status = "active", state = "auto_approved", flags = [], severity = "none", depth = 0, daysAgo, enqueue = false } = {}) {
	const id = `dw-cmt-${String(++commentCount).padStart(3, "0")}`;
	const meta = allPostMeta[postId];
	const created = ms(daysAgo ?? intBetween(0, 20), intBetween(0, 23));
	const sc = status === "active" ? intBetween(0, 40) : 0;
	const ref = db.collection("comments").doc(id);
	commentRefById[id] = ref;
	W(ref, {
		postId, parentCommentId: parent, communityId: meta.communityId,
		authorId: author.uid, authorUsername: author.username, ...badgeOf(author),
		body, depth, score: sc, upvoteCount: sc + intBetween(0, 5), downvoteCount: intBetween(0, 3), replyCount: 0,
		status, moderation: { state, score: severity === "high" ? 0.9 : 0.05, severity, flags, safeConfidence: null },
		edited: false, createdAt: Timestamp.fromMillis(created), updatedAt: Timestamp.fromMillis(created),
	});
	if (status === "active") {
		// Mirror the real createComment transaction: bump the post's commentCount and
		// the parent comment's replyCount so the feed shows the true number.
		bump(postCommentCount, postId);
		if (parent) bump(commentReplyCount, parent);
		bump(userCommentCount, author.uid);
		bump(userKarma, author.uid, sc);
	}
	if (enqueue) {
		W(db.collection("moderationQueue").doc(), {
			contentType: "comment", contentId: id, communityId: meta.communityId, postId,
			authorId: author.uid, authorUsername: author.username, excerpt: body.slice(0, 160),
			state, tier1: { score: severity === "high" ? 0.9 : 0.5, severity, flags }, tier2: null,
			decidedBy: state.startsWith("human") ? byName.quietbrook.uid : state === "ai_approved" ? "ai" : "system",
			reason: status === "removed" ? "Removed: breaks the Community Guidelines" : null,
			createdAt: Timestamp.fromMillis(created), decidedAt: state.startsWith("human") ? Timestamp.fromMillis(created + 18e5) : null,
		});
	}
	return id;
}

// Comment on most active posts; thread a few; let experts chime in.
let activeCommentTotal = 0;
for (const pid of postIds) {
	if (rnd() > 0.85) continue;
	const k = intBetween(1, 5);
	let lastId = null;
	for (let j = 0; j < k; j++) {
		const expert = rnd() > 0.82;
		const author = expert ? pick(experts) : pick(GOOD);
		const body = expert ? pick(EXPERT_COMMENTS) : pick(NICE_COMMENTS);
		const parent = j > 0 && lastId && rnd() > 0.45 ? lastId : null;
		lastId = addComment(pid, author, body, { parent, depth: parent ? 1 : 0, daysAgo: intBetween(0, 18) });
		activeCommentTotal++;
	}
}
// A couple of rule-breaking comments (removed + pending) with queue entries.
if (postIds.length) {
	addComment(pick(postIds), byName.loudtroll, "nobody asked, this is so dumb 🙄", { status: "removed", state: "human_removed", flags: ["abuse"], severity: "high", daysAgo: 2, enqueue: true });
	addComment(pick(postIds), byName.pushyseller, "buy my tea!! link in bio, discount CYCLE10", { status: "removed", state: "human_removed", flags: ["spam", "solicitation"], severity: "high", daysAgo: 3, enqueue: true });
	addComment(pick(postIds), byName.anon_member, "is it safe to take 5x the dose? someone said it works", { status: "pending", state: "awaiting_human", flags: ["medical_misinfo"], severity: "low", daysAgo: 1, enqueue: true });
}

// --------------------------------------------------- strikes & suspensions ----
function seedStrikes(username, { active, total, needsReview, reasonList }) {
	const a = byName[username];
	const strikesCol = db.collection("users").doc(a.uid).collection("strikes");
	for (let i = 0; i < active; i++) {
		const createdMs = ms(intBetween(2, 40));
		W(strikesCol.doc(`s${i + 1}`), {
			reason: reasonList[i % reasonList.length], contentType: "post", contentId: `dw-removed-ref-${i}`,
			communityId: "general", actorId: byName.gentleheron.uid,
			createdAt: Timestamp.fromMillis(createdMs), createdAtMs: createdMs, expiresAtMs: createdMs + 90 * 864e5, active: true,
		});
	}
	W(db.collection("userModeration").doc(a.uid), {
		strikeCount: active, strikeTotal: total, needsAdminReview: needsReview,
		lastReason: reasonList[reasonList.length - 1], lastStrikeAt: T(intBetween(1, 5)), updatedAt: T(1),
	});
}
seedStrikes("pushyseller", { active: 2, total: 2, needsReview: false, reasonList: ["Spam / solicitation", "Repeated self-promotion"] });
seedStrikes("misinfomara", { active: 3, total: 3, needsReview: true, reasonList: ["Medical misinformation", "Unsafe advice", "Telling others to stop meds"] });
seedStrikes("loudtroll", { active: 5, total: 6, needsReview: true, reasonList: ["Harassment", "Abuse", "Harassment", "Abuse", "Repeated abuse"] });
seedStrikes("spammyvibes", { active: 4, total: 4, needsReview: false, reasonList: ["Spam ring", "Excessive links", "Solicitation", "Spam"] });

// Suspensions / ban records + audit
W(db.collection("bans").doc(), { uid: byName.spammyvibes.uid, scope: "global", reason: "Coordinated spam / solicitation", bannedBy: byName.calmfox.uid, expiresAt: null, active: true, createdAt: T(3) });
W(db.collection("moderationActions").doc(), { actorId: byName.calmfox.uid, actionType: "ban_user", targetType: "user", targetId: byName.spammyvibes.uid, communityId: null, reason: "Spam ring", relatedReportId: null, metadata: { permanent: true }, createdAt: T(3) });
W(db.collection("moderationActions").doc(), { actorId: byName.gentleheron.uid, actionType: "suspend_user", targetType: "user", targetId: byName.pushyseller.uid, communityId: null, reason: "Repeated self-promotion", relatedReportId: null, metadata: { durationHours: 24 }, createdAt: T(1) });
W(db.collection("auditLogs").doc(), { actorId: byName.TheCycleVault.uid, event: "grant_badge", targetType: "user", targetId: byName.Dr_Maya.uid, metadata: { badge: "clinician", grant: true }, createdAt: T(20) });
W(db.collection("auditLogs").doc(), { actorId: byName.calmfox.uid, event: "ban_user", targetType: "user", targetId: byName.spammyvibes.uid, metadata: { permanent: true }, createdAt: T(3) });

// --------------------------------------------------------- announcement -------
W(db.collection("settings").doc("global"), {
	announcement: { title: "Welcome 🌿", body: "We just opened Circles and a calm little Shop. Have a look around — and thank you for being here.", level: "info", id: now.toString(36), updatedAt: T(0, 1) },
	updatedAt: T(0, 1), updatedBy: byName.TheCycleVault.uid,
});

// ------------------------------------------------------ sponsored products ----
const PRODUCTS = [
	["Organic Cotton Pads", "Plant-based, fragrance-free pads in plastic-free packaging. A gentle everyday option.", "period-care", "Loomi", true],
	["Reusable Period Underwear", "Leak-resistant, soft, and washable. Sized inclusively.", "period-care", "Loomi", true],
	["Menstrual Cup (medical silicone)", "A no-waste option that can last years. Two sizes.", "period-care", "Lunette", true],
	["Reusable Heat Patch", "Low-profile warming patches for cramps you can wear under clothes. Rechargeable.", "wellness", "Glow", true],
	["Magnesium Glycinate", "Gentle on the stomach. Always check with your clinician before supplements.", "supplements", "Pure Co.", true],
	["Gentle Iron + Vitamin C", "Easy-on-the-stomach iron. Please consult a professional before starting.", "supplements", "Pure Co.", true],
	["“Understanding Your Cycle” (Book)", "A plain-language, non-alarmist guide written by an OB-GYN.", "books", "Calm Press", true],
	["“Period Power” (Book)", "An accessible, evidence-based look at hormones and cycles.", "books", "Calm Press", true],
	["BBT Thermometer", "Two-decimal basal thermometer for gentle ovulation tracking.", "tools", "Tempo", true],
	["Cramp-Relief TENS Device", "Drug-free, wearable pulse relief. Not a medical device claim — comfort only.", "tools", "Glow", true],
	["Herbal Cycle Tea (caffeine-free)", "A soothing blend for winding down. Comfort, not a cure.", "wellness", "Steep", true],
	["Sustainable Period Kit", "Starter kit: cup + 2 underwear + pouch. Plastic-free.", "femtech", "Loomi", false], // paused
];
PRODUCTS.forEach(([name, blurb, category, sponsor, active], i) => {
	W(db.collection("sponsoredProducts").doc(`dw-prod-${String(i + 1).padStart(2, "0")}`), {
		name, blurb, imageUrl: null, url: `https://example.com/${category}/${i + 1}`, category, sponsor,
		active, clickCount: intBetween(0, active ? 240 : 0), createdAt: T(intBetween(5, 40)), updatedAt: T(1),
	});
});

// --------------------------------------------------------- notifications ------
for (const who of [byName.TheCycleVault, byName.calmfox, byName.Dr_Maya]) {
	W(db.collection("notifications").doc(), { recipientId: who.uid, type: "system", title: "Welcome to the team view", body: "You can review reports, held content, strikes, and the Shop from the Admin area.", link: "/admin", actorId: null, actorUsername: null, read: false, createdAt: T(0, 3) });
}
W(db.collection("notifications").doc(), { recipientId: byName.calmfox.uid, type: "mod_action", title: "New items awaiting review", body: "A few posts are held for a human look.", link: "/admin", actorId: null, actorUsername: null, read: false, createdAt: T(0, 1) });

// ------------------------------------------------------------ user docs -------
for (const a of accounts) {
	const doc = {
		uid: a.uid, username: a.username, usernameLower: a.usernameLower,
		displayName: a.displayName, avatarUrl: null, bio: a.bio,
		role: a.role, status: a.status,
		karma: userKarma[a.uid] || 0, postCount: userPostCount[a.uid] || 0, commentCount: userCommentCount[a.uid] || 0,
		moderatorOf: a.moderatorOf || [], suspendedUntil: a.suspendedUntil ?? null,
		acceptedTermsVersion: "2026-06-27", createdAt: T(intBetween(5, 200)), updatedAt: T(intBetween(0, 4)),
	};
	if (a.badges?.length) doc.badges = a.badges;
	if (a.supporter) {
		doc.supporter = true;
		doc.supporterSince = a.supporterSince ? Timestamp.fromMillis(a.supporterSince) : T(60);
	}
	W(db.collection("users").doc(a.uid), doc);
	W(db.collection("usernames").doc(a.usernameLower), { uid: a.uid, username: a.username, createdAt: T(60) });
}
// Apply community post counts.
for (const [slug, count] of Object.entries(communityPostCount)) {
	W(db.collection("communities").doc(slug), { postCount: count });
}
// Apply per-post comment counts (the bug fix: posts must reflect their comments).
for (const [pid, count] of Object.entries(postCommentCount)) {
	W(db.collection("posts").doc(pid), { commentCount: count });
}
// Apply per-comment reply counts.
for (const [cid, count] of Object.entries(commentReplyCount)) {
	if (commentRefById[cid]) W(commentRefById[cid], { replyCount: count });
}

// =============================================================== execute ======
async function clearAuth() {
	let pageToken;
	do {
		const res = await auth.listUsers(1000, pageToken);
		const uids = res.users.map((u) => u.uid);
		if (uids.length) await auth.deleteUsers(uids);
		pageToken = res.pageToken;
	} while (pageToken);
}
async function clearFirestore() {
	const cols = ["users", "usernames", "communities", "posts", "comments", "votes", "reports", "moderationActions", "notifications", "auditLogs", "bans", "moderationQueue", "userModeration", "sponsoredProducts", "settings", "rateLimits"];
	for (const c of cols) await db.recursiveDelete(db.collection(c));
}
async function createAuthUsers() {
	let done = 0;
	for (const a of accounts) {
		try {
			await auth.createUser({ uid: a.uid, email: a.email, emailVerified: true, password: a.password, displayName: a.displayName ?? a.username });
		} catch (e) {
			if (["auth/uid-already-exists", "auth/email-already-exists"].includes(e.code)) {
				await auth.updateUser(a.uid, { email: a.email, emailVerified: true, password: a.password, displayName: a.displayName ?? a.username });
			} else throw e;
		}
		if (++done % 25 === 0) console.log(`  …created ${done}/${accounts.length} auth users`);
	}
}

function writeCredentialsFile() {
	const here = dirname(fileURLToPath(import.meta.url));
	const out = resolve(here, "..", "..", "DEMO_ACCOUNTS.md");
	const rows = accounts.map((a, i) => {
		const badges = [a.supporter ? (a.badges.includes("founding_supporter") ? "Founding Supporter" : "Supporter") : null, a.badges.includes("clinician") ? "Verified Clinician" : null, a.badges.includes("org") ? "Verified org" : null].filter(Boolean).join(", ");
		return `| ${i + 1} | \`${a.username}\` | ${a.email} | ${a.role} | ${badges || "—"} | ${a.status} | ${a.note || ""} |`;
	});
	const md = `# The CycleVault Social — Demo Accounts (LOCAL EMULATOR ONLY)

> Seeded by \`functions/scripts/seedDemoWorld.mjs\`. **Every account shares the same password.**
> This data lives only in the Firebase **emulator** and resets when you stop it — just re-run the seed.

## 🔑 Password for ALL accounts

\`\`\`
${SHARED_PASSWORD}
\`\`\`

## How to sign in / access admin

1. Make sure the emulators + web dev server are running, then open **http://localhost:5173**.
2. Click **Sign in** and use any email below with the shared password.
3. For the **Admin** area, sign in as \`TheCycleVault\` (superadmin) or \`calmfox\` (admin), then go to **http://localhost:5173/admin**. Moderators (\`gentleheron\`, \`quietbrook\`, \`kindmarlow\`) get **http://localhost:5173/mod**.
4. As an admin you’ll also see a **Member view ⇄ Admin view** toggle in the top bar — switch to **Admin view** to see deleted/removed content inline with moderation details.

## Quick picks

| Purpose | Username | Email |
| --- | --- | --- |
| Superadmin (everything) | \`TheCycleVault\` | team@cyclevault.test |
| Admin (easy login) | \`calmfox\` | admin@example.com |
| Moderator | \`gentleheron\` | gentleheron@example.test |
| Verified Clinician | \`Dr_Maya\` | dr_maya@example.test |
| Verified org | \`RedSchool\` | redschool@example.test |
| Founding Supporter | \`quietwillow\` | quietwillow@example.test |
| Banned (see in moderation) | \`spammyvibes\` | spammyvibes@example.test |
| Flagged for review (strikes) | \`loudtroll\` | loudtroll@example.test |

## All ${accounts.length} accounts

| # | Username | Email | Role | Badges | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}
`;
	writeFileSync(out, md, "utf8");
	return out;
}

async function run() {
	console.log("⚠️  EMULATOR reset + reseed starting…");
	console.log("Clearing Auth + Firestore (emulator)…");
	await clearAuth();
	await clearFirestore();
	console.log(`Creating ${accounts.length} Auth users…`);
	await createAuthUsers();
	console.log(`Writing ${writes.length} Firestore docs…`);
	await flush();
	const file = writeCredentialsFile();
	const counts = {
		accounts: accounts.length,
		communities: allCommunities.length,
		activePosts: postIds.length,
		problematicPosts: problemIds.length,
		comments: commentCount,
		products: PRODUCTS.length,
	};
	console.log("\n✅ Demo world seeded into the EMULATOR.");
	console.table(counts);
	console.log(`\n🔑 Shared password for every account: ${SHARED_PASSWORD}`);
	console.log(`📄 Full credentials table written to: ${file}`);
	console.log("\nOpen http://localhost:5173 and sign in. Admin: TheCycleVault / calmfox → /admin\n");
}

run().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});
