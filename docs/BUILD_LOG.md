# BUILD LOG — The CycleVault Social

> Living handoff doc. If a session ends (tokens/credits), resume from
> **§ Next action**. Every completed step is checked; every command is recorded so
> the build is reproducible. Newest status at top of each section.

- **Repo:** `github.com/moqm25/social.thecyclevault.com`
- **Firebase account:** `moiezqamar@gmail.com`
- **Firebase project ID:** `cyclevault-social` (region `us-central1`)
- **Product name:** **The CycleVault** ("The" is part of the name — keep casing).
- **Authoritative specs:** `docs/adr/0001-foundational-architecture.md` + the 9
  Phase 0 docs. This log records _execution_, not design.

---

## ✓ Auth initialized (done 2026-06-27)

Firebase Authentication is initialized with **Email/Password enabled** in prod;
email-enumeration protection is on. Prod signups work. (Google sign-in remains
optional/off.)

---

## ▶ Next action

**MVP UI complete + AI/human moderation live + security audited + monetization
designed + Sponsored Products/Shop + strikes + admin tools + member Circles +
guest name-blur + legal pages.** All browser-validated. Sensible next steps:

- **Part B public cutover (gated):** set repo Variables `VITE_FIREBASE_*` (+
  optional `VITE_RECAPTCHA_SITE_KEY`), switch Pages source → GitHub Actions (this
  replaces the live "Coming soon" page), publish forum privacy + terms.
- **Legal review (recommended before launch):** the /privacy, /terms, /guidelines
  pages are brand-aligned templates — have a lawyer review.
- **App Check enforcement:** register a reCAPTCHA v3 key, set the Variable + the
  `ENFORCE_APP_CHECK=true` function env var, enable enforcement per service.
- **Real AI moderation (optional upgrade):** set the `MODERATION_AI_KEY` secret to
  swap the Tier-2 heuristic for OpenAI's Moderation endpoint (code path ready).
- **Payments (when audience exists):** Stripe + `grantSupporter` fn to flip
  `users.supporter` (removes sponsored placements) — see `MONETIZATION.md`.
- Seed real Sponsored Products via Admin → Sponsored products (demo seed:
  `functions/scripts/seedSponsoredProducts.mjs`).

---

## ✅ Done since last entry (2026-06-27, session 3)

Six founder-requested feature chunks — each built → typecheck/lint/test clean →
deployed to prod → committed:

1. **Legal pages** (`b13aea5`): forum Privacy Policy (distinct from the app's
   local-only policy), Terms of Service, Community Guidelines (women-first, crisis
   988, strikes). Shared `LegalLayout`; routes `/privacy /terms /guidelines`;
   footer links. _(Templates — legal review recommended.)_
