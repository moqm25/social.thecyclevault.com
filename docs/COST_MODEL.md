# COST_MODEL.md — The CycleVault Social

- **Status:** Phase 0 spec (Accepted)
- **Date:** 2026-06-26
- **Owner:** [`adr/0001-foundational-architecture.md`](./adr/0001-foundational-architecture.md)

Goal: keep the forum at or near **$0/month** at launch and grow cost **sub-linearly**
with users. Hosting is free (GitHub Pages); the variable cost is Firebase.

> Free-tier figures below are verified against the Firebase pricing page
> (2026-06-26). **Overage unit prices are approximate and region-dependent — always
> confirm current rates at <https://firebase.google.com/pricing> before budgeting.**

---

## 1. Free allotments (no-cost)

| Service                    | No-cost allowance                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Cloud Firestore**        | 1 GiB stored; **50K reads/day**, **20K writes/day**, **20K deletes/day** (≈ 1.5M / 600K / 600K per month) |
| **Authentication**         | **50,000 MAU** (excluding SAML/OIDC)                                                                      |
| **Cloud Functions**        | **2M invocations/mo**, 400K GB-seconds, 200K CPU-seconds, 5 GB egress                                     |
| **Cloud Storage**          | 5 GB stored, ~1 GB/day download, ~20K uploads + 50K downloads/day                                         |
| **GitHub Pages (hosting)** | Free (static) — we don't use Firebase Hosting                                                             |

The free Firestore quota resets **daily**. Functions/Storage/Auth allowances are
**monthly** and apply even on Blaze before charges begin.

---

## 2. Approximate overage rates (verify before relying on these)

| Resource                    | ~Rate (US)                                   |
| --------------------------- | -------------------------------------------- |
| Firestore document reads    | ~$0.06 / 100K                                |
| Firestore document writes   | ~$0.18 / 100K                                |
| Firestore document deletes  | ~$0.02 / 100K                                |
| Firestore stored data       | ~$0.18 / GiB / month                         |
| Cloud Functions invocations | ~$0.40 / million (+ compute GB-/CPU-seconds) |
| Cloud Storage stored        | ~$0.026 / GB / month                         |
| Cloud Storage download      | ~$0.12 / GB                                  |
| Auth MAU beyond 50K         | tiered per-MAU (Identity Platform)           |

---

## 3. The dominant cost driver: Firestore reads

A forum is read-heavy, and **reads are the line item most likely to exceed free
tier first** — well before writes, storage, or function invocations.

**Worked example (active small community):** 1,000 daily active users, each session
= load a feed (~30 posts ≈ 30 reads) + open ~3 threads (~20 reads each ≈ 60) ≈
**~90 reads/session**.

```
1,000 DAU × 90 reads = 90,000 reads/day
Free tier            = 50,000 reads/day
Billable             = 40,000 reads/day ≈ 1.2M reads/month
Cost                 ≈ 1.2M × $0.06/100K ≈ $0.72/month   (before optimization)
```

With the optimizations in §5 (caching, pagination, denormalized counters), effective
reads commonly drop **2–4×**, often pulling usage **back under the free tier**.
Conclusion: **Stage 1 cost is ~$0–a few dollars/month.**

---

## 4. Cost by growth stage (rough, optimized)

| Stage       | Users        | Expected Firebase cost                                     |
| ----------- | ------------ | ---------------------------------------------------------- |
| **Launch**  | 0–1k MAU     | **$0** (within free tier)                                  |
| **Stage 1** | 1k–10k MAU   | **$0–$15/mo** (mostly reads; maybe a little storage)       |
| **Stage 2** | 10k–100k MAU | **~$20–$200/mo** + search provider (see `SCALING_PLAN.md`) |
| **Stage 3** | 100k+ MAU    | Re-evaluate architecture; low-hundreds–$1k+/mo             |

Auth stays free to 50K MAU; functions rarely dominate at these scales; storage is
trivial until image uploads (Phase 2).

---

## 5. Cost-control levers (build these in from day one)

1. **Denormalized counters.** Read `post.score` / `commentCount` from the doc — never
   count vote/comment docs at read time. (Already in `DATA_MODEL.md`.)
2. **Pagination, always.** Feeds and threads load in bounded pages (e.g. 20–30) with
   cursors; **no unbounded `getDocs`**.
3. **Client cache (TanStack Query).** Dedupe and cache reads; serve revisits from
   cache; background-refresh. This is the single biggest read reducer.
4. **Avoid `get()` in hot rules.** Gate only rare mutations with `get()`; high-volume
   reads use field checks (`status == 'active'`). (See `SECURITY_RULES.md`.)
5. **Aggregate in functions, not on read.** Counters maintained on write via
   `FieldValue.increment`, so reads stay $O(1)$.
6. **Bounded notifications.** Cap inbox queries; mark-read in batches.
7. **Defer Storage.** No image uploads until Phase 2; avatars are small/cached.

---

## 6. Budget controls (mandatory before prod)

- Set a **Cloud Billing budget + alert** (e.g. alert at $5, $25, $100) on the prod
  project. Blaze has **no hard spend cap**, so alerts are the safety net.
- Optional: a billing-alert → Pub/Sub → function that flips
  `settings/global.maintenanceMode = true` (read-only mode) if spend spikes
  abnormally — a circuit breaker against runaway reads or abuse.
- Watch the **Firestore usage dashboard** weekly during early growth.
- Keep **App Check + rate limits** on; scripted abuse is also a _cost_ attack.

---

## 7. Non-Firebase costs (context)

| Item                                           | Cost                                       |
| ---------------------------------------------- | ------------------------------------------ |
| Domain `thecyclevault.com` (covers subdomains) | already paid (~$51/2yr)                    |
| GitHub (repos, Actions, Pages)                 | $0 (free tier)                             |
| Search provider (Stage 2)                      | Algolia/Meilisearch free tier → paid later |
| Email (transactional, if added)                | deferred; free tiers exist                 |

**Bottom line:** launch is effectively free; the first real bill is Firestore reads
in the low-single-digit dollars, and disciplined caching/pagination keeps it there
for a long time.
