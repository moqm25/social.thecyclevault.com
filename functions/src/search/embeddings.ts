import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { createHash } from "node:crypto";
import { db, COL, FieldValue } from "../shared/admin.js";
import { requireActiveUser, requireRole } from "../shared/auth.js";
import { embedText } from "../shared/ai.js";
import type { DocumentReference } from "firebase-admin/firestore";

/**
 * Post embeddings — the indexing half of Google-native semantic search
 * (docs/SEARCH.md). Each post gets a Vertex AI text embedding stored as a
 * Firestore vector, which `searchContent` queries with `findNearest` (KNN).
 *
 * The embedding is content-derived (title + body) and idempotent: we store a
 * sha256 of the content as `embeddingHash` so re-writes (including our own
 * write-back) don't re-embed unchanged content — this is also the loop guard for
 * the trigger. Vertex is best-effort; if it's unavailable (e.g. the emulator),
 * we simply skip and search falls back to keyword matching.
 */

const EMBED_MODEL_TAG = process.env.SEARCH_EMBED_MODEL || "text-embedding-005";

function contentHash(title: string, body: string): string {
	return createHash("sha256").update(`${title}\n\n${body}`).digest("hex");
}

type EmbedOutcome = "embedded" | "skipped" | "failed" | "unchanged";

/** Embed one post's content and store the vector. Returns what happened. */
async function embedPost(ref: DocumentReference, data: Record<string, unknown>): Promise<EmbedOutcome> {
	const title = String(data.title ?? "");
	const body = String(data.body ?? "");
	const text = `${title}\n\n${body}`.trim();
	if (!text) return "skipped";

	const hash = contentHash(title, body);
	if (data.embeddingHash === hash) return "unchanged"; // already current → loop guard

	const vec = await embedText(text, "RETRIEVAL_DOCUMENT");
	if (!vec) return "failed"; // Vertex unavailable → keyword search still serves results

	await ref.set(
		{
			embedding: FieldValue.vector(vec),
			embeddingHash: hash,
			embeddingModel: EMBED_MODEL_TAG,
			embeddingUpdatedAt: FieldValue.serverTimestamp(),
		},
		{ merge: true },
	);
	return "embedded";
}

/**
 * Trigger: keep a post's embedding in sync whenever it's created or its content
 * changes. Fires on every post write; the hash guard makes the common case
 * (unchanged content, or our own embedding write-back) a cheap no-op.
 */
export const embedPostOnWrite = onDocumentWritten("posts/{postId}", async (event) => {
	const after = event.data?.after;
	if (!after?.exists) return; // deletion — nothing to embed
	const outcome = await embedPost(after.ref, after.data() as Record<string, unknown>);
	if (outcome === "embedded") logger.info("post embedded", { postId: event.params.postId });
});

/**
 * Admin callable: backfill embeddings for existing active posts (those created
 * before the trigger existed, or that failed earlier). Runs in-cloud so it uses
 * the function's own credentials — no key needed. Idempotent and safe to re-run;
 * processes a bounded batch per call and reports progress.
 */
export const reindexSearchEmbeddings = onCall({ timeoutSeconds: 540, memory: "512MiB" }, async (request) => {
	const { profile } = await requireActiveUser(request);
	requireRole(profile, "admin");

	const snap = await db.collection(COL.posts).where("status", "==", "active").limit(500).get();
	let embedded = 0;
	let unchanged = 0;
	let failed = 0;
	let skipped = 0;
	// Sequential to stay within embedding API rate limits and memory.
	for (const doc of snap.docs) {
		const outcome = await embedPost(doc.ref, doc.data() as Record<string, unknown>);
		if (outcome === "embedded") embedded++;
		else if (outcome === "unchanged") unchanged++;
		else if (outcome === "failed") failed++;
		else skipped++;
	}
	return { scanned: snap.size, embedded, unchanged, failed, skipped };
});