2. **Sponsored Products + Shop** (`88ad292`): replaced the generic ad with vetted,
   labeled Sponsored Products (free tier sees them; Supporters don't). New
   `sponsoredProducts` collection (fn-only writes, public read of active), `/shop`
   browse page, admin manager, aggregate-only click counts (no tracking),
   `rel="sponsored nofollow"`. Functions: upsert/setActive/recordClick (+
   broadcastAnnouncement, grantBadge for later). `MONETIZATION.md §A2` updated.
3. **Delete-own content + badges everywhere** (`2bd4101`): `ContentMenu` (⋯) —
   authors delete their own post/comment, others report it. Badges now render in
   feed/detail/comments (denormalized author flair, zero extra reads).
4. **Strike & auto-suspension** (`ec49cd5`): human-confirmed removals strike the
   author; auto-escalate 1=warn→2=24h→3=7d→4=30d→5+=needsAdminReview; **decay 90d**;
   admin override (`clearUserStrikes`) + "Accounts needing review" panel. Strike
   history in mod-only `userModeration` (never on public profile). `MODERATION_PLAN
   §3a`.
5. **Admin view-as + deleted view + announcement** (`4648063`): admins toggle
   Member ⇄ Admin view (deleted/removed shown inline + moderation details);
   "Deleted & removed" dashboard tab; page-wide dismissible announcement banner
   (`broadcastAnnouncement` → `settings/global`).
6. **Member Circles + guest name-blur** (`53a892f`): `createCommunity` (creator =
   circle-scoped mod, NOT global; rate-limited; reserved slugs); `/circles/new`
   flow; HomePage "Circles" + "+ New Circle". **Guest name-blur** (`AuthorName`):
   logged-out guests can't see who's talking (blurred "a member", real name not in
   DOM) — the privacy differentiator. `requireModeratorOf` now honors `moderatorOf`
   for per-community actions (global actions stay role-gated — safe).

**Prod function count:** ~30 callables. Rules + indexes redeployed. All commits
pushed through `53a892f`.

---

## ▶ Earlier next-action (session 2, superseded)

---

## ✅ Done since last entry (2026-06-27, session 2)

- **Security audit** (`docs/SECURITY_AUDIT.md`): no critical/high; 4 lower-severity
  fixed — avatarUrl→function-only, createUserProfile rate limit, env-gated App Check
  enforcement in `requireAuth`, rule string-guards, + Forgot-password flow. `39c1cba`.
- **Ads-or-upgrade monetization** (`MONETIZATION.md §A2`): ethical model (NO
  behavioral networks — would break the brand); `AdSlot` (one labeled, no-tracking
  unit, hidden for Supporters) + `/supporter` upgrade page. `556f36d`.
- **AI + human moderation pipeline** (`docs/MODERATION_AI.md`): Tier-1 heuristic
  (inline) + Tier-2 AI checker (≥90% safe → publish, else human; pluggable real AI
  via `MODERATION_AI_KEY`); `moderationQueue` full audit stream; `reviewContent`
  callable; author notifications at each step; self-harm crisis handling; admin/mod
  `ContentReviewQueue` (awaiting + all-activity). 9 moderation unit tests.
  **Browser-validated end-to-end**: benign→auto-approved→feed; spam→held→hidden→
  admin reject→removed; author notified throughout. `f03e9f7`.
- **Fix:** `ProtectedRoute` now waits for the profile before role decision (was
  bouncing real admins/mods on hard refresh). `a9808bb`.

### Earlier this day (session 1)

- Auth provider ENABLED (Email/Password). App Check wired, password policy, email-
  enumeration protection. `9955793`.
- Profile, settings (edit + export + delete), notifications, mod/admin report
  queues. `7f1d464`. Monetization strategy v1 + badge hooks.

---

## Live-site safety (important)

The repo **root `index.html` is the live "Coming soon" page** served by GitHub
Pages from `main`. Replacing it is **gated** (Phase F). To avoid breaking it during
development, the SPA is built in a **`web/` subfolder** (slight divergence from the
docs' root layout, chosen for live-site safety). `functions/` stays at repo root.
At go-live, GitHub Pages source switches to **GitHub Actions** which builds
`web/` → `dist/` and publishes it.

---

## Locked decisions (2026-06-26)

- Single **production** project + Local Emulator Suite for dev (staging added later).
- Project ID `cyclevault-social`; Firestore region `us-central1`.
- Auth: **email/password** at launch (Google later, no rework).
- Hosting: **GitHub Pages** (not Firebase Hosting) on `social.thecyclevault.com`.
- Blaze upgrade + first cloud deploy are **gated** on explicit founder approval.

---

## Environment (verified 2026-06-26)

- Node `v22.17.0`, npm `10.9.2`
- firebase-tools `15.7.0` (logged in: `moiezqamar@gmail.com`)
- gh CLI `2.83.1` (logged in: `moqm25`)
- ✅ **Java installed** via `brew install openjdk` (keg-only, OpenJDK 26). It is
  **not on the default PATH** — prefix emulator commands with:
  `export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"` (CI uses actions/setup-java).

---

## Phase 0 — Config layer ✅ (committed)

- [x] `firestore.rules` — from `docs/SECURITY_RULES.md`
- [x] `firestore.indexes.json` — 14 composite indexes from `docs/DATA_MODEL.md §14`
- [x] `storage.rules` — restrictive; avatars Phase 2
- [x] `firebase.json` — firestore + storage + emulators (no hosting)
- [x] `.firebaserc` — `default → cyclevault-social`
- [x] `.gitignore`, `.env.example`

## Phase A — Cloud project (free, Spark plan) ⏳

- [x] `firebase projects:create cyclevault-social --display-name "The CycleVault Social"`
- [x] `firebase apps:create WEB "The CycleVault Social Web"` → App ID
      `1:841106244670:web:c27119d5f1bd4edc167d6f` (project number `841106244670`)
- [x] `firebase apps:sdkconfig WEB <appId>` → real values written to `web/.env.local`
- [x] Enabled GCP APIs via Service Usage REST (Firebase CLI token): firestore,
      cloudfunctions, firebasestorage, identitytoolkit ✅. cloudbuild +
      artifactregistry returned **needs-billing** → deferred to Phase F (Blaze).
- [x] `firebase firestore:databases:create "(default)" --location=us-central1` ✅
- [ ] (Console, manual) Enable Auth → Email/Password provider (Identity Toolkit API
      already on; provider toggle done at go-live or via REST)

## Phase B — Frontend scaffold ⏳

- [x] Vite + React + TypeScript (strict) app in `web/` (`src/`)
- [x] Tailwind + brand tokens from `thecyclevault.com/site.css`; light/dark theming
- [x] React Router routes (`docs/UI_REQUIREMENTS.md §3`); Home + 404 + placeholders
- [x] TanStack Query + Zod + React Hook Form wired
- [x] `lib/firebase` (SDK init + emulator switch), `lib/env` (zod-validated),
      `lib/api` (typed callables), `types/models`
- [x] App shell (top bar, theme toggle, user menu, disclaimer footer), brand wordmark
- [x] Auth feature: email/password sign-in + sign-up (username reservation),
      `AuthProvider`, `ProtectedRoute` (role-aware), reusable Button/TextField
- [x] Build green: split bundles — app 37KB / react 53KB / firebase 112KB gz
      (~203KB total, < 300KB budget); lint clean; 2 tests pass
- Note: signup's `createUserProfile` call needs the backend (Phase C) live in the
  emulator to fully work end-to-end.

## Phase C — Backend (Cloud Functions, TypeScript) ⏳

- [x] `functions/` package (2nd gen, Node 20, region us-central1, maxInstances 10)
- [x] Zod schemas + shared helpers (admin, auth guards, rate limit, audit, ranking,
      notify, validate)
- [x] Implemented `docs/API_CONTRACT.md`: createUserProfile, reserveUsername;
      createPost/updatePost/deletePostSoft/lockPost; createComment/updateComment/
      deleteCommentSoft; voteOnPost/voteOnComment (transactional); reportContent/
      removeContent/restoreContent/suspendUser/banUser/unbanUser/dismissReport/
      setUserRole; markNotificationRead; exportMyData/deleteMyAccount
- [x] `functions/scripts/seedCommunities.mjs` (idempotent, emulator + prod)
- [x] tsc build clean + eslint clean
- [ ] firebase.json updated with functions config ✅ (predeploy lint+build)

## Phase D — Testing ⏳ (Java installed)

- [x] Security-rules tests (`@firebase/rules-unit-testing`) — **23 tests**, full
      capability matrix incl. role-escalation + field-smuggle + default-deny
- [x] E2E function tests (full emulator: auth+functions+firestore) — **2 tests**:
      signup→profile→post→vote (score 0→1→idempotent→0) + unauth rejection
- [x] Unit tests (Vitest): voteMath (7) + ranking (5) = **12**; web HomePage **2**
- [x] Total: **39 tests passing** across web + functions + rules + e2e
- [ ] Component tests (RTL) beyond smoke; Playwright E2E — later (post-MVP UI)
- Run: `tests/` → `npm test` (rules), `npm run test:e2e` (full stack, seeds first)

## Phase E — CI/CD ✅

- [x] `.github/workflows/ci.yml` — on push/PR: web (lint+typecheck+test+build),
      functions (lint+build+unit), rules+E2E (emulators w/ setup-java). No deploys.
- [x] `.github/workflows/deploy.yml` — **manual `workflow_dispatch` only**, target
      web|firebase|both. Gated; documents Blaze + Pages-source + vars/secrets needs.
- [x] Pages SPA `404.html` fallback (rafgraph technique) + restore script in
      index.html; `.nojekyll`; `CNAME` in `web/public/` — verified emitted to dist/.
- Note: did NOT switch Pages to Actions (that's the gated go-live step), so the
  live Coming-soon page is untouched.

## Phase F — GO-LIVE (gated) — backend deployed ✅ / public cutover pending

**Part A — Backend go-live (done 2026-06-27, Blaze enabled by founder):**

- [x] Enabled billing-gated APIs (cloudbuild, artifactregistry, run, eventarc).
- [x] `firebase deploy --only firestore:rules,firestore:indexes` ✅ (prod).
- [x] `firebase deploy --only functions` — **all 20 callables LIVE** in
      us-central1 (v2/nodejs20). Smoke test: unauth call → 401 `UNAUTHENTICATED`.
- [x] Seeded 6 communities in prod via `scripts/seedCommunitiesProd.mjs` (REST +
      CLI token; idempotent).
- [ ] **Auth init** — founder console click (see note at top). Until then signups
      return `CONFIGURATION_NOT_FOUND`.
- [ ] Storage rules deploy — deferred: needs one-time bucket "Get started". Storage
      is Phase 2 (no uploads at launch), so not blocking.

**Part B — Public cutover (deferred until forum UI exists):**

- [ ] Repo Variables `VITE_FIREBASE_*`; Pages source → GitHub Actions; run gated
      `web` deploy (replaces the live Coming-soon page); publish forum privacy+terms.

## Phase G — Forum UI (in progress)

- [x] Read layer: `lib/firestore.ts` (status-filtered feed/comment queries +
      Timestamp normalize), `lib/time.ts` (relative time, unit-tested)
- [x] Query hooks (TanStack Query): communities, feed (infinite), post, comments,
      optimistic vote mutations
- [x] Components: PostCard, VoteControl (optimistic, guest-nudge), loading/empty/
      error states, Button/TextField reused
- [x] Feed (Hot/New/Top, infinite "Load more") — home (global) + community pages
- [x] Composer (`/post/new`, community preselect via ?c=) → createPost
- [x] Post detail (`/post/:id`) + threaded comments (depth, replies) + comment
      composer → createComment; locked-post handling
- [x] Verified: web typecheck/lint/build green, 5 web unit tests, rules + e2e green
- [ ] Profile (`/u/:username`), notifications inbox, settings, mod/admin dashboards
- [ ] **Composite indexes revised**: feed/comment queries filter status=='active',
      so indexes now include status (18 total); redeployed to prod.
- [x] **Browser-validated** (emulator, full stack): signup→createUserProfile,
      email-verification gate (correctly blocks unverified), createPost, feed
      render, upvote, comment, threaded replies — all working.
- [x] **2 bugs found + fixed via browser test**: (a) VoteControl double-counted
      (local offset + refetch); now reconciles to server score, no vote-query
      invalidation. (b) createComment 400 'received null' — callable encoder turns
      undefined→null; fixed via client strip-undefined + schema `.nullish()`.
- Built against the local emulator; wired to the live callables in `lib/api.ts`.

---

---

## Command journal

> Append every meaningful command + outcome here, newest last.

- `2026-06-26` — verified env (node/npm/firebase/gh), `firebase login:list` →
  `moiezqamar@gmail.com`. `cyclevault-social` not in existing 6 projects (ID free).
- `2026-06-26` — `gh auth setup-git` to fix HTTPS push; pushed Phase 0 config (`2e183e3`).
- `2026-06-26` — created project `cyclevault-social` + WEB app; pulled SDK config →
  `web/.env.local`. Enabled core GCP APIs via Service Usage REST using the Firebase
  CLI access token (no secret printed). Firestore DB create deferred (API propagating).
- `2026-06-26` — SPA placed in `web/` to protect live Coming-soon `index.html`.
- `2026-06-26` — Firestore DB `(default)` created in `us-central1`. Web prod deps:
  0 vulnerabilities (5 dev-only, non-shipping).
- `2026-06-26` — frontend foundation committed (`65fe88b`): Vite+React+TS+Tailwind,
  brand tokens, routing, ThemeProvider.
- `2026-06-26` — firebase client lib + auth (sign-in/up, profile, protected routes)
  built; vendor chunk-split; lint clean.
- `2026-06-26` — Cloud Functions backend implemented (20 callables across auth,
  posts, comments, votes, moderation, notifications, account) + seed script. tsc +
  eslint clean. Emulator E2E pending Java install.
- `2026-06-27` — installed OpenJDK 26 (brew). Wrote + ran tests: 23 rules tests,
  2 E2E (full emulator stack), 12 functions unit, 2 web = **39 passing**. Vote flow
  and rules capability matrix validated end-to-end.
- `2026-06-27` — Phase E: CI workflow (web/functions/rules+e2e), gated manual deploy
  workflow, SPA 404 fallback + CNAME/.nojekyll in web/public. Live site untouched.
- `2026-06-27` — SPA fallback + docs pushed (`b5576d1`). Workflow files committed
  locally (`0edd3f4`) but push rejected for missing `workflow` scope — awaiting
  `gh auth refresh -s workflow` + push. All app/backend/test code is on origin.
- `2026-06-27` — founder granted `workflow` scope + pushed workflows (`3504976`);
  CI run green. Founder enabled **Blaze**.
- `2026-06-27` — **Phase F Part A**: enabled billing-gated APIs; deployed Firestore
  rules+indexes; deployed **all 20 Cloud Functions** (us-central1, prod); seeded 6
  communities (REST seed script). Smoke test: unauth callable → 401 UNAUTHENTICATED.
  Removed unused `isActive` rules helper. Remaining: founder Auth-init console click.
