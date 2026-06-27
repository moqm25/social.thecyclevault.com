# MONETIZATION.md — The CycleVault Social

- **Status:** Strategy (Phase 0 / pre-revenue)
- **Date:** 2026-06-27
- **Owner:** [`adr/0001-foundational-architecture.md`](./adr/0001-foundational-architecture.md)
- **Related:** `../../MASTER PRODUCT SPEC.txt` (V3 ethical monetization), `COST_MODEL.md`

> The CycleVault's entire brand is **"Private. Local. Yours."** Monetization must
> _reinforce_ trust, never erode it. This doc defines revenue streams that are
> compatible with a privacy-first health community, the non-negotiable rules, and
> a phased rollout tied to audience size.

---

## 0. The hard rules (what we will NEVER do)

These are brand-defining. Breaking one would be existential.

- ❌ **No behavioral ad targeting.** We do not profile users to target ads.
- ❌ **No selling or sharing user data**, ever — not even "anonymized aggregates."
- ❌ **No third-party ad/tracking SDKs** (the app and marketing site ship none).
- ❌ **No dark patterns** — no fake scarcity, no guilt, no paywalling safety info.
- ❌ **No pay-to-win moderation** — money never buys influence over what's removed
  or who's banned.
- ❌ **No medical-misinfo advertisers** or predatory products (vetting required).

If a revenue idea needs any of the above, we don't do it.

---

## 1. Revenue streams (ranked by fit + near-term realism)

### A. Supporter membership (primary, recurring) ⭐

A calm, optional paid tier — the forum mirror of the app's **Supporter** model.
Free tier stays fully usable (read, post, comment, vote, report).

**Supporter perks (cosmetic + convenience, never safety-gated):**

- **Supporter badge / flair** next to the username (quiet, tasteful).
- **Profile accent themes** (the 4 brand palettes: Coral, Sage, Ocean, Plum).
- **Create polls** and (Phase 2) larger image uploads.
- **Higher rate limits** and early access to new features.
- **"Founding Supporter"** lifetime recognition for early adopters.

