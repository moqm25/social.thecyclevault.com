# ADR-0001: Foundational Architecture for The CycleVault Social

- **Status:** Accepted
- **Date:** 2026-06-26
- **Deciders:** Moiez Qamar (founder)
- **Supersedes:** —
- **Related:** [`Architecture.md`](../Architecture.md), [`SOCIAL_FORUM_ROADMAP.md`](../SOCIAL_FORUM_ROADMAP.md)

> Architecture Decision Records capture a single significant decision, its context,
> the options weighed, and the consequences. This is the foundational record for
> `social.thecyclevault.com`. Future material decisions get their own numbered ADR.

---

## 1. Context

The CycleVault is a privacy-first iOS menstrual-cycle tracker. Its entire brand
promise is **"Private. Local. Yours."** — cycle data is stored only on the user's
device (Core Data / SQLite), there are no accounts, no analytics SDKs, and no
cloud. See `versions.txt` and the marketing site for the public commitments.

We now want a **community** so users can ask questions, share experiences, give
app feedback, and discuss cycle health. A community is inherently the opposite of
"local-only": it requires accounts, a shared server, and public content. This ADR
exists primarily to resolve that tension **without breaking the privacy promise**,
and to lock in the foundational technology choices before any code is written.

The platform is `social.thecyclevault.com` — a Reddit-style forum. Constraints that
shaped this decision:

- **Solo indie founder, near-zero budget.** Total project spend to date is ~$157
  (domain + Apple Developer). Operational cost and maintenance burden must stay
  near zero at launch and scale sub-linearly with users.
- **No dedicated ops team.** Managed/serverless infrastructure strongly preferred
  over anything we have to patch, scale, or monitor by hand.
- **Privacy reputation is the company's core asset.** A data breach or a "your
  period app sells your data" headline would be existential. The forum must be
  architected so it _cannot_ leak app cycle data, because it never holds any.
- **Mobile-first, premium "calm" UI** consistent with the app and marketing site.
- **AI-agent-friendly codebase** — the founder builds with AI assistants, so the
  stack should be mainstream, typed, and well-documented.

---

## 2. Decision Drivers

1. Preserve and visibly reinforce the privacy promise.
2. Minimize fixed cost (ideally $0 at launch) and operational overhead.
3. Fast time-to-ship for a solo developer.
4. Security by default — least privilege, server-authoritative writes.
5. Scales from 0 to ~100k users without a re-platform.
6. Mainstream, typed, well-documented tools (AI-assistant friendly).
7. Brand-consistent, accessible, mobile-first frontend.

---

## 3. Decision (summary)

Build `social.thecyclevault.com` as a **statically-hosted React + TypeScript SPA**
on **GitHub Pages**, backed by **Firebase** (Authentication, Cloud Firestore,
Cloud Functions, Storage) as a serverless BaaS. All sensitive writes go through
**Cloud Functions** (server-authoritative); the client never writes privileged
fields directly. The forum is a **separate, opt-in, pseudonymous** service that
holds **none** of the iOS app's local cycle data.

The sub-decisions below each carry their own rationale.

---

## 4. Sub-decisions & rationale

### 4.1 Privacy boundary — the forum is a separate, pseudonymous service

**Decision.** The forum is architecturally and legally distinct from the iOS app.
It stores only what a user _deliberately types into a public forum_. It never
imports, links to, or has any channel to the app's on-device cycle data.

Concretely:

- **No shared identity.** App = no account. Forum = its own Firebase Auth account.
  There is no "sign in with your CycleVault data," because the app has no account
  to sign in with. The two systems share a brand, not a user record.
- **Pseudonymous by default.** Profiles are username-based. No real name required,
  no cycle history, no symptom data, no location. Email is used only for auth and
  is never public (see [`SECURITY_RULES.md`](../SECURITY_RULES.md)).
- **One-way wall.** Even in future (e.g. a v1.x "open the forum from the app"
  link), the app will only ever _open a URL_. It will never POST cycle data.
- **Distinct privacy policy.** The forum needs its own privacy policy covering
  Firebase as a processor; it must not muddy the app's "local-only" claim. The
  app's privacy page keeps stating the app is local-only; a separate forum policy
  covers the forum.

**Why this matters.** Without this explicit boundary, adding a cloud community
would contradict the homepage ("no servers that see it"). With it, the promise is
intact: _the app_ is still local-only; _the forum_ is a normal, well-secured,
minimal-data community that users opt into separately.

### 4.2 Frontend — React + TypeScript + Vite SPA

