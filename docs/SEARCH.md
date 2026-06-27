# Search + curated answers

Reddit‑style community search with an optional, **grounded** AI summary. Built to
match the brand: calm, private, women‑first, and never medical advice.

## What the user sees

- A search box in the top bar (desktop) and a **Search** item in the sidebar /
  mobile drawer. Both route to `/search?q=…`.
- The results page (`web/src/pages/SearchPage.tsx`) shows, in order:
  1. **A curated answer card** — a short, plain‑language summary of what members
     have shared, with numbered **sources** linking to the cited discussions and
     a "not medical advice" disclaimer.
  2. **Circles** that match the query.
  3. **Discussions** — matching posts (reuses `PostCard`, so guest name‑blur and
     moderation rules are preserved).
- With no query, the page shows **Popular topics** chips (the Circles).

## Backend: `searchContent` (callable)

`functions/src/search/search.ts`. Guests are allowed (no `requireAuth`); authed
callers are rate‑limited (`search`, and `searchAI` for the LLM path).

Privacy‑first by construction:

- **Stateless** — queries are never stored or tied to a user.
- Searches **only `status === "active"`** posts (no removed/pending content).
- Ranks in memory: title ×5, tags ×3, body ×1, exact‑phrase bonus, popularity
  tiebreak. Fetches up to `CANDIDATE_LIMIT` hot posts and scores them.
- The response strips moderation fields and converts timestamps to numbers.

### The curated answer

Two ways to produce it; the client can't tell the difference structurally
(`answer.source` is `"ai"` or `"snapshot"`):

- **`snapshot`** (default, no key needed) — a deterministic, grounded summary
  built from the matched discussions. Always honest about coverage and always
  appends the non‑medical‑advice line.
- **`ai`** — a real LLM summary (OpenAI Chat Completions via `fetch`). Only the
  post **title + a short body excerpt + the Circle name** are sent to the model —
  **no usernames, no PII**. The model is hard‑prompted to stay grounded in the
  provided discussions, stay calm/non‑alarmist, cite `[1]`/`[2]`, never invent
  facts, and **never give medical advice** (gently defers to a clinician).

If the AI call fails for any reason, it **falls back to the snapshot** — search
never breaks.

## Enabling the AI answer

The LLM path is **opt‑in**, mirroring moderation's `MODERATION_AI_KEY`:

- Production: set a dedicated **`SEARCH_AI_KEY`** (and optionally
  `SEARCH_AI_MODEL`, default `gpt-4o-mini`). Without it, search serves the
  grounded snapshot.
- Local dev only: if `SEARCH_AI_KEY` is unset, the emulator falls back to a
  standard `OPENAI_API_KEY` from the shell so demos work out of the box.

The AI answer is attempted only for **signed‑in** callers (guests get the
snapshot plus a gentle "sign in for a richer answer" nudge when a key is set).