**Pricing (suggested, undercuts the app since it's lighter):**

| Plan     | Price                                      |
| -------- | ------------------------------------------ |
| Monthly  | **$2.99 / mo**                             |
| Annual   | **$19.99 / yr** (≈ 44% off)                |
| Lifetime | **$49.99** one-time (early-adopter option) |

**Smart bundle:** app **Supporters get forum Supporter free** (and vice-versa as a
trial). This raises the value of _both_ products and is a strong reason to convert.

**Why first:** recurring, low-friction, no traffic threshold for brands, fully on-
brand (people pay to _support the mission_, like public radio).

### A2. Ad-supported free tier → "go ad-free" upgrade (founder request) ⭐

> Requested approach: show ads to free users; let them **upgrade to remove ads**.
> This is the classic, proven freemium lever — and it folds neatly into Supporter
> (Supporter = ad-free). The catch is **how** we do ads without betraying a
> privacy-first health brand.

**The hard truth (and why this needs care):** mainstream ad networks (Google
AdSense, programmatic/RTB, Meta Audience Network) run on **behavioral tracking,
third-party cookies, and ad SDKs** — exactly what our [§0 NEVER list](#0-the-hard-rules-what-we-will-never-do)
forbids. On a **menstrual-health** site, behavioral targeting is also a landmine
(pregnancy/fertility retargeting is creepy and a PR risk). So we do **not** use
AdSense or any behavioral network. Instead:

**Ethical ad models we WILL use (pick per stage):**

1. **First-party direct-sold sponsorships** (preferred) — one tasteful, clearly
   **"Sponsored"** placement we sell directly to vetted partners (period products,
   vetted femtech, books, clinics). Flat fee, **no tracking**, no third-party SDK,
   links open externally. This is the same engine as §C "Products & Tools" — just
   surfaced as a single in-feed/sidebar unit. We fully control vetting + display.
2. **Contextual ad networks (no tracking)** — e.g. the _model_ EthicalAds proved
   (contextual, GDPR-clean, no cookies, ~$2.50 CPM; though EthicalAds itself targets
   _developer_ audiences, so it's not a fit for our readers). If/when a reputable
   **contextual, no-tracking** network serving a health/wellness audience is vetted,
   it can fill unsold inventory. Ads chosen by **page topic**, never by the user.

**The upgrade:** free users see **at most one** calm, labeled, non-tracking
placement; **Supporter removes it** ("go ad-free"). Same `users.supporter` flag
already gates this — the `AdSlot` component renders nothing for Supporters.

**Guardrails specific to ads:** one unit max; never between content; always
labeled "Sponsored"; no animation/auto-play; no health-misinfo or predatory
advertisers; no behavioral targeting; a public note explaining the model.

**Why this still satisfies the request:** free tier is ad-supported, paying removes
ads — but the "ads" are ethical placements, not surveillance. It protects the brand
_and_ the revenue. (If we ever truly needed behavioral ads to survive, the honest
move would be to not do it — the privacy promise is the product.)

**✅ Implemented (Sponsored Products + Shop).** Rather than generic "ads," the free
tier shows **Sponsored Products** — vetted, admin-curated items (period care,
femtech, books, wellness, supplements, tools). Implementation:

- **Collection** `sponsoredProducts` (function-only writes; public read of `active`
  items). Fields: name, blurb, imageUrl, url, category, sponsor, active, `clickCount`.
- **In-feed unit** (`AdSlot`) shows **one** clearly-labeled "Sponsored" product after
  the 3rd post, rotated **by day** (time-based, not per-user). Renders **nothing** for
  Supporters — upgrading removes sponsored placements.
- **Shop page** (`/shop`) — a calm, browsable directory of all active products,
  filterable by category. Open to everyone (Supporters can browse; they just don't
  get the in-feed unit). A "Browse the Shop" link sits on the in-feed unit.
- **No tracking.** Outbound links are `rel="sponsored nofollow noopener noreferrer"`;
  we record only an **aggregate** `clickCount` (no user id, no profile) via
  `recordSponsoredClick`. Images load with `referrerPolicy="no-referrer"`.
- **Admin-managed** via Admin → *Sponsored products* (`upsertSponsoredProduct`,
  `setSponsoredProductActive`); every change is written to the audit log.

This is the same engine as §C "Products & Tools," surfaced two ways (one in-feed unit
+ a full Shop). Demo/example entries live in `functions/scripts/seedSponsoredProducts.mjs`;
real products are added by an admin in production.

### B. Verified Clinician / Expert program (trust + revenue) ⭐

Vetted health professionals (OB-GYNs, midwives, nurses, pelvic-floor PTs,
dietitians) earn a **"Verified Clinician"** badge after credential verification.
This is the "certified users" idea — and it's a _trust_ feature first, revenue second.

- **Verification fee:** e.g. **$49 / yr** to cover manual vetting + the badge, OR
  free-but-vetted to seed credibility early, then introduce the fee at scale.
- **"Ask an Expert" premium** (Phase 2): Supporters can post into a moderated
  expert-answered queue; experts opt in. Revenue share or flat stipend possible.
- **Org/Brand verification** (a distinct blue-style badge) for clinics and femtech
  orgs that want a credible presence — also a paid verification.
- Guardrails: verified status is **content-quality signal, not advertising**;
  experts still can't sell unproven products; misinfo loses the badge.

### C. Sponsored listings — "Products & Tools" (scale-gated)

Lifted directly from the **MASTER PRODUCT SPEC V3** ethical model, which is already
privacy-reviewed and on-brand:

- A dedicated **"Products & Tools"** surface (and/or clearly labeled **"Sponsored"**
  cards in-feed), **not** behavioral ads.
- Vendors pay a **flat listing fee** (e.g. $X / month per listing) — no auction, no
  per-click surveillance.
- **No user-level tracking** — only aggregate impression/click counts.
- Every item is labeled **"Sponsored"**; links open **externally** (Safari/new tab).
- **Strict vetting:** period products, vetted supplements, books, femtech hardware;
  no medical claims, no predatory financing, no misinfo.
- Needs traffic to be worth a brand's flat fee → **Stage 2** (10k+ MAU).

### D. Tip jar / community support (always-on, low effort)

A simple **"Support the platform"** link (one-time contributions) for users who
want to chip in without a subscription — recognized with a small "Supporter" heart.
Cheap to add, reinforces the public-radio framing.

### E. Premium events / educational content (future)

Paid expert **AMAs**, workshops, or a premium long-form library extension. Optional,
Phase 3+, only if the community asks for it.

---

## 2. What funds what (sustainability math)

Per [`COST_MODEL.md`](./COST_MODEL.md), infra cost at launch is **~$0** and stays in
the low single digits for a long time. So break-even is trivially low:

- A handful of annual Supporters covers infra indefinitely at Stage 1.
- Verification fees + a few sponsored listings cover a part-time moderation/ops
  budget at Stage 2.
- The goal is **"sustains the platform + pays for the founder's time,"** not VC-scale
  growth. Calm business for a calm product.

---

## 3. Phased rollout (tied to audience, not dates)

| Stage       | Audience | Monetization live                                                                          |
| ----------- | -------- | ------------------------------------------------------------------------------------------ |
| **Launch**  | 0–1k     | Nothing paid. Build trust + content. Maybe a Tip jar.                                      |
| **Stage 1** | 1k–10k   | **Supporter membership** + app bundle. **Clinician verification** (free-but-vetted → fee). |
| **Stage 2** | 10k–100k | **Sponsored "Products & Tools"** (flat fee, labeled). Paid verification. "Ask an Expert."  |
| **Stage 3** | 100k+    | Premium events/content; revenue-share expert programs.                                     |

Don't front-load monetization onto an empty room — **audience first, revenue second.**

---

## 4. Implementation hooks (what the codebase needs)

Foundational, cheap to add now so later monetization is a config change, not a
refactor (some already landed — see commit history):

- **`users.supporter`** (bool) + `supporterSince` — gates cosmetic perks. Set ONLY
  by a server function after a verified purchase (never client-writable; same rule
  posture as `role`).
- **`users.badges`** (array) or `users.verified` — e.g. `clinician`, `org`,
  `founding_supporter`. Function-only writes; rendered as flair.
- **`Badge` component** — renders Supporter / Verified flair in PostCard, comments,
  and profiles. (Display layer is built; the data is function-gated.)
- **Payments:** out of scope until Stage 1. Likely **Stripe** (web) or **RevenueCat**
  if we ever share entitlements with the iOS app. A `grantSupporter` Cloud Function
  verifies the webhook/receipt and flips `users.supporter` — mirrors the app's
  `EntitlementService`. **No card data ever touches our servers** (Stripe-hosted
  checkout), consistent with the password posture.
- **Sponsored listings:** a `sponsoredListings` collection (admin-managed) + a
  labeled UI surface; aggregate counters only.

Each of these gets its own ADR/spec before implementation.

---

## 5. Positioning (how we talk about it)

Frame it like **public media**, not like an ad network:

> "The CycleVault Social is free and always will be. If it's useful to you, becoming
> a Supporter keeps it running — no ads, no data sales, no exceptions."

Transparency: a short public note on where money comes from (Supporters, vetted
verification, clearly-labeled sponsors) and where it never comes from (your data).
This _is_ a marketing asset for a privacy brand.
