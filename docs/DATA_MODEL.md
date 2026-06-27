# DATA_MODEL.md — The CycleVault Social

- **Status:** Phase 0 spec (Accepted)
- **Date:** 2026-06-26
- **Owner:** [`adr/0001-foundational-architecture.md`](./adr/0001-foundational-architecture.md)
- **Database:** Cloud Firestore (Native mode), single default database

This document is the authoritative schema for every Firestore collection. It maps
directly to `firestore.indexes.json` and is enforced by
[`SECURITY_RULES.md`](./SECURITY_RULES.md) and [`API_CONTRACT.md`](./API_CONTRACT.md).

---

## 0. Modeling principles

1. **Data minimization.** We store the least we can. **No email, no real name, no
   health/cycle data, no precise location, no IP** is stored in Firestore. Email
   lives only in Firebase Auth. (See the privacy boundary in ADR-0001 §4.1.)
2. **Server-authoritative writes.** Integrity fields (`role`, `status`, `score`,
   `karma`, all counters) are written **only by Cloud Functions**. Clients cannot
   write them; rules forbid it.
3. **Denormalize for reads, reconcile in functions.** Forums are read-heavy. We
   snapshot cheap display data (`authorUsername`) onto posts/comments to avoid
   fan-out reads. Counters are kept current with `FieldValue.increment`.
4. **Deterministic IDs to enforce invariants.** Uniqueness (usernames) and
   one-vote-per-user are enforced by document IDs, not queries.
5. **Soft delete only.** Content is never hard-deleted in MVP; a `status` field
   drives visibility. Account deletion anonymizes (see §15).
6. **Timestamps everywhere.** Every document has `createdAt` and (where mutable)
   `updatedAt`, written server-side (`serverTimestamp()`).

### Field type legend

