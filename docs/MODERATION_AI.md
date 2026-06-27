# MODERATION_AI.md — Automated + Human Content Moderation

- **Status:** Design + implemented (Phase 1 heuristic; AI hook pluggable)
- **Date:** 2026-06-27
- **Owner:** [`adr/0001-foundational-architecture.md`](./adr/0001-foundational-architecture.md)
- **Related:** [`MODERATION_PLAN.md`](./MODERATION_PLAN.md), [`SECURITY_AUDIT.md`](./SECURITY_AUDIT.md)

This is the automated review pipeline for a **health community**, where unvetted
content reaching readers is a real safety + reputation risk. Every post and comment
flows through it; nothing privileged is decided on the client.

---

## 1. The flow (requested behavior)

```
User posts / comments
   │
   ▼
Tier 1 — Heuristic screen (inline, in createPost/createComment)
   │  clean ───────────────► PUBLISH (status: active)   ── logged: auto_approved
   │
   │  flagged
   ▼
Tier 2 — AI checker (confidence the content is safe)
   │  safe ≥ 90% ──────────► PUBLISH (status: active)   ── logged: ai_approved
   │
   │  not confident
   ▼
HELD for human (status: pending — hidden from feed)     ── logged: awaiting_human
   │
   ▼
Human review (admin/mod dashboard)
   ├─ Approve ────────────► PUBLISH (status: active)    ── logged: human_approved
   └─ Reject  ────────────► REMOVE  (status: removed)   ── logged: human_removed
```

- **Clean content publishes instantly** (no latency tax on the 99% case).
- **Only flagged content is held**; the feed already hides anything whose
  `status != 'active'`, so held content is invisible until cleared.
- **Authors are notified** at each step: "under review", "published", or
  "not approved" (with reason).
- **Users can still report** anything that slips through (`reportContent`) — that
  routes into the same human queue.

---

## 2. Two tiers

### Tier 1 — Heuristic screen (`functions/src/shared/moderation.ts:analyzeContent`)

Deterministic, fast, no external call. Produces a **risk score (0–1)**, a
**severity** (`none`/`low`/`high`), and a list of **flags**. It detects:

- **Self-harm / crisis** signals → `high` severity, always routed to a human, and
  the author sees crisis-resource links. Never auto-removed; handled with care.
- **Medical misinformation** patterns (e.g. "miracle cure", "stop taking your
  meds", unsafe instructions) → flag for human.
- **Spam / solicitation** — excessive links, emails/phones, "DM me", "buy now",
  promo/crypto/casino patterns.
- **Abuse / slurs / profanity** — a minimal, extensible blocklist.
- **Shouting / repetition** — low-weight quality signals.

### Tier 2 — AI checker (`assessSafety`)

Given a flagged item, returns a **confidence that it is safe** (0–1) and a decision
(`auto` ≥ 0.90 → publish, else `human`). It is **pluggable**:

- **Default (now):** a refined heuristic — `safeConfidence = 1 − risk`, reduced for
  high-severity categories. Mild single signals clear ≥ 0.90 (auto-approve); strong
  or multiple signals fall below (human). This realizes the "≥ 90% positive →
  approved, else human" rule deterministically, with **zero external dependencies**.
- **Upgrade path (drop-in):** set the `MODERATION_AI_KEY` function secret to call a
  real moderation model (e.g. OpenAI's free Moderation endpoint, or Google
  Perspective). The provider's category scores map to `safeConfidence`. Code path is
  already branched in `assessSafety`; no architecture change needed.

> Why not a real AI today: no API key is provisioned, and a key shouldn't be a hard
> dependency for the pipeline to function. The heuristic is genuinely useful now and
> the AI slots in behind one secret + redeploy.

---

## 3. Data

### `moderationQueue/{id}` — the full audit stream (admin dashboard reads this)

One entry **per post and per comment** ("all content trickles through here"):

| Field | Notes |
| --- | --- |
| `contentType` | `post` \| `comment` |
| `contentId`, `communityId`, `postId?` | references |
| `authorId`, `authorUsername` | denormalized |
| `excerpt` | first ~200 chars for the dashboard |
| `tier1` | `{ score, severity, flags[] }` |
| `tier2` | `{ safeConfidence, decision, usedAI }` (present if Tier 1 flagged) |
| `state` | `auto_approved` · `ai_approved` · `awaiting_human` · `human_approved` · `human_removed` |
| `decidedBy` | `heuristic` · `ai` · moderator uid |
| `reason` | human note on reject/approve |
| `createdAt`, `decidedAt` | server |

Content (`posts`/`comments`) also carries a small `moderation` map mirroring the
outcome, and the existing **`status`** field gates visibility (`active` /
`pending` / `removed`).

### Rules + indexes

- `moderationQueue`: **mod/admin read, function-only write** (fail-closed).
- Indexes: `state + createdAt` (human queue), `createdAt` (full stream).

---

## 4. Human review surface

Lives in the in-app, role-gated **`/admin`** (and `/mod`) dashboard — same auth, no
separate attack surface:

- **Awaiting review** — held items with **Approve** / **Reject (reason)**.
- **Recent activity stream** — every item with its Tier 1 + Tier 2 + human decision,
  so the founder sees exactly what the AI did and what humans did.

> **Separate `admin.thecyclevault.com`?** Optional. Keeping admin inside the social
> app is simpler and more secure (one auth, one deploy, role-gated). A dedicated
> subdomain would need its own Firebase app + auth wiring. Recommendation: keep
> in-app for now; split later only if a distinct admin team needs isolation. (No new
> repo created without confirmation.)

---

## 5. Costs & scale

- Inline Tier 1 adds ~no cost (pure compute in an already-running function).
- A `moderationQueue` write per item ~doubles write volume — negligible at launch,
  and it's the requested full audit trail. **Stage-2 optimization:** keep full
  entries only for flagged items + sample the auto-approved stream.
- Real AI (Tier 2) cost applies only to **flagged** items (a small fraction), and
  OpenAI's Moderation endpoint is free at time of writing.

---

## 6. Failure handling

- If Tier 2 (AI) errors or times out, **fail safe → route to human** (never
  auto-publish on uncertainty). Tier 1 is pure and can't fail externally.
- Moderation never blocks the user's request beyond the inline screen; held content
  returns a clear "under review" state to the author.
