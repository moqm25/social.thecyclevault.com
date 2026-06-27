# BUILD LOG — The CycleVault Social

> Living handoff doc. If a session ends (tokens/credits), resume from
> **§ Next action**. Every completed step is checked; every command is recorded so
> the build is reproducible. Newest status at top of each section.

- **Repo:** `github.com/moqm25/social.thecyclevault.com`
- **Firebase account:** `moiezqamar@gmail.com`
- **Firebase project ID:** `cyclevault-social` (region `us-central1`)
- **Product name:** **The CycleVault** ("The" is part of the name — keep casing).
- **Authoritative specs:** `docs/adr/0001-foundational-architecture.md` + the 9
  Phase 0 docs. This log records *execution*, not design.

---

## ⚠ One thing waiting on you (non-blocking)

The CI/deploy **workflow files are committed locally (`0edd3f4`) but not pushed** —
GitHub rejected the push because the current credential lacks the `workflow` OAuth
scope. To publish them, run once:

```bash
gh auth refresh -h github.com -s workflow   # interactive, your browser
cd Files/social.thecyclevault.com && git push origin main
```

Everything else is pushed. This does not block local development or the build.

---

## ▶ Next action

**Phase F — GO-LIVE (gated on founder approval).** Everything buildable is done and
green. To launch (see `docs/DEPLOYMENT_PLAN.md` §9 + `.github/workflows/deploy.yml`):
1. Upgrade `cyclevault-social` to **Blaze** + set a budget alert.
2. Enable **Email/Password** auth provider (Console → Authentication).
3. Add repo **Variables** (`VITE_FIREBASE_*`) + secret `FIREBASE_SERVICE_ACCOUNT`.
4. Run the `Deploy (gated)` workflow with target `firebase` → seed communities in prod.
5. Switch **Pages source → GitHub Actions**, run `Deploy (gated)` target `web`
   (this replaces the live "Coming soon" page).
6. Publish forum privacy policy + terms.

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

## Phase F — Go live ⛔ (gated on founder approval)

- [ ] Upgrade prod project to **Blaze** + budget alerts (founder, console)
- [ ] First `firebase deploy` (rules, indexes, functions)
- [ ] Replace live "Coming soon" `index.html` with the built SPA
- [ ] Publish forum privacy policy + terms (separate from the app's local-only one)

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