`string` · `number` · `bool` · `ts` (Timestamp) · `map` · `array<T>` · `ref`
(string holding another doc's ID) · `enum(...)` · `?` (nullable/optional).

---

## 1. Collection overview

| Collection          | Doc ID                          | Written by                                  | Client read                 |
| ------------------- | ------------------------------- | ------------------------------------------- | --------------------------- |
| `users`             | auth `uid`                      | Functions (+ user edits own profile fields) | public (profile subset)     |
| `usernames`         | `usernameLower`                 | Functions only                              | public (existence check)    |
| `communities`       | `slug`                          | Functions / admin                           | public                      |
| `posts`             | auto-ID                         | Functions only                              | public if `active`          |
| `comments`          | auto-ID                         | Functions only                              | public if `active`          |
| `votes`             | `{uid}_{targetType}_{targetId}` | Functions only                              | owner only                  |
| `reports`           | auto-ID                         | Functions only                              | mods/admins (+ own)         |
| `moderationActions` | auto-ID                         | Functions only                              | mods/admins                 |
| `notifications`     | auto-ID                         | Functions only                              | recipient only              |
| `auditLogs`         | auto-ID                         | Functions only                              | admins only                 |
| `bans`              | auto-ID                         | Functions only                              | mods/admins                 |
| `settings`          | named (e.g. `global`)           | Admin functions                             | public (flags/announcement) |

---

## 2. `users/{uid}`

Public-facing pseudonymous profile. `uid` equals the Firebase Auth UID.

| Field            | Type                                          | Notes                                                                                                               |
| ---------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `uid`            | string                                        | == doc ID == Auth UID                                                                                               |
| `username`       | string                                        | Display case, e.g. `CalmFox`. **Immutable in MVP.**                                                                 |
| `usernameLower`  | string                                        | Lowercase, for lookups/joins                                                                                        |
| `displayName`    | string?                                       | Optional, ≤ 50 chars                                                                                                |
| `avatarUrl`      | string?                                       | Storage URL; null = generated default                                                                               |
| `bio`            | string                                        | ≤ 300 chars, default `""`                                                                                           |
| `role`           | enum(`user`,`moderator`,`admin`,`superadmin`) | Default `user`. **Function-only.**                                                                                  |
| `status`         | enum(`active`,`suspended`,`banned`,`deleted`) | Default `active`. **Function-only.**                                                                                |
| `karma`          | number                                        | Default 0. **Function-only.**                                                                                       |
| `postCount`      | number                                        | **Function-only** counter                                                                                           |
| `commentCount`   | number                                        | **Function-only** counter                                                                                           |
| `moderatorOf`    | array<ref>                                    | communityIds moderated; default `[]`                                                                                |
| `badges`         | array<enum>                                   | `supporter`,`founding_supporter`,`clinician`,`org`. **Function-only** (monetization/trust — see `MONETIZATION.md`). |
| `supporter`      | bool?                                         | Paid Supporter flag. **Function-only** (set by `grantSupporter` after verified purchase).                           |
| `supporterSince` | ts?                                           | When Supporter began; null otherwise                                                                                |
| `suspendedUntil` | ts?                                           | Set by suspension; null otherwise                                                                                   |
| `createdAt`      | ts                                            | server                                                                                                              |
| `updatedAt`      | ts                                            | server                                                                                                              |

- **Client-editable subset (own doc only):** `displayName`, `avatarUrl`, `bio`.
  Everything else — including `badges`/`supporter` — is function-only and blocked
  by the rules' `changedKeysWithin` allow-list (no rule change needed to add them).
- **Email is intentionally absent** — it stays in Firebase Auth.

---

## 3. `usernames/{usernameLower}`

Uniqueness ledger. Reserving a username = creating this doc inside a transaction;
the doc ID collision _is_ the uniqueness guarantee.

| Field       | Type   | Notes        |
| ----------- | ------ | ------------ |
| `uid`       | ref    | Owner        |
| `username`  | string | Display case |
| `createdAt` | ts     | server       |

- Created only by `reserveUsername` / `createUserProfile` (transaction).
- Public read is allowed _only_ as an existence/availability check (no PII here).

---

## 4. `communities/{slug}`

| Field                     | Type           | Notes                                  |
| ------------------------- | -------------- | -------------------------------------- |
| `slug`                    | string         | == doc ID, e.g. `cycle-questions`      |
| `name`                    | string         | `Cycle Questions`                      |
| `description`             | string         | Short blurb                            |
| `rules`                   | array<string>  | Community rules                        |
| `color`                   | string         | Brand accent token name/hex            |
| `icon`                    | string?        | Asset key                              |
| `visibility`              | enum(`public`) | MVP is public-only (private = Phase 2) |
| `memberCount`             | number         | **Function-only**                      |
| `postCount`               | number         | **Function-only**                      |
| `moderatorIds`            | array<ref>     | Mods for this community                |
| `createdAt` / `updatedAt` | ts             | server                                 |

**Seed communities (MVP):** `general`, `cycle-questions`, `symptoms`,
`privacy-app-feedback`, `educational-discussion`, `support`.

---

## 5. `posts/{postId}`

| Field                     | Type                                        | Notes                                              |
| ------------------------- | ------------------------------------------- | -------------------------------------------------- |
| `authorId`                | ref                                         | uid                                                |
| `authorUsername`          | string                                      | Denormalized snapshot (immutable username → safe)  |
| `communityId`             | ref                                         | == community slug                                  |
| `title`                   | string                                      | 1–300 chars                                        |
| `body`                    | string                                      | 0–40,000 chars, plain/markdown text (no HTML)      |
| `tags`                    | array<string>                               | ≤ 5, lowercased                                    |
| `score`                   | number                                      | upvotes − downvotes. **Function-only**             |
| `upvoteCount`             | number                                      | **Function-only**                                  |
| `downvoteCount`           | number                                      | **Function-only**                                  |
| `commentCount`            | number                                      | **Function-only**                                  |
| `hotRank`                 | number                                      | Ranking key, recomputed on vote. **Function-only** |
| `status`                  | enum(`active`,`removed`,`deleted`,`locked`) | `removed` = mod, `deleted` = author                |
| `locked`                  | bool                                        | If true, no new comments                           |
| `edited`                  | bool                                        | Set true on author edit                            |
| `createdAt` / `updatedAt` | ts                                          | server                                             |

- Created/edited/deleted only via `createPost` / `updatePost` / `deletePostSoft`
  / `lockPost`. Direct client writes are blocked.

---

## 6. `comments/{commentId}`

Flat collection with `parentCommentId` threading (cap `depth`).

| Field                                     | Type                               | Notes                                                |
| ----------------------------------------- | ---------------------------------- | ---------------------------------------------------- |
| `postId`                                  | ref                                | Parent post                                          |
| `parentCommentId`                         | ref?                               | null = top-level                                     |
| `communityId`                             | ref                                | Denormalized for mod queries                         |
| `authorId`                                | ref                                | uid                                                  |
| `authorUsername`                          | string                             | Denormalized snapshot                                |
| `body`                                    | string                             | 1–10,000 chars                                       |
| `depth`                                   | number                             | 0-based; **cap at 6** (deeper replies attach at cap) |
| `score` / `upvoteCount` / `downvoteCount` | number                             | **Function-only**                                    |
| `replyCount`                              | number                             | **Function-only**                                    |
| `status`                                  | enum(`active`,`removed`,`deleted`) | soft delete                                          |
| `edited`                                  | bool                               |                                                      |
| `createdAt` / `updatedAt`                 | ts                                 | server                                               |

---

## 7. `votes/{uid}_{targetType}_{targetId}`

Deterministic ID guarantees **one vote per user per target**.

| Field                     | Type                   | Notes                                 |
| ------------------------- | ---------------------- | ------------------------------------- |
| `uid`                     | ref                    | Voter                                 |
| `targetType`              | enum(`post`,`comment`) |                                       |
| `targetId`                | ref                    |                                       |
| `value`                   | enum(`1`,`-1`)         | Up or down; un-voting deletes the doc |
| `createdAt` / `updatedAt` | ts                     | server                                |

- Written only by `voteOnPost` / `voteOnComment`, which **transactionally** upsert
  this doc and adjust the target's `score`/counters/`hotRank`. Owner may read their
  own vote (to render UI state).

---

## 8. `reports/{reportId}`

| Field                     | Type                                                                               | Notes             |
| ------------------------- | ---------------------------------------------------------------------------------- | ----------------- |
| `reporterId`              | ref                                                                                |                   |
| `targetType`              | enum(`post`,`comment`,`user`)                                                      |                   |
| `targetId`                | ref                                                                                |                   |
| `communityId`             | ref?                                                                               | If content-scoped |
| `reason`                  | enum(`spam`,`harassment`,`medical_misinfo`,`self_harm`,`hate`,`off_topic`,`other`) |                   |
| `details`                 | string                                                                             | ≤ 1,000 chars     |
| `status`                  | enum(`open`,`reviewing`,`resolved`,`dismissed`)                                    | Default `open`    |
| `resolution`              | string?                                                                            | Mod note          |
| `handledBy`               | ref?                                                                               | Mod/admin uid     |
| `createdAt` / `updatedAt` | ts                                                                                 | server            |

- Created via `reportContent`. Readable by mods/admins; a reporter may read their
  own reports. See [`MODERATION_PLAN.md`](./MODERATION_PLAN.md).

---

## 9. `moderationActions/{actionId}` (append-only)

| Field             | Type                                                                                                                                     | Notes               |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `actorId`         | ref                                                                                                                                      | Mod/admin who acted |
| `actionType`      | enum(`remove_post`,`remove_comment`,`restore_content`,`lock_post`,`suspend_user`,`ban_user`,`unban_user`,`dismiss_report`,`role_change`) |                     |
| `targetType`      | enum(`post`,`comment`,`user`)                                                                                                            |                     |
| `targetId`        | ref                                                                                                                                      |                     |
| `communityId`     | ref?                                                                                                                                     |                     |
| `reason`          | string                                                                                                                                   |                     |
| `relatedReportId` | ref?                                                                                                                                     |                     |
| `metadata`        | map                                                                                                                                      | Action-specific     |
| `createdAt`       | ts                                                                                                                                       | server              |

---

## 10. `notifications/{notificationId}`

Top-level collection keyed by `recipientId` (queried per-user). _Subcollection
`users/{uid}/notifications` is a valid alternative if per-user read isolation
becomes a concern — see `SCALING_PLAN.md`._

| Field           | Type                                                               | Notes                  |
| --------------- | ------------------------------------------------------------------ | ---------------------- |
| `recipientId`   | ref                                                                | Owner                  |
| `type`          | enum(`comment_reply`,`post_reply`,`mention`,`mod_action`,`system`) |                        |
| `title`         | string                                                             |                        |
| `body`          | string                                                             |                        |
| `link`          | string                                                             | e.g. `/post/abc#c-xyz` |
| `actorId`       | ref?                                                               | Who triggered it       |
| `actorUsername` | string?                                                            | Denormalized           |
| `read`          | bool                                                               | Default false          |
| `createdAt`     | ts                                                                 | server                 |

- Created only by functions. Recipient may read own + flip `read` to true via
  `markNotificationRead`.

---

## 11. `auditLogs/{logId}` (append-only, admin-only)

Security/compliance trail. Deliberately minimal — **no IP stored**; if a network
signal is ever required, store a salted one-way hash, never the raw address.

| Field        | Type    | Notes                                                                     |
| ------------ | ------- | ------------------------------------------------------------------------- |
| `actorId`    | ref?    |                                                                           |
| `event`      | string  | e.g. `role_change`, `rate_limit_block`, `account_deletion`, `data_export` |
| `targetType` | string? |                                                                           |
| `targetId`   | ref?    |                                                                           |
| `metadata`   | map     |                                                                           |
| `createdAt`  | ts      | server                                                                    |

---

## 12. `bans/{banId}`

| Field       | Type                          | Notes                      |
| ----------- | ----------------------------- | -------------------------- |
| `uid`       | ref                           | Banned user                |
| `scope`     | enum(`global`) \| communityId | MVP focuses on global bans |
| `reason`    | string                        |                            |
| `bannedBy`  | ref                           |                            |
| `expiresAt` | ts?                           | null = permanent           |
| `active`    | bool                          |                            |
| `createdAt` | ts                            | server                     |

- Functions check active bans before permitting writes; `users.status` is also set
  to `banned` for fast rule checks.

---

## 13. `settings/{settingId}`

Named singleton-style docs, e.g. `settings/global`.

| Field             | Type | Notes                            |
| ----------------- | ---- | -------------------------------- |
| `featureFlags`    | map  | `{ imageUploads: false, ... }`   |
| `rateLimits`      | map  | Optional overrides of defaults   |
| `announcement`    | map? | `{ title, body, level }` or null |
| `maintenanceMode` | bool |                                  |
| `updatedAt`       | ts   | server                           |
| `updatedBy`       | ref  | admin uid                        |

- Publicly readable (clients need flags/announcement); writable only by admin
  functions.

---

## 14. Composite indexes (→ `firestore.indexes.json`)

| Collection          | Fields                                            | Serves                 |
| ------------------- | ------------------------------------------------- | ---------------------- |
| `posts`             | `communityId` ASC, `createdAt` DESC               | Community feed — New   |
| `posts`             | `communityId` ASC, `hotRank` DESC                 | Community feed — Hot   |
| `posts`             | `communityId` ASC, `score` DESC                   | Community feed — Top   |
| `posts`             | `status` ASC, `createdAt` DESC                    | Global new / mod queue |
| `posts`             | `authorId` ASC, `createdAt` DESC                  | User profile posts     |
| `comments`          | `postId` ASC, `createdAt` ASC                     | Thread (chronological) |
| `comments`          | `postId` ASC, `score` DESC                        | Thread (best)          |
| `comments`          | `authorId` ASC, `createdAt` DESC                  | User profile comments  |
| `reports`           | `status` ASC, `createdAt` DESC                    | Mod queue              |
| `reports`           | `communityId` ASC, `status` ASC, `createdAt` DESC | Per-community queue    |
| `moderationActions` | `communityId` ASC, `createdAt` DESC               | Mod log                |
| `moderationActions` | `targetId` ASC, `createdAt` DESC                  | Content history        |
| `notifications`     | `recipientId` ASC, `createdAt` DESC               | Inbox                  |
| `notifications`     | `recipientId` ASC, `read` ASC, `createdAt` DESC   | Unread badge           |

Single-field indexes are auto-created by Firestore. Review/prune after real usage.

---

## 15. Ranking ("hot")

Reddit-style decay, computed in the vote function and stored as `hotRank`:

```
sign = score > 0 ? 1 : (score < 0 ? -1 : 0)
order = log10(max(|score|, 1))
seconds = createdAt_epoch - 1_700_000_000   // arbitrary fixed epoch
hotRank = round(sign * order + seconds / 45000, 7)
```

Sorting by `hotRank DESC` yields a hot feed without per-read computation. "Top" and
"New" sort by `score`/`createdAt` respectively.

---

## 16. Account deletion & export (privacy)

- **Export:** a function returns the user's own posts/comments/votes as JSON.
- **Deletion:** soft — `users.status = deleted`, profile PII fields cleared,
  `username` released or tombstoned, and authored content either anonymized
  (`authorUsername = "[deleted]"`, `authorId` nulled) or soft-removed per policy.
  Firebase Auth record is deleted. An `auditLogs` entry records the event.
- This satisfies the roadmap's "account deletion and data export" privacy commitment.

---

## 17. Open questions (resolve before Phase 3)

- Username change support post-MVP → requires denormalization reconciliation job.
- Notifications top-level vs subcollection at scale (see `SCALING_PLAN.md`).
- Whether to store `hotRank` or compute client-side over a recent window.