**Decision.** React 18 + TypeScript (strict) + Vite, with React Router, Tailwind
CSS, TanStack Query (server-state/caching), Zod (validation), React Hook Form.

- **Considered:** Next.js (SSR/SSG), SvelteKit, plain HTML/JS (like the marketing
  site), Astro.
- **Why React+Vite over Next.js:** We are hosting on GitHub Pages (static only).
  Next.js's value is SSR/ISR/server components, which GitHub Pages can't run; using
  it here would mean fighting the framework. A Vite SPA deploys as plain static
  files — perfect for Pages — with a tiny, fast toolchain.
- **Why not plain HTML/JS:** The marketing site is static and content-driven; a
  forum is a stateful app (auth, optimistic voting, infinite feeds, live data). A
  component framework with typed state pays for itself immediately.
- **Trade-off:** SPAs are client-rendered, so SEO and first-paint need care. The
  forum is behind interaction and largely user-generated; SEO is not a launch goal.
  We mitigate first-paint with code-splitting and a <300 KB initial JS budget.

### 4.3 Backend — Firebase (managed BaaS) over a custom server

**Decision.** Use Firebase: Authentication, Cloud Firestore, Cloud Functions,
Storage.

- **Considered:** Firebase, Supabase, a custom Node/Postgres API on a VPS,
  Pocketbase, AWS Amplify.
- **Why Firebase:** Generous always-free tier (see [`COST_MODEL.md`](../COST_MODEL.md)),
  fully managed (no servers to patch), real-time listeners out of the box, mature
  security-rules layer, first-class emulator suite for local dev and rule testing,
  and — decisively for this project — an official **Firebase MCP server that
  supports VS Code Copilot**, letting the founder's AI assistant operate the
  backend directly (see §7).
- **Why not Supabase:** Excellent product and SQL is appealing, but its free tier
  pauses idle projects and the relational model adds migration overhead for a solo
  dev. Firebase's document model maps cleanly to a forum and stays free at rest.
- **Why not a custom VPS:** Re-introduces exactly the burden we're avoiding —
  patching, scaling, backups, uptime, a monthly bill from day one.
- **Trade-off / lock-in:** Firebase is proprietary. We accept lock-in for the
  backing services but **isolate it behind a thin `lib/firebase` + `lib/api`
  layer** so the app code depends on our interfaces, not the SDK directly. This
  keeps a future migration (Stage 3, 100k+ users) tractable.

### 4.4 Hosting — GitHub Pages

**Decision.** Serve the SPA from GitHub Pages on `social.thecyclevault.com`
(CNAME already present), deployed via GitHub Actions.

- **Considered:** GitHub Pages, Firebase Hosting, Vercel, Cloudflare Pages.
- **Why GitHub Pages:** $0, already in use for `thecyclevault.com` and the existing
  social placeholder, zero new vendors, and the code already lives on GitHub.
- **Known gotcha:** Pages has no SPA fallback, so deep links (e.g.
  `/post/:id`) 404 on refresh. We mitigate with the standard `404.html` →
  `index.html` redirect trick (documented in [`DEPLOYMENT_PLAN.md`](../DEPLOYMENT_PLAN.md)).
- **Why not Firebase Hosting:** It's a fine alternative (and would simplify the SPA
  rewrite), but keeping marketing + social on the same Pages workflow reduces moving
  parts. Revisit if the 404 trick proves painful.

### 4.5 Server-authoritative writes (trust the server only)

**Decision.** Clients may read public content directly from Firestore (cheap, fast,
real-time). All **privileged or integrity-sensitive writes** — vote aggregation,
karma, role changes, moderation, username reservation, score/counters — go through
**Cloud Functions**, never direct client writes. Firestore Security Rules **fail
closed** and forbid client writes to those fields.

- **Why:** A forum's integrity (no vote-stuffing, no self-promotion to admin, no
  forged karma) cannot be enforced on the client. Centralizing mutations in
  Functions gives one validated, rate-limited, auditable choke point.
- **Trade-off:** Cloud Functions require the **Blaze (pay-as-you-go) plan**, and
  add cold-start latency. Cost stays ~$0 within the free monthly grant at our scale
  (see [`COST_MODEL.md`](../COST_MODEL.md)); cold starts are acceptable for write
  actions and mitigated with min-instances only if needed.

### 4.6 Notifications: basic in MVP, web push later

**Decision.** Ship **basic in-app notifications** (reply, mention, moderator action)
in the MVP via a `notifications` collection + `createNotification` /
`markNotificationRead` functions. **Web push** is deferred to Phase 2.

