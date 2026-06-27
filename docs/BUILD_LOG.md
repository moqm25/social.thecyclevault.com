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

Retry Firestore DB creation (API was still propagating):
`firebase firestore:databases:create "(default)" --location=us-central1`
Then continue Phase B (frontend scaffold in `web/`).

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
- [ ] `firebase firestore:databases:create "(default)" --location=us-central1`
      — **pending**: API still propagating; retry shortly.
- [ ] (Console, manual) Enable Auth → Email/Password provider (Identity Toolkit API
      already on; provider toggle done at go-live or via REST)

## Phase B — Frontend scaffold ⏳

- [ ] Vite + React + TypeScript (strict) app in repo root (`src/`, `public/`)
- [ ] Tailwind + brand tokens from `thecyclevault.com/site.css`
- [ ] React Router routes (`docs/UI_REQUIREMENTS.md §3`)
- [ ] TanStack Query + Zod + React Hook Form wired
- [ ] `lib/firebase` (SDK init + emulator switch) and `lib/api` (typed callables)
- [ ] App shell, theme toggle (light/dark), skeleton/empty/error states
- [ ] Auth feature (email/password, signup w/ username), protected routes

## Phase C — Backend (Cloud Functions, TypeScript) ⏳

- [ ] `functions/` package (2nd gen, region us-central1)
- [ ] Zod schemas + shared helpers (rate limit, auth guards, audit)
- [ ] Implement `docs/API_CONTRACT.md`: auth/profile, posts, comments, voting,
      moderation, notifications, plus export/delete-account
- [ ] Seed script for the 6 communities

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
