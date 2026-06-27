/**
 * Content moderation engine (docs/MODERATION_AI.md).
 *
 * Tier 1 (analyzeContent): deterministic heuristic screen — risk score, severity,
 * and flags. Tier 2 (assessSafety): confidence the content is safe; ≥ 0.90 → auto
 * publish, else route to a human. Tier 2 is pluggable: if MODERATION_AI_KEY is set
 * it calls a real moderation model, otherwise a refined heuristic runs.
 *
 * Pure functions are exported for unit testing; no Firestore here.
 */

export type Severity = "none" | "low" | "high";

export interface Tier1Result {
	score: number; // 0 (benign) .. 1 (clearly bad)
	severity: Severity;
	flags: string[];
}

export interface Tier2Result {
	safeConfidence: number; // 0 .. 1
	decision: "auto" | "human";
	usedAI: boolean;
}

const URL_RE = /\bhttps?:\/\/|www\.[^\s]+|\b[\w-]+\.(?:com|net|org|io|co|shop|store|xyz|info)\b/gi;
const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;
const PHONE_RE = /(?:\+?\d[\s-]?){7,}/g;

// Minimal, extensible signal lists. Kept conservative to avoid over-flagging a
// supportive health community where frank language about bodies is normal.
const SPAM_PHRASES = [
	"buy now",
	"click here",
	"limited time",
	"act now",
	"free money",
	"make money",
	"earn $",
	"discount code",
	"promo code",
	"crypto",
	"bitcoin",
	"casino",
	"forex",
	"investment opportunity",
	"work from home",
	"dm me",
	"message me to buy",
	"follow my",
	"check out my shop",
];

const SOLICITATION_PHRASES = ["venmo", "cashapp", "paypal.me", "onlyfans", "telegram @", "whatsapp +"];

// Strong abuse markers (not exhaustive; real slur lists are loaded server-side).
const ABUSE_PHRASES = ["kill yourself", "kys", "you should die", "worthless", "retard"];

const SELF_HARM_PHRASES = [
	"kill myself",
	"want to die",
	"end my life",
	"end it all",
	"suicidal",
	"suicide",
	"self harm",
	"self-harm",
	"hurt myself",
	"cut myself",
	"no reason to live",
	"better off dead",
];

const MISINFO_PHRASES = [
	"miracle cure",
	"cure cancer",
	"cures cancer",
	"stop taking your",
	"don't see a doctor",
	"doctors are lying",
	"detox your womb",
	"natural cure for",
	"guaranteed to cure",
	"reverse infertility overnight",
	"flush out toxins",
];

function countMatches(text: string, re: RegExp): number {
	const m = text.match(re);
	return m ? m.length : 0;
}

function includesAny(haystack: string, needles: string[]): string[] {
	return needles.filter((n) => haystack.includes(n));
}

/**
 * Tier 1 — heuristic screen. Returns a risk score, severity, and human-readable
 * flags. Severity 'high' (self-harm/abuse/strong misinfo) always routes to a
 * human regardless of score.
 */
export function analyzeContent(rawTitle: string, rawBody: string): Tier1Result {
	const text = `${rawTitle}\n${rawBody}`;
	const lower = text.toLowerCase();
	const flags: string[] = [];
	let score = 0;
	let severity: Severity = "none";

	// High-severity categories.
	const selfHarm = includesAny(lower, SELF_HARM_PHRASES);
	if (selfHarm.length > 0) {
		flags.push("self_harm");
		severity = "high";
		score = Math.max(score, 0.8);
	}
	const abuse = includesAny(lower, ABUSE_PHRASES);
	if (abuse.length > 0) {
		flags.push("abuse");
		severity = "high";
		score = Math.max(score, 0.85);
	}
	const misinfo = includesAny(lower, MISINFO_PHRASES);
	if (misinfo.length > 0) {
		flags.push("medical_misinfo");
		severity = severity === "high" ? "high" : "high";
		score = Math.max(score, 0.7);
	}

	// Spam / solicitation.
	const links = countMatches(text, URL_RE);
	const emails = countMatches(text, EMAIL_RE);
	const phones = countMatches(text, PHONE_RE);
	if (links >= 3) {
		flags.push("excessive_links");
		score += 0.3;
	} else if (links > 0) {
		score += 0.08;
	}
	if (emails > 0 || phones > 0) {
		flags.push("contact_info");
		score += 0.25;
	}
	const spam = includesAny(lower, SPAM_PHRASES);
	if (spam.length > 0) {
		flags.push("spam");
		score += 0.2 + 0.1 * Math.min(spam.length, 3);
	}
	const solicit = includesAny(lower, SOLICITATION_PHRASES);
	if (solicit.length > 0) {
		flags.push("solicitation");
		score += 0.3;
	}

	// Low-weight quality signals.
	const letters = text.replace(/[^a-zA-Z]/g, "");
	if (letters.length >= 20) {
		const caps = text.replace(/[^A-Z]/g, "").length;
		if (caps / letters.length > 0.6) {
			flags.push("shouting");
			score += 0.05;
		}
	}
	if (/(.)\1{6,}/.test(text) || /\b(\w+)\b(?:\s+\1\b){4,}/i.test(text)) {
		flags.push("repetition");
		score += 0.05;
	}

	score = Math.min(1, score);
	if (severity === "none" && score >= 0.5) severity = "low";

	return { score, severity, flags };
}

