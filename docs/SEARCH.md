# Search + curated answers

Reddit‑style community search powered by **Google AI**, with a **grounded** curated
answer. Built to match the brand: calm, private, women‑first, and never medical
advice. It works at scale (semantic vector retrieval) and degrades gracefully to
keyword search when AI is unavailable.

## What the user sees

- A search box in the top bar (desktop) and a **Search** item in the sidebar /
  mobile drawer. Both route to `/search?q=…`.
- The results page (`web/src/pages/SearchPage.tsx`) shows, in order:
  1. **A curated answer card** — a short, plain‑language summary of what members
     have shared, with numbered **sources** linking to the cited discussions and
     a "not medical advice" disclaimer.
  2. **Circles** that match the query.
  3. **Discussions** — matching posts (reuses `PostCard`, so guest name‑blur and
     moderation rules are preserved; cards show the friendly Circle name).
- With no query, the page shows **Popular topics** chips (the Circles).

## How it works (Google‑native)

Two Google AI capabilities, used keyless via the function's own service account
(Application Default Credentials — no API key to manage or leak):

1. **Indexing — Vertex AI embeddings.** Every post is embedded with
   `text-embedding-005` (768‑dim) and stored as a Firestore **vector** on the post
   doc. The `embedPostOnWrite` trigger keeps this in sync; a content `sha256`
   (`embeddingHash`) makes re‑writes idempotent and is the trigger's loop guard.
2. **Retrieval — Firestore native vector search.** `searchContent` embeds the
   query (`RETRIEVAL_QUERY`) and runs Firestore's `findNearest` (KNN, `COSINE`)
   pre‑filtered to `status == "active"`, then applies a small lexical boost for
   exact‑term matches. Firestore ranks by the indexed vector, so this stays fast
   as content grows — no in‑memory scan of hundreds of docs.
3. **Answer — Gemini.** `gemini-2.5-flash` writes the summary, grounded strictly
   in the retrieved discussions.

See `functions/src/shared/ai.ts` (Vertex helpers) and
`functions/src/search/embeddings.ts` (trigger + backfill).

## Backend: `searchContent` (callable)

`functions/src/search/search.ts`. Guests are allowed (no `requireAuth`).

Privacy‑first by construction:

- **Stateless** — queries are never stored or tied to a user.
- Searches **only `status === "active"`** posts (no removed/pending content).
- Rate‑limited on every path: authed callers by `uid` (`search` / `searchAI`),
  **guests by a hashed IP** (`searchGuest`) so the guest‑accessible endpoint can't
  be used for DoS or cost‑exhaustion. The raw IP is never stored — only a sha256.
- The response strips moderation fields and converts timestamps to numbers.
- Communities are read through a 5‑minute in‑memory cache (small, slow‑changing
  set) instead of re‑reading the whole collection per search.

### The curated answer

Two ways to produce it; the client can't tell the difference structurally
(`answer.source` is `"ai"` or `"snapshot"`):

- **`snapshot`** (default, no AI needed) — a deterministic, grounded summary built
  from the matched discussions. Always honest about coverage and always appends the
  non‑medical‑advice line.
- **`ai`** — a real summary from **Gemini** (Vertex AI), with an **OpenAI fallback**
  if Gemini yields nothing. Only the post **title + a short body excerpt + the
  Circle name** are sent to the model — **no usernames, no PII**. The model is
  hard‑prompted to stay grounded, stay calm/non‑alarmist, cite `[1]`/`[2]`, never
  invent facts, and **never give medical advice** (gently defers to a clinician).

**Prompt‑injection hardening.** The query and post bodies are untrusted, so before
they enter the prompt we strip control chars and our own delimiters, wrap them in
`<search_query>` / `<discussion>` tags, and the system prompt instructs the model
to treat everything inside those tags as data only — never as instructions.

If the AI call fails for any reason (no credentials, quota, timeout, missing
index), search **falls back** to keyword retrieval + the snapshot — it never breaks.

## Configuration

- **Primary (recommended): keyless.** Enable the Vertex AI API
  (`aiplatform.googleapis.com`) and grant the functions' service account
  `roles/aiplatform.user`. No key required. Override models with
  `SEARCH_EMBED_MODEL` / `SEARCH_GEMINI_MODEL` if desired.
- **Optional OpenAI fallback.** Store a key in Secret Manager:
  `firebase functions:secrets:set SEARCH_AI_KEY`. It's bound to `searchContent`
  and only used if Gemini returns nothing. (Never put keys in source or plain env.)
- **Local emulator.** Vertex is skipped by default (no ADC) so search uses keyword
  + snapshot; set `SEARCH_FORCE_VERTEX=true` to exercise the real path. The emulator
  also accepts a plain `SEARCH_AI_KEY` / `OPENAI_API_KEY` env var for convenience.

The AI answer is attempted only for **signed‑in** callers; guests get the snapshot
plus a gentle "sign in for a richer answer" nudge when AI is configured.

## Backfilling embeddings

New posts are embedded automatically by the trigger. To embed pre‑existing posts,
an admin calls **`reindexSearchEmbeddings`** (runs in‑cloud with the function's
credentials; idempotent; processes a bounded batch and reports progress).