- **Why:** This is the one place the two planning docs disagreed (Architecture had
  notifications in MVP; the roadmap had them later). A forum's core loop —
  "someone replied to you, come back" — is materially weaker without it, and the
  in-app version is cheap (it's just another Firestore collection we already
  secure). Web push adds service-worker + token plumbing and is genuinely Phase 2.
- This ADR records the resolution; both docs are now aligned to it.

### 4.7 Anonymous read, authenticated write

**Decision.** Guests can browse all active public content. Creating posts/comments,
voting, and reporting require an authenticated account. Email/password is the
primary auth method; Google sign-in is optional.

- **Why:** Maximizes reach and SEO-able landing while keeping a clear abuse
  boundary (account age + rate limits gate participation). Matches the roadmap.

---

## 5. Consequences

**Positive**

- Privacy promise preserved and _strengthened_ by an explicit, documented wall
  between the local-only app and the pseudonymous forum.
- ~$0 fixed cost at launch; pay only after crossing generous free grants.
- No servers to operate; managed auth, DB, functions, storage.
- Strong security posture by construction (server-authoritative writes, fail-closed
  rules, audit logs).
- AI-assistant operable end-to-end via the Firebase MCP server.
- Clear 0→100k scaling path with no re-platform (see [`SCALING_PLAN.md`](../SCALING_PLAN.md)).

**Negative / costs**

- Firebase vendor lock-in (mitigated by an isolation layer).
- Blaze plan required for Functions — a billing account must exist, so cost
  monitoring and budget alerts are mandatory from day one.
- SPA on GitHub Pages needs the 404-fallback workaround and has weaker SEO/first
  paint than SSR.
- A second, separate privacy policy and Terms must be authored for the forum so the
  app's "local-only" claim stays clean and true.

**Risks & mitigations**

- _Firestore hot-document contention_ on popular posts' counters → distributed
  counters / sharded aggregation in Functions (see `SCALING_PLAN.md`).
- _Runaway reads = runaway cost_ → pagination, caching via TanStack Query,
  denormalized counters, and budget alerts (see `COST_MODEL.md`).
- _Abuse/brigading on sensitive health topics_ → rate limits, account-age gates,
  reporting everywhere, audit trail, and an explicit moderation system
  (see [`MODERATION_PLAN.md`](../MODERATION_PLAN.md)).
- _Brand confusion ("is my cycle data in the forum?")_ → prominent, repeated
  copy clarifying the boundary; distinct forum privacy policy.

---

## 6. Gate

Per both planning docs, **no implementation begins until the Phase 0 documents are
approved.** This ADR is the umbrella decision; the supporting documents in §8 are
the detailed specifications it commits us to.

---

## 7. Note on AI-assisted operation (Firebase access)

Firebase ships an official **MCP server** (`npx -y firebase-tools@latest mcp`) that
works with **VS Code Copilot**. Once the founder runs `firebase login` once
(interactive, in their own browser — no credentials ever pass through the
assistant), the assistant can drive Firebase through approved tool calls:
create/inspect projects, manage Firestore data and indexes, validate and read
security rules, manage Auth users, read function logs, and run `firebase deploy`.
This is detailed for setup in [`DEPLOYMENT_PLAN.md`](../DEPLOYMENT_PLAN.md). It does
not change the architecture; it changes _who/what executes_ it.

---

## 8. Supporting documents (Phase 0 deliverables)

This ADR references and is fleshed out by:

- [`DATA_MODEL.md`](../DATA_MODEL.md) — Firestore collections, fields, indexes, denormalization.
- [`API_CONTRACT.md`](../API_CONTRACT.md) — Cloud Function signatures, validation, errors, rate limits.
- [`SECURITY_RULES.md`](../SECURITY_RULES.md) — Firestore/Storage rules strategy and sketches.
- [`MODERATION_PLAN.md`](../MODERATION_PLAN.md) — roles, reports, actions, audit, abuse prevention.
- [`UI_REQUIREMENTS.md`](../UI_REQUIREMENTS.md) — brand system, pages, components, states, a11y.
- [`DEPLOYMENT_PLAN.md`](../DEPLOYMENT_PLAN.md) — Pages + Firebase deploy, CI/CD, environments, Firebase access.
- [`COST_MODEL.md`](../COST_MODEL.md) — free-tier limits, unit costs, projections, controls.
- [`SCALING_PLAN.md`](../SCALING_PLAN.md) — stages, hotspots, search migration, limits.
- [`TESTING_PLAN.md`](../TESTING_PLAN.md) — test pyramid, rules tests, critical flows, CI.
