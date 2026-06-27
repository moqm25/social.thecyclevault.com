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

## ▶ Next action

Install a JDK (`brew install temurin`) so the Firebase Emulator Suite + rules
tests can run, then write Phase D tests (rules tests + function tests) and run the
full stack against the emulator end-to-end.

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
- ⚠ **Java NOT installed** — required for the Firestore emulator + rules tests.
  Install before emulator-dependent steps (Phase D / local emulators):
  `brew install temurin` (or any JDK 11+).

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

## Phase D — Testing ⏳ (needs Java for emulators)

- [ ] Security-rules tests (`@firebase/rules-unit-testing`) — capability matrix
- [ ] Function tests (`firebase-functions-test` + emulators)
- [ ] Unit tests (Vitest): zod schemas, hotRank, vote reducer
- [ ] Component tests (RTL); E2E (Playwright) — later

## Phase E — CI/CD ⏳

- [ ] `.github/workflows/ci.yml` (lint, typecheck, test, build on PR)
- [ ] `.github/workflows/deploy.yml` (Pages + Firebase on main)
- [ ] Pages SPA `404.html` fallback; keep `CNAME` in build output

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
