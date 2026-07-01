# DEPLOYMENT_PLAN.md — The CycleVault Social

- **Status:** Phase 0 spec (Accepted)
- **Date:** 2026-06-26
- **Owner:** [`adr/0001-foundational-architecture.md`](./adr/0001-foundational-architecture.md)

How the SPA and the Firebase backend get built, tested, and shipped — and how an
AI assistant (or the founder) operates Firebase. Two independent deploy targets:

1. **Frontend** → GitHub Pages (`social.thecyclevault.com`).
2. **Backend** → Firebase (Functions, Firestore rules + indexes, Storage rules).

---

## 1. Environments

| Env            | Firebase project            | Frontend                   | Purpose                       |
| -------------- | --------------------------- | -------------------------- | ----------------------------- |
| **Local**      | Emulator Suite              | `npm run dev` (Vite)       | Day-to-day dev; no cloud cost |
| **Staging**    | `cyclevault-social-staging` | Pages preview / branch     | Pre-prod verification         |
| **Production** | `cyclevault-social`         | `social.thecyclevault.com` | Live                          |

> **Launch decision (2026-06-26):** start with a **single production project**
> (`cyclevault-social`) + the **Local Emulator Suite** for all day-to-day dev —
> simplest and $0. A dedicated **staging** project (`cyclevault-social-staging`) is
> added later via `firebase use --add`. `.firebaserc` currently maps
> `default → cyclevault-social`.

Project aliases live in `.firebaserc`. The Vite app reads `VITE_FIREBASE_*` env
vars per environment (see §5).

> **Internal test URL (live):** a **Firebase Hosting** deploy serves the built SPA
> at **`cyclevault-social.web.app`** against the real production backend. This is the
> internal test/preview surface — **not** the public custom domain. Build and ship it
> with:
>
> ```bash
> cd web && npm run build && cd ..
> firebase deploy --only hosting
> ```
>
> The **public** cutover to `social.thecyclevault.com` (GitHub Pages, §2/§3) remains
> a separate, deliberate, gated step.

> **Functions runtime:** Cloud Functions run on **Node 22** (2nd gen, `us-central1`,
> `maxInstances 10`).

> **Blaze required.** Cloud Functions (2nd gen) deploy only on the **Blaze
> pay-as-you-go** plan. The production project must be on Blaze with a billing
> account **and budget alerts** (see [`COST_MODEL.md`](./COST_MODEL.md)). The free
> Spark plan cannot deploy functions; local emulator development needs no billing.

---

## 2. GitHub Pages SPA specifics

- **Custom domain:** `social.thecyclevault.com` (CNAME file already present). Keep
  the `CNAME` in the published output so Pages preserves it.
- **Routing fallback:** Pages has **no SPA rewrite**, so `/post/:id` 404s on
  refresh. Mitigate with the standard **`404.html` → `index.html`** copy trick
  (the build copies `index.html` to `404.html`), plus a small redirect script, so
  React Router resolves deep links. (Hash routing is the fallback if this proves
  fragile.)
- **Base path:** custom domain serves from root, so Vite `base: '/'`.
- **No secrets in the bundle.** `VITE_FIREBASE_*` values are _public client config_
  (safe to ship); real protection comes from Security Rules + App Check, not from
  hiding the API key.

---

## 3. CI/CD (GitHub Actions)

**On pull request** (`ci.yml`): install → `lint` → `typecheck` → `test`
(unit + component + **Firestore rules tests** on the emulator) → `build`. No deploy.

**On merge to `main`** (`deploy.yml`):

```
jobs:
  build-web → deploy GitHub Pages (actions/deploy-pages)
  deploy-firebase:
    - firebase deploy --only firestore:rules,firestore:indexes,storage --project prod
    - firebase deploy --only functions --project prod
```

- Backend deploy authenticates via **Workload Identity Federation / service
  account** (preferred) or a `FIREBASE_TOKEN` GitHub secret (legacy).
- Rules/indexes deploy **before** functions so new function logic never runs
  against stale rules.
- Tag releases; deploys are reproducible from a tag.

---

## 4. Firebase CLI — local setup

```bash
npm i -g firebase-tools          # or: curl -sL https://firebase.tools | bash
firebase login                   # interactive, opens browser (one time)
firebase projects:list           # verify access
firebase use --add               # map staging + prod aliases
firebase emulators:start         # auth + firestore + functions + storage + UI
# deploys
firebase deploy --only firestore:rules,firestore:indexes --project staging
firebase deploy --only functions --project staging
firebase deploy --project prod   # full deploy
```

Initial one-time provisioning (console or CLI):
`firebase projects:create`, `firebase init` (firestore, functions, storage,
emulators), enable Auth providers (email/password, Google), upgrade to Blaze, set a
budget alert.

---

## 5. Secrets & configuration

