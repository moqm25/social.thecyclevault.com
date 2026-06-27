import { GoogleAuth } from "google-auth-library";
import { logger } from "firebase-functions/v2";

/**
 * Google AI (Vertex AI) helpers — the privacy-first, Google-native AI layer for
 * The CycleVault Social (docs/SEARCH.md).
 *
 * Why Vertex AI: we already run on Firebase/Google, so we use the SAME project's
 * service account (Application Default Credentials) — NO API key to manage, store,
 * or leak. Embeddings power fast semantic search via Firestore's native vector
 * index; Gemini writes the grounded curated answer.
 *
 * Everything here is best-effort and FAILS SOFT: any error (no credentials in the
 * emulator, API disabled, timeout, quota) returns null so callers fall back to the
 * deterministic keyword path + snapshot answer. The product never breaks.
 *
 * Privacy: only public post titles/excerpts + circle names are ever sent. No
 * usernames, emails, or any PII. Search queries are never stored.
 */

const LOCATION = "us-central1"; // co-located with Firestore + Functions
const EMBED_MODEL = process.env.SEARCH_EMBED_MODEL || "text-embedding-005"; // 768-dim, English
const GEMINI_MODEL = process.env.SEARCH_GEMINI_MODEL || "gemini-2.5-flash";

/** Embedding dimensionality. 768 ≤ Firestore's 2048 vector cap; matches text-embedding-005. */
export const EMBED_DIMENSIONS = 768;

export type EmbedTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

function projectId(): string | undefined {
	return process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
}

/**
 * Whether to attempt real Vertex AI calls. In the emulator we skip by default
 * (no ADC, avoids latency/cost) and fall back to keyword + snapshot; set
 * SEARCH_FORCE_VERTEX=true to exercise the real path locally.
 */
export function vertexEnabled(): boolean {
	if (process.env.SEARCH_DISABLE_VERTEX === "true") return false;
	if (process.env.FUNCTIONS_EMULATOR === "true") return process.env.SEARCH_FORCE_VERTEX === "true";
	return !!projectId();
}

// Reuse one GoogleAuth client (token caching) across warm invocations.
let auth: GoogleAuth | null = null;
async function accessToken(): Promise<string> {
	if (!auth) auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
	const token = await auth.getAccessToken();
	if (!token) throw new Error("no_access_token");
	return token;
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), ms);
	try {
		return await fetch(url, { ...init, signal: ctrl.signal });
	} finally {
		clearTimeout(t);
	}
}

async function vertexPredict(model: string, verb: "predict" | "generateContent", body: unknown, timeoutMs: number): Promise<unknown> {
	const pid = projectId();
	if (!pid) throw new Error("no_project");
	const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${pid}/locations/${LOCATION}/publishers/google/models/${model}:${verb}`;
	const res = await fetchWithTimeout(
		url,
		{
			method: "POST",
			headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
			body: JSON.stringify(body),
		},
		timeoutMs,
	);
	if (!res.ok) {
		const detail = await res.text().catch(() => "");
		throw new Error(`vertex_${verb}_${res.status}:${detail.slice(0, 200)}`);
	}
	return res.json();
}

/**
 * Generate a text embedding via Vertex AI. Returns a 768-length unit vector, or
 * null on any failure (caller falls back to keyword search).
 *
 * taskType lets the model encode documents and queries asymmetrically, which
 * meaningfully improves retrieval quality.
 */
export async function embedText(text: string, taskType: EmbedTaskType): Promise<number[] | null> {
	if (!vertexEnabled()) return null;
	const content = text.replace(/\s+/g, " ").trim().slice(0, 8000);
	if (!content) return null;
	try {
		const data = (await vertexPredict(
			EMBED_MODEL,
			"predict",
			{
				instances: [{ task_type: taskType, content }],
				parameters: { autoTruncate: true, outputDimensionality: EMBED_DIMENSIONS },
			},
			8000,
		)) as { predictions?: Array<{ embeddings?: { values?: number[] } }> };
		const values = data.predictions?.[0]?.embeddings?.values;
		return Array.isArray(values) && values.length === EMBED_DIMENSIONS ? values : null;
	} catch (err) {
		logger.warn("embedText failed; falling back to keyword search", { err: String(err) });
		return null;
	}
}

/**
 * Ask Gemini for a short grounded answer. `system` carries the hard rules and
 * `user` carries the (delimited, untrusted) query + discussions. Returns the
 * answer text, or null on any failure (caller falls back to the snapshot).
 */
export async function geminiAnswer(system: string, user: string): Promise<string | null> {
	if (!vertexEnabled()) return null;
	try {
		const data = (await vertexPredict(
			GEMINI_MODEL,
			"generateContent",
			{
				systemInstruction: { parts: [{ text: system }] },
				contents: [{ role: "user", parts: [{ text: user }] }],
				// thinkingBudget 0 disables the model's internal reasoning tokens: this is
				// a short, grounded summary that needs none — making it faster, cheaper,
				// and reliable (reasoning could otherwise exhaust the output budget).
				generationConfig: { temperature: 0.3, topP: 0.9, maxOutputTokens: 400, thinkingConfig: { thinkingBudget: 0 } },
			},
			12000,
		)) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
		const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
		return text && text.length > 0 ? text : null;
	} catch (err) {
		logger.warn("geminiAnswer failed; falling back to snapshot", { err: String(err) });
		return null;
	}
}
