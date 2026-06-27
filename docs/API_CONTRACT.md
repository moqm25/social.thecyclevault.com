# API_CONTRACT.md — The CycleVault Social

- **Status:** Phase 0 spec (Accepted)
- **Date:** 2026-06-26
- **Owner:** [`adr/0001-foundational-architecture.md`](./adr/0001-foundational-architecture.md)
- **Surface:** Firebase Cloud Functions (2nd gen, TypeScript, region `us-central1`)

Every privileged mutation in the platform goes through one of these functions.
Direct client writes to integrity fields are blocked by
[`SECURITY_RULES.md`](./SECURITY_RULES.md). Schemas reference
[`DATA_MODEL.md`](./DATA_MODEL.md).

---

## 0. Conventions

- **Transport.** All are **HTTPS Callable** functions (`onCall`) unless marked
  _internal_ (invoked by other functions / Firestore triggers, never exposed to
  clients).
- **Auth.** `context.auth` is required for every callable here. If absent →
  `unauthenticated`. Banned/suspended users are rejected with `permission-denied`
  (checked against `users.status` + active `bans`).
- **Validation.** Every input is parsed with a **Zod** schema server-side. Failure
  → `invalid-argument` with a safe message. Never trust client-sent role, score,
  status, counters, timestamps, or `authorId`.
- **Error codes** (Firebase `HttpsError`): `unauthenticated`, `permission-denied`,
  `invalid-argument`, `failed-precondition`, `not-found`, `already-exists`,
  `resource-exhausted` (rate limit), `internal`.
- **Rate limiting.** Enforced server-side via per-user counter docs
  (`rateLimits/{uid}_{action}_{window}`) using a fixed-window scheme. Over limit →
  `resource-exhausted`. Defaults below; overridable via `settings/global.rateLimits`.
- **Idempotency.** Voting and `markNotificationRead` are idempotent. Creates use
  client-generated request IDs where duplicate suppression matters.
- **Timestamps & counters** are written server-side (`serverTimestamp()`,
  `FieldValue.increment()`), never from the client.
- **Audit.** Every moderation/role/ban action appends to `moderationActions` and,
  for security-sensitive events, `auditLogs`.

### Response envelope

```ts
type Ok<T> = { ok: true; data: T };
type Err = { ok: false; code: string; message: string }; // surfaced as HttpsError
```

### Default rate limits

| Action                     | Limit                               |
| -------------------------- | ----------------------------------- |
| createPost                 | 5 / hour, 20 / day                  |
| createComment              | 30 / hour                           |
| voteOnPost / voteOnComment | 200 / hour (combined)               |
| reportContent              | 20 / day                            |
| reserveUsername            | 5 / day                             |
| Auth (login)               | client + Identity Platform lockouts |

---

## 1. Authentication & profile

### `createUserProfile` (callable)

Creates the `users/{uid}` doc after Auth signup and reserves the username in one
transaction.

- **Auth:** required (the just-created Auth user).
- **Input:**
    ```ts
    { username: string;            // 3–20 chars, [a-zA-Z0-9_], not reserved
      displayName?: string;        // ≤ 50
      bio?: string;                // ≤ 300
      acceptedTermsVersion: string }
    ```
- **Behavior:** transaction → assert `usernames/{lower}` absent → create it →
  create `users/{uid}` with `role:'user'`, `status:'active'`, zeroed counters.
- **Output:** `{ uid, username }`
- **Errors:** `already-exists` (username taken or profile exists),
  `invalid-argument`, `unauthenticated`.

### `reserveUsername` (callable)

Standalone availability+reservation (used by the live username field / change flow).

- **Input:** `{ username: string }`
- **Output:** `{ available: boolean, reserved?: boolean }`
- **Errors:** `already-exists`, `resource-exhausted`.
- **Note:** usernames are **immutable in MVP**; this primarily serves signup.

---

## 2. Posts

### `createPost` (callable)

- **Input:**
    ```ts
    { communityId: string; title: string;  // 1–300
      body: string;                          // 0–40000, sanitized to plain/markdown
      tags?: string[] }                      // ≤ 5
    ```
- **Behavior:** verify community exists + user not banned + rate limit → create
  `posts/{id}` (`authorId`/`authorUsername` from auth, `status:'active'`, counters
  0, `hotRank` from formula) → `increment(users.postCount, +1)`,
  `increment(communities.postCount, +1)`.
- **Output:** `{ postId }`
- **Errors:** `not-found` (community), `permission-denied`, `resource-exhausted`,
  `invalid-argument`.

### `updatePost` (callable)

- **Input:** `{ postId, title?, body?, tags? }`
- **Behavior:** assert caller is author **and** post `active` → update allowed
  fields, set `edited:true`, `updatedAt`. Title/body re-validated + sanitized.
- **Errors:** `permission-denied` (not author), `failed-precondition` (locked/
  removed), `not-found`.

### `deletePostSoft` (callable)

- **Input:** `{ postId }`
- **Behavior:** author-only soft delete → `status:'deleted'`, body/title tombstoned
  (`"[deleted]"`), decrement counters. Comments remain (status untouched).
- **Errors:** `permission-denied`, `not-found`.

### `lockPost` (callable, mod)

- **Auth:** moderator of the community / admin.
- **Input:** `{ postId, locked: boolean, reason?: string }`
- **Behavior:** set `locked` + (`status:'locked'|'active'`) → append
  `moderationActions`.
- **Errors:** `permission-denied`, `not-found`.

---

## 3. Comments

### `createComment` (callable)