| Where                      | What                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| **GitHub Actions secrets** | `FIREBASE_SERVICE_ACCOUNT` (or `FIREBASE_TOKEN`), `VITE_FIREBASE_*` for the build         |
| **Functions runtime**      | Server-side secrets via `firebase functions:secrets:set` (Secret Manager) — never in code |
| **Local**                  | `.env.local` (gitignored) for `VITE_FIREBASE_*`; emulators for the rest                   |

`VITE_FIREBASE_*` keys (public client config): `API_KEY`, `AUTH_DOMAIN`,
`PROJECT_ID`, `STORAGE_BUCKET`, `MESSAGING_SENDER_ID`, `APP_ID`. **Never** commit
service-account JSON or `FIREBASE_TOKEN`.

### Branded transactional email (SendGrid + Trigger Email)

Both Firebase Auth's built-in emails **and** our own branded emails send through
**SendGrid SMTP** so everything is on-brand and deliverable:

- **SMTP:** `smtp.sendgrid.net:587`, STARTTLS, username literally `apikey`, password
  = the SendGrid API key. Configured as the Auth custom SMTP sender **and** as the
  `firestore-send-email` (Trigger Email) extension's transport.
- **Trigger Email extension:** watches the **`mail`** collection; `DEFAULT_FROM` is
  `The CycleVault Social <support@thecyclevault.com>`, `DATABASE_REGION` is
  `us-central1`. Our callables (`sendBrandedPasswordReset`, etc.) render branded HTML
  and enqueue a `mail` doc; the extension sends it and stamps `delivery.state`.
- **Secret:** the SendGrid API key lives in **Secret Manager** (set via the console /
  `firebase functions:secrets:set`), never in the repo. Rotate there if leaked.

---

## 6. AI-assisted Firebase access (Firebase MCP server)

Firebase ships an official **MCP server** that works with **VS Code Copilot** (and
Claude, Cursor, Antigravity, etc.). It lets an AI assistant operate Firebase through
approved tool calls, using **the same credentials as the Firebase CLI** — so the
assistant never sees the founder's Google password.

**One-time enablement:**

1. The founder runs `firebase login` once (interactive, their browser). This stores
   local credentials the MCP server reuses.
2. Add the server to VS Code (`.vscode/mcp.json` or user settings):
    ```json
    {
    	"servers": {
    		"firebase": {
    			"command": "npx",
    			"args": ["-y", "firebase-tools@latest", "mcp", "--dir", "/absolute/path/to/social.thecyclevault.com"]
    		}
    	}
    }
    ```
    Optionally scope tools with `--only auth,firestore,storage,functions`.

**What the assistant can then do (with per-call approval):** create/inspect Firebase
projects, create/manage the Firestore database, read/validate Security Rules, create
indexes, query/read/update Firestore documents, manage Auth users, read function
logs, and run deploys via the `firebase:deploy` prompt.

**Guardrails:**

- Sign-in stays interactive and human-driven (`firebase_login` tool or CLI). No
  secret ever flows through the model.
- Prefer pointing the MCP server at **staging** for experimentation; gate prod
  writes/deploys behind explicit human approval.
- The MCP server respects the active project (`firebase use`); confirm it before
  destructive actions.

> See ADR-0001 §7 for the decision context.

---

## 7. Rollback & recovery

- **Frontend:** redeploy a previous tag, or use the Pages deployment history; the
  prior build is a known-good artifact.
- **Functions:** redeploy the previous tag (`firebase deploy --only functions`).
- **Security Rules / indexes:** **not** auto-versioned by Firebase — they live in
  git, so roll back by deploying the previous committed `firestore.rules` /
  `firestore.indexes.json`. (Keep them in source control; never edit rules only in
  the console.)
- **Firestore data:** enable **scheduled backups / PITR** on prod; document an
  export (`gcloud firestore export`) cadence in the DR runbook.

---

## 8. Disaster recovery (runbook stub)

- Automated Firestore backups (managed export to a Cloud Storage bucket) + optional
  Point-in-Time Recovery on prod.
- `bans`, `moderationActions`, `auditLogs` are append-only → strong forensic trail.
- Incident steps: enable `settings/global.maintenanceMode` (read-only UI) → assess
  → restore from latest export if needed → post-mortem appended to this doc.

---

## 9. Pre-launch checklist

- [ ] Blaze enabled on prod + **budget alert** set.
- [ ] App Check (reCAPTCHA v3) enabled and enforced.
- [ ] Auth providers configured; email verification on.
- [ ] Security Rules + indexes deployed and **rules tests green** in CI.
- [ ] Seed communities created (`general`, `cycle-questions`, `symptoms`,
      `privacy-app-feedback`, `educational-discussion`, `support`).
- [ ] Forum **privacy policy + terms** published (separate from the app's
      local-only policy — see ADR-0001 §4.1).
- [ ] `404.html` fallback verified on Pages with a hard refresh of `/post/:id`.
- [ ] Backups/PITR enabled; DR runbook filled in.
