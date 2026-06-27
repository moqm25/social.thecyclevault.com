# TESTING_PLAN.md — The CycleVault Social

- **Status:** Phase 0 spec (Accepted)
- **Date:** 2026-06-26
- **Owner:** [`adr/0001-foundational-architecture.md`](./adr/0001-foundational-architecture.md)

Testing strategy for a security-sensitive, server-authoritative forum. The highest-
value tests here are **Security Rules tests** and **Cloud Function tests** — because
that layer is where integrity and privacy are enforced.

---

## 1. Test pyramid

```
        ┌─────────────────────────┐
        │   E2E (few, critical)   │  Playwright — real flows in a browser
        ├─────────────────────────┤
        │ Integration: rules +    │  Emulator Suite — the heart of our coverage
        │ functions (many)        │
        ├─────────────────────────┤
        │ Component (some)        │  React Testing Library
        ├─────────────────────────┤
        │ Unit (lots, fast)       │  Vitest — pure logic, Zod schemas, ranking
        └─────────────────────────┘
```

- **TypeScript strict mode** + **ESLint** are the zeroth gate (compile/lint must pass).
- All tiers run against the **Firebase Local Emulator Suite** where Firebase is
  involved — never against a live project.

---

## 2. Tooling

| Layer           | Tool                                                     |
| --------------- | -------------------------------------------------------- |
| Unit            | **Vitest**                                               |
| Component       | **React Testing Library** + Vitest + jsdom               |
| Security Rules  | **`@firebase/rules-unit-testing`** (Firestore emulator)  |
| Cloud Functions | **`firebase-functions-test`** + Firestore/Auth emulators |
| E2E             | **Playwright** (against `npm run dev` + emulators)       |
| Lint/Types      | **ESLint**, **tsc --noEmit**                             |

---

## 3. Unit tests (Vitest)

Pure, fast, no I/O. Targets:

- **Zod schemas** for every function input (valid + invalid + boundary lengths).
- **Ranking math** (`hotRank` formula — sign, decay, ties).
- **Vote reducer logic** (none→up, up→down flip = ±2, up→none, idempotent repeat).
- **Utilities** (slugify, depth capping, mention parsing, time formatting).
- **Permission helpers** (role hierarchy comparisons).

---

## 4. Security Rules tests (highest priority)

Using `@firebase/rules-unit-testing` against the Firestore emulator, assert **every
row of the capability matrix** in [`SECURITY_RULES.md`](./SECURITY_RULES.md) §2 —
both allowed and denied. Required negative cases:

- A user **cannot** write `role`, `status`, `karma`, or any counter on their own
  `users` doc (field-smuggle attempt).
- A user **cannot** escalate to `moderator`/`admin` by any path.
- A user **cannot** read another user's `votes`, `notifications`, `reports`, or any
  `auditLogs`.
- A user **cannot** write `posts`/`comments`/`votes` directly (functions-only).
- A guest **cannot** read `removed`/`deleted` content; a mod can.
- A recipient may set `notifications.read = true` but **cannot** change any other
  field.
- Default-deny: an undefined collection path rejects all access.

> **CI gate:** rules do not deploy unless these tests pass.

---

## 5. Cloud Function tests

Using `firebase-functions-test` + emulators. For each function in
[`API_CONTRACT.md`](./API_CONTRACT.md):

- **Auth required** → `unauthenticated` when missing.
- **Validation** → `invalid-argument` on bad input (driven by the Zod cases).
- **Authorization** → non-mods rejected from mod actions; mods scoped to their
  communities; only superadmin can `setUserRole`.
- **Happy path** writes exactly the expected documents and counters
  (`createPost` increments `users.postCount` and `communities.postCount`, etc.).
- **Transactions** → `voteOnPost` flip yields net ±2; double-submit is idempotent;
  concurrent votes don't double-count.
- **Rate limits** → `resource-exhausted` past the threshold.
- **Side effects** → `createComment` enqueues a notification (and never self-notifies).
- **Bans/suspensions** → suspended/banned users blocked from writes.

---

## 6. Component tests (React Testing Library)

- **States:** every data view renders Loading / Empty / Error / Loaded
  (`UI_REQUIREMENTS.md` §5).
- **VoteControl:** optimistic update + rollback on failure; guest sees sign-in nudge.
- **Composer:** validation, character counters, disclaimer present, disabled on
  locked posts.
- **Permission-gated UI:** mod/admin controls hidden for normal users.
- **Accessibility smoke:** labelled icon buttons, focus order, reduced-motion
  (jest-axe optional).

---

## 7. E2E tests (Playwright — few, critical)

Run against Vite dev + emulators. Critical flows:

1. **Register** → reserve username → land in feed.
2. **Create post** → appears in community feed → open detail.
3. **Comment** → reply nests correctly → author gets a notification.
4. **Vote** → score updates optimistically and persists on reload.
5. **Report** → item enters `/mod` queue.
6. **Moderate** → mod removes content → it disappears for normal users.
7. **Deep-link refresh** → hard-refresh `/post/:id` resolves (Pages 404 fallback).
8. **Auth gating** → guest is blocked from posting/voting with a sign-in prompt.

---

## 8. Critical flows (must always be green)

Registration · username reservation · post creation · comment creation · voting ·
reporting · moderation removal · role enforcement · account deletion/export. A
regression in any of these blocks release.

---

## 9. Coverage & CI gates

- **Targets:** ~90%+ on functions + rules + core logic (the integrity layer);
  pragmatic coverage on UI. Coverage is a guide, not a vanity number — the
  capability-matrix and critical-flow suites matter more than a percentage.
- **PR (`ci.yml`):** lint → typecheck → unit → component → **rules tests** →
  **function tests** → build. All required to merge.
- **Pre-deploy:** the same suite plus E2E smoke; rules/indexes/functions deploy only
  on green (`DEPLOYMENT_PLAN.md` §3).
- **Flake policy:** quarantine and fix; never disable a security test to go green.

---

## 10. Manual test passes

Before each release, a short scripted manual pass on a real device for:
moderation dashboard usability, dark mode, keyboard-only navigation, and the
medical-disclaimer/empty-state copy. Documented as a checklist in the PR.