- **Input:** `{ postId, parentCommentId?: string, body: string /* 1–10000 */ }`
- **Behavior:** assert post `active` and not `locked`; compute `depth`
  (parent.depth+1, capped 6) → create `comments/{id}` → `increment` post
  `commentCount`, parent `replyCount`, `users.commentCount`. Enqueue notification
  to post author / parent author (via `createNotification`, deduped, never self).
- **Output:** `{ commentId }`
- **Errors:** `failed-precondition` (locked/removed post), `not-found`,
  `resource-exhausted`.

### `updateComment` (callable)

- **Input:** `{ commentId, body }` — author-only, `active` only; sets `edited`.

### `deleteCommentSoft` (callable)

- **Input:** `{ commentId }` — author-only → `status:'deleted'`, body tombstoned,
  counters decremented.

---

## 4. Voting

### `voteOnPost` (callable)

- **Input:** `{ postId, value: 1 | -1 | 0 }` (`0` = remove vote)
- **Behavior:** **transaction** on `votes/{uid}_post_{postId}`:
    - no existing + `value≠0` → create vote, adjust `score`/up|down counts.
    - existing + same value → no-op (idempotent).
    - existing + different non-zero → flip (±2 net on score).
    - `value:0` → delete vote, reverse its effect.
      Recompute `hotRank`; adjust author `karma`.
- **Output:** `{ score, value }`
- **Errors:** `not-found`, `failed-precondition` (target removed),
  `resource-exhausted`.
- **Scale note:** see `SCALING_PLAN.md` for sharded counters on hot posts.

### `voteOnComment` (callable)

Identical contract on `votes/{uid}_comment_{commentId}` and the comment's counters.

---

## 5. Moderation

See [`MODERATION_PLAN.md`](./MODERATION_PLAN.md) for the authorization matrix.

### `reportContent` (callable)

- **Input:**
    ```ts
    { targetType: 'post'|'comment'|'user'; targetId: string;
      reason: ReportReason; details?: string /* ≤1000 */ }
    ```
- **Behavior:** create `reports/{id}` (`status:'open'`), dedupe repeat reports by
  same user on same target. Never reveals reporter to the reported user.
- **Output:** `{ reportId }`
- **Errors:** `resource-exhausted`, `not-found`, `invalid-argument`.

### `removeContent` (callable, mod)

- **Auth:** moderator of community / admin.
- **Input:** `{ targetType: 'post'|'comment'; targetId; reason; relatedReportId? }`
- **Behavior:** set target `status:'removed'`, adjust counters, resolve linked
  report, append `moderationActions`, notify author (`mod_action`).
- **Errors:** `permission-denied`, `not-found`.

### `suspendUser` (callable, mod/admin)

- **Input:** `{ uid; durationHours: number; reason }`
- **Behavior:** set `users.status:'suspended'`, `suspendedUntil`, append actions +
  `auditLogs`. Mods limited (e.g. ≤ 168h); admins unbounded.
- **Errors:** `permission-denied`, `not-found`, `invalid-argument`.

### `banUser` (callable, admin)

- **Input:** `{ uid; scope:'global'; reason; permanent?: boolean; expiresAt?: ts }`
- **Behavior:** create `bans/{id}` (`active:true`), set `users.status:'banned'`,
  append actions + `auditLogs`.
- **Errors:** `permission-denied` (admin only), `not-found`.

---

## 6. Notifications

### `createNotification` (**internal**)

Not client-callable. Invoked by `createComment`, moderation functions, and a
mention-parser. Writes `notifications/{id}`; suppresses self-notifications and
duplicates within a short window.

### `markNotificationRead` (callable)

- **Input:** `{ notificationId }` or `{ all: true }`
- **Behavior:** recipient-only → set `read:true` (single or batch). Idempotent.
- **Errors:** `permission-denied`, `not-found`.

---

## 7. Additional functions (required by moderation & privacy docs)

These are committed by [`MODERATION_PLAN.md`](./MODERATION_PLAN.md) and the
account-deletion/export requirement in `DATA_MODEL.md` §16. Listed here so the
contract is complete even though the headline list in the planning docs is the
core set above.

| Function          | Auth       | Purpose                                         |
| ----------------- | ---------- | ----------------------------------------------- |
| `unbanUser`       | admin      | Deactivate ban, restore `users.status`          |
| `restoreContent`  | mod/admin  | Reverse a `removed` status                      |
| `dismissReport`   | mod/admin  | Close report as `dismissed`                     |
| `setUserRole`     | superadmin | Change `role` (the only role-mutating path)     |
| `exportMyData`    | user       | Return caller's posts/comments/votes as JSON    |
| `deleteMyAccount` | user       | Soft-delete + anonymize per `DATA_MODEL.md` §16 |

---

## 8. Triggers (event-driven, non-callable)

| Trigger           | On                        | Purpose                                   |
| ----------------- | ------------------------- | ----------------------------------------- |
| `onUserDeleted`   | Auth user delete          | Reconcile profile/username tombstone      |
| `onReportCreated` | `reports` create          | Optional auto-flag thresholds → mod queue |
| `mentionParser`   | `comments`/`posts` create | Detect `@username` → `createNotification` |

> All counter mutations live inside the callable transactions above rather than in
> `onWrite` triggers, to keep aggregation atomic with the action and avoid double
> counting. Triggers are reserved for cross-document side effects only.

---

## 9. Versioning

Breaking changes to any input/output schema require a new ADR and a deprecation
window. Functions validate an optional `apiVersion` field; unknown versions are
rejected with `failed-precondition`.
