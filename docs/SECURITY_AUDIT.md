# SECURITY_AUDIT.md — The CycleVault Social

- **Date:** 2026-06-27
- **Scope:** Frontend SPA, Cloud Functions, Firestore/Storage rules, Auth config.
- **Reviewer:** Engineering pass against OWASP Top 10 + Firebase best practices.
- **Related:** [`SECURITY_RULES.md`](./SECURITY_RULES.md), [`adr/0001-foundational-architecture.md`](./adr/0001-foundational-architecture.md)

This is a point-in-time audit. Findings are tracked with severity and status.
Re-run after any change to rules, callables, or auth config.

---

## 0. Executive summary

The platform's security model is **strong by construction**: server-authoritative
writes, fail-closed Firestore rules, no secrets in the repo, no XSS sinks, and
**passwords never touch our systems** (Firebase Auth hashes with scrypt). This audit
found **no critical or high-severity issues**. Four lower-severity items were found
and **all are fixed** in this pass. Several hardening recommendations remain for the
public-launch checklist.

> **Second pass (2026-06-28):** a full deep review of every callable's access
> level, the client route guards, and the reporting flows was run after the
> branded-email, hosting, and admin-user-directory work shipped. It found **1 High**
> (`unbanUser` skipped the account-status check) plus five lower items — **all
> fixed**. See [§6](#6-second-pass--deep-audit-2026-06-28).

---

## 1. Password & credential handling (the headline)

**There is no password for us to leak.** Firebase Authentication is the identity
provider:

- The password goes **browser → Google Identity Platform over TLS**, and is hashed
  there with **scrypt** (a memory-hard algorithm, Google-tuned).
- No password — plaintext or hashed — is ever stored in our Firestore, Cloud
  Functions, logs, or client bundle. There is nothing for us to encrypt at rest
  because the credential never reaches our systems.
- **Email-enumeration protection** is enabled in prod, so sign-in/reset responses
  don't reveal which emails are registered.
- **Password policy** (client): ≥ 8 chars, ≥ 1 letter, ≥ 1 number, common-password
  blocklist. The durable protection is scrypt + Identity Platform rate limiting.
- **Password reset** uses Firebase `sendPasswordResetEmail`; the UI always shows a
  neutral confirmation (no enumeration).

This is the correct, industry-standard posture; rolling our own password storage
would be strictly worse.

---

## 2. Findings & fixes

| ID      | Severity | Finding                                                                                                                                                                                                                         | Status               |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **M-1** | Medium   | `avatarUrl` was in the client-writable profile allow-list but unvalidated. With no upload flow yet, a crafted direct write could set a `javascript:`/tracking URL that becomes an XSS/SSRF/tracking vector when avatars render. | ✅ Fixed             |
| **L-1** | Low      | `createUserProfile` had no rate limit (every other mutating callable does).                                                                                                                                                     | ✅ Fixed             |
| **L-2** | Low      | App Check was wired client-side but **not enforced** server-side, so callables couldn't reject non-app traffic.                                                                                                                 | ✅ Fixed (env-gated) |
| **L-3** | Low      | Profile-update rule assumed `bio`/`displayName` are strings; a non-string write could error or slip the length check.                                                                                                           | ✅ Fixed             |
| **F-1** | Missing  | No password-reset ("forgot password") flow.                                                                                                                                                                                     | ✅ Added             |

### Fix detail

- **M-1:** `avatarUrl` removed from the rules' `changedKeysWithin` allow-list — it
  is now **function-only**, to be set by a validated upload flow in Phase 2. The
  client `updateMyProfile` already never wrote it.
- **L-1:** added a `createProfile` rate limit (5/hour/uid).
- **L-2:** centralized App Check enforcement in `requireAuth` — when the
  `ENFORCE_APP_CHECK` function env var is `true`, callables without a verified App
  Check token are rejected. Off by default (no impact on emulator or pre-key prod);
  flip on after registering a reCAPTCHA v3 key (see §5).
- **L-3:** rule now requires `bio is string` / `displayName is string` before the
  length checks.
- **F-1:** "Forgot password?" on the sign-in form → `sendPasswordResetEmail`, with a
  neutral, enumeration-safe confirmation.

---

## 3. OWASP Top 10 review

| Risk                                   | Assessment                                                                                                                                                                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A01 Broken Access Control**          | Strong. All privileged writes go through Cloud Functions with role checks (`requireRole`, `requireModeratorOf`); Firestore rules fail closed; no client path to `role`/`status`/`karma`/counters/`badges`. Rules-test suite asserts the capability matrix (allow + deny). |
| **A02 Cryptographic Failures**         | Passwords: scrypt at Identity Platform (we never see them). All transport HTTPS. No sensitive data stored to encrypt (no PII/health/IP).                                                                                                                                  |
| **A03 Injection**                      | No SQL. Firestore parameterized via SDK. No `eval`/`Function`. User content rendered as text by React (auto-escaped); **no `dangerouslySetInnerHTML` anywhere** (verified). Server input validated with Zod on every callable.                                            |
| **A04 Insecure Design**                | Server-authoritative, least-privilege, append-only audit logs, rate limits, deterministic vote IDs. Privacy boundary documented (ADR-0001).                                                                                                                               |
| **A05 Security Misconfiguration**      | Fail-closed default-deny rule. App Check enforcement available. Budget alerts + maxInstances cap. No debug endpoints.                                                                                                                                                     |
| **A06 Vulnerable Components**          | 0 vulnerabilities in **production** deps (web + functions). Dev-only advisories don't ship. `npm audit` in CI recommended (see §5).                                                                                                                                       |
| **A07 Identification & Auth Failures** | Firebase Auth; email-verification gate before first post/comment; email-enumeration protection; rate limits; suspension/ban enforced server-side.                                                                                                                         |
| **A08 Software & Data Integrity**      | CI runs lint/typecheck/tests + rules/e2e before any deploy. Deploy is gated/manual. No untrusted plugins.                                                                                                                                                                 |
| **A09 Logging & Monitoring**           | `moderationActions` + `auditLogs` (append-only, admin-only). No IP/PII logged. Function logs available.                                                                                                                                                                   |
| **A10 SSRF**                           | No server-side fetch of user-supplied URLs. (avatarUrl now function-only removes the future client vector.)                                                                                                                                                               |

---

## 4. Strengths (keep these)

- Server-authoritative writes; fail-closed rules; default-deny catch-all.
- No secrets in the repo; `.env.local` and any service-account JSON gitignored.
- `VITE_FIREBASE_*` are public client config (safe to ship) — protection is rules +
  App Check, not obscurity.
- PII minimization: no real name, no health/cycle data, no precise location, **no
  IP** ever stored.
- Rate limiting on every mutating callable; report de-duplication; account-age and
  email-verification gates.

---

## 5. Recommendations (launch-hardening checklist)

These are **not** open vulnerabilities — they're defense-in-depth for go-live:

- [ ] **Register a reCAPTCHA v3 key** for App Check, set `VITE_RECAPTCHA_SITE_KEY`,
      and enable **enforcement** per service (Firestore + Functions). Then set the
      `ENFORCE_APP_CHECK=true` function env var and redeploy.
- [ ] **AI + human content moderation** so unvetted content can't reach a health
      audience unchecked — designed in [`MODERATION_AI.md`](./MODERATION_AI.md) and
      implemented in this codebase (status-gating + queue + admin review).
- [ ] **Re-authentication for destructive actions** (account deletion): require a
      recent login before `deleteMyAccount` to limit stolen-session blast radius.
- [ ] **`npm audit` (prod) as a CI gate** to catch newly-disclosed advisories.
- [ ] **Markdown sanitization** (DOMPurify) **before** enabling any rich-text/markdown
      rendering — today bodies are plain text and safe.
- [ ] **Security headers / CSP** where the host allows (GitHub Pages is limited; a
      future Firebase Hosting or proxy could add a strict Content-Security-Policy).
- [ ] **Backups/PITR** enabled on prod Firestore (also in `DEPLOYMENT_PLAN.md`).

---

## 6. Second pass — deep audit (2026-06-28)

Full end-to-end review after the branded-email / Hosting / admin-user-directory
work: every Cloud Function re-checked for its auth gate and access level, the
client route guards re-read, the reporting flows and privacy/account paths
re-walked, and all automated tests (25 function + 26 rules) re-run green.

### Findings & fixes

| ID      | Severity | Finding                                                                                                                                                                                                              | Status   |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| **H-1** | High     | `unbanUser` gated on `requireAuth` + `requireRole(admin)` but **not** account status, so a **banned admin** could still call it and reinstate themselves or others (privilege-retention). Every other admin action uses `requireActiveUser`. | ✅ Fixed |
| **M-2** | Medium   | `ProtectedRoute` role check `ROLE_RANK[role] < ROLE_RANK[min]` **failed open** for an unknown/corrupt `role` (`undefined < n` is `false` in JS), so a broken profile could reach the admin/mod shell (server still blocked all actions). | ✅ Fixed |
| **M-3** | Medium   | Signup did `signUp` → `createUserProfile` with no rollback. If profile creation failed (e.g. a username lost the TOCTOU race), the Auth account was left **orphaned with no profile**, trapping the user in a profile-less session. | ✅ Fixed |
| **M-4** | Medium   | `exportMyData` read the caller's posts/comments/votes with **no limit** — a prolific or abusive account could OOM the function.                                                                                       | ✅ Fixed |
| **L-4** | Low      | `searchUsers` (admin directory) had **no rate limit**, so a compromised admin session could bulk-scrape the member directory.                                                                                        | ✅ Fixed |
| **L-5** | Low      | The `reportContent` pipeline supported `targetType: "user"` and the moderation queue rendered user reports, but there was **no UI** to report a member — the capability was unreachable.                             | ✅ Added |
| **L-6** | Low      | "Report a problem" captured its debug context (route/url/timestamp) when the modal **opened**, so it could be stale if the reporter navigated before submitting.                                                     | ✅ Fixed |

### Fix detail

- **H-1:** `unbanUser` now uses `const { auth, profile } = await requireActiveUser(request); requireRole(profile, "admin");` — mirroring `banUser` / `restoreContent`. A banned/suspended admin is rejected before the unban runs. (`functions/src/moderation/moderation.ts`)
- **M-2:** the guard coerces an unknown role to rank `-1` (`ROLE_RANK[profile.role] ?? -1`) so it **fails closed** — a corrupt profile can never satisfy a mod/admin gate. (`web/src/components/ProtectedRoute.tsx`)
- **M-3:** on `createUserProfile` failure the just-created Auth account is rolled back (`created.delete()`, falling back to sign-out) so the user can retry cleanly instead of being trapped. (`web/src/features/auth/LoginPage.tsx`)
- **M-4:** each export query is now bounded (`.limit(10_000)`), with a `truncated` flag in the payload so an over-cap export is honest and support can help with the remainder. (`functions/src/users/account.ts`)
- **L-4:** added a `searchUsers` budget (120/hour/uid) enforced by admin uid. (`functions/src/shared/rateLimit.ts`, `functions/src/admin/users.ts`)
- **L-5:** added a calm **Report** action on member profiles (`ReportUserModal`) that reuses the same `reportContent` pipeline (targetType `user`), so reports land in the one moderation queue. (`web/src/features/profile/ReportUserModal.tsx`, `web/src/pages/ProfilePage.tsx`)
- **L-6:** the debug context is re-collected at **submit** time, so route/url/timestamp reflect where the reporter actually is. (`web/src/features/support/ReportIssueModal.tsx`)

### Reviewed and accepted (no change needed)

- **Admin sees registration email in the user directory** — this is intentional:
  the directory is the **support** tool, and looking someone up by the email they
  wrote in from is the point. Email is only returned on an exact-email lookup, never
  bulk-listed, and role/deletion remain **superadmin-only**.
- **`suspendUser` schema allows `durationHours` up to 8760** while moderators are
  capped at 168h in logic — the server enforces the cap regardless of input, so the
  wider schema is cosmetic, not a hole.
- **`stripUndefined` only strips top-level keys** — every callable payload in the
  app is flat, so there is no nested-undefined case to handle today.
- **`anonymizeAuthored` stops after 1000 iterations** (≈450k authored items) and
  **`reindexSearchEmbeddings` processes 500 docs/run** — both are far above current
  volume and safe to re-run; noted for the scaling checklist, not bugs.

---

## 7. Sign-off

No critical/high findings. All medium/low findings fixed in commit accompanying this
document. Recommended items are tracked on the launch checklist above. Re-audit on
any change to `firestore.rules`, callable auth/validation, or Auth provider config.