/** Whether Tier 1 considers the content clean enough to publish without review. */
export function isClean(t1: Tier1Result): boolean {
	return t1.severity === "none" && t1.score < 0.25 && t1.flags.length === 0;
}

/**
 * Tier 2 — assess how confident we are the (flagged) content is actually safe.
 * If MODERATION_AI_KEY is configured, defer to a real model; otherwise use a
 * refined heuristic. Fails safe (routes to human) on any uncertainty/error.
 */
export async function assessSafety(rawTitle: string, rawBody: string, t1: Tier1Result): Promise<Tier2Result> {
	// Optional real-AI path (drop-in; off until a key is provisioned).
	if (process.env.MODERATION_AI_KEY) {
		try {
			const ai = await reviewWithExternalAI(`${rawTitle}\n${rawBody}`);
			return { safeConfidence: ai, decision: ai >= 0.9 ? "auto" : "human", usedAI: true };
		} catch {
			// Fail safe: uncertainty → human.
			return { safeConfidence: 0, decision: "human", usedAI: false };
		}
	}

	// Heuristic Tier 2: start from inverse risk, then never auto-clear high severity.
	let safe = 1 - t1.score;
	if (t1.severity === "high") safe = Math.min(safe, 0.4);
	// Multiple distinct flags lower confidence further.
	if (t1.flags.length >= 2) safe -= 0.2;
	safe = Math.max(0, Math.min(1, safe));

	return { safeConfidence: safe, decision: safe >= 0.9 ? "auto" : "human", usedAI: false };
}

/**
 * Optional external moderation call. Returns a "safe confidence" 0..1.
 * Implemented for OpenAI's Moderation endpoint shape; only used when
 * MODERATION_AI_KEY is set. Kept minimal + dependency-free (uses fetch).
 */
async function reviewWithExternalAI(text: string): Promise<number> {
	const res = await fetch("https://api.openai.com/v1/moderations", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${process.env.MODERATION_AI_KEY}`,
		},
		body: JSON.stringify({ model: "omni-moderation-latest", input: text.slice(0, 4000) }),
	});
	if (!res.ok) throw new Error(`moderation api ${res.status}`);
	const data = (await res.json()) as {
		results?: Array<{ flagged?: boolean; category_scores?: Record<string, number> }>;
	};
	const r = data.results?.[0];
	if (!r) throw new Error("no moderation result");
	// Highest category score = risk; safe confidence is its inverse.
	const maxScore = Math.max(0, ...Object.values(r.category_scores ?? { x: 0 }));
	return r.flagged ? Math.min(1 - maxScore, 0.5) : 1 - maxScore;
}

export type ModerationState = "auto_approved" | "ai_approved" | "awaiting_human" | "human_approved" | "human_removed";

/** Compute the publish decision for newly-created content. */
export async function moderateNewContent(
	title: string,
	body: string,
): Promise<{
	status: "active" | "pending";
	state: ModerationState;
	tier1: Tier1Result;
	tier2?: Tier2Result;
	decidedBy: "heuristic" | "ai";
}> {
	const tier1 = analyzeContent(title, body);
	if (isClean(tier1)) {
		return { status: "active", state: "auto_approved", tier1, decidedBy: "heuristic" };
	}
	const tier2 = await assessSafety(title, body, tier1);
	if (tier2.decision === "auto") {
		return { status: "active", state: "ai_approved", tier1, tier2, decidedBy: "ai" };
	}
	return { status: "pending", state: "awaiting_human", tier1, tier2, decidedBy: "ai" };
}
