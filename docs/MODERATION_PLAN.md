# MODERATION_PLAN.md — The CycleVault Social

- **Status:** Phase 0 spec (Accepted)
- **Date:** 2026-06-26
- **Owner:** [`adr/0001-foundational-architecture.md`](./adr/0001-foundational-architecture.md)

Moderation is safety-critical for a community discussing menstrual and reproductive
health. This document defines roles, the reporting/action lifecycle, the audit
trail, and automated abuse prevention. It builds on [`API_CONTRACT.md`](./API_CONTRACT.md)
and [`SECURITY_RULES.md`](./SECURITY_RULES.md).

---

## 1. Roles & authorization

| Role            | Who                     | Capabilities                                                                                                           |
| --------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Guest**       | Unauthenticated         | Read active public content only                                                                                        |
| **User**        | Registered, `active`    | Post, comment, vote, report, edit/delete own                                                                           |
| **Moderator**   | Appointed by admins     | All User + remove content, lock posts, suspend users (bounded), resolve/dismiss reports — **platform-wide** (global, not scoped to a single community) |
| **Admin**       | Trusted operators       | All Mod across **all** communities + ban users, restore content, manage communities                                    |
| **Super Admin** | Founder                 | All Admin + change roles (`setUserRole`), platform settings, view audit logs                                           |

### Authorization matrix

| Action                  | Guest | User | Mod                  | Admin | SuperAdmin |
| ----------------------- | ----- | ---- | -------------------- | ----- | ---------- |
| View active content     | ✅    | ✅   | ✅                   | ✅    | ✅         |
| Create post/comment     | ❌    | ✅   | ✅                   | ✅    | ✅         |
| Vote                    | ❌    | ✅   | ✅                   | ✅    | ✅         |
| Report content          | ❌    | ✅   | ✅                   | ✅    | ✅         |
| Edit/delete own content | ❌    | ✅   | ✅                   | ✅    | ✅         |
| Remove others' content  | ❌    | ❌    | ✅                   | ✅    | ✅         |
| Lock post               | ❌    | ❌    | ✅                   | ✅    | ✅         |
| Suspend user            | ❌    | ❌   | ✅ (≤ 7 days)        | ✅    | ✅         |
| Ban user                | ❌    | ❌   | ❌                   | ✅    | ✅         |
| Restore removed content | ❌    | ❌   | ❌                   | ✅    | ✅         |
| Change roles            | ❌    | ❌   | ❌                   | ❌    | ✅         |
| View audit logs         | ❌    | ❌   | ❌                   | ❌    | ✅         |
> **Moderators are global.** `requireModeratorOf` authorizes any moderator+
> across every community (the legacy per-community `users.moderatorOf` list is
> superseded). Admin/superadmin inherit all moderator powers.
>
> **Edits are re-moderated.** `updatePost` and `updateComment` re-run the
> moderation pipeline on the edited content, so a benign post can't be quietly
> edited into a policy violation after approval.
All enforcement happens **server-side in Cloud Functions**; the client UI merely
hides controls the user can't use.

---

## 2. Reporting lifecycle

```
User taps Report
  → reportContent()              [reason + optional details]
  → reports/{id} status:'open'
  → (optional) onReportCreated auto-flag thresholds
  → appears in Mod Queue (/mod)
Moderator reviews
  → reviewing → resolve | dismiss
     resolve  → removeContent / suspendUser / banUser (+ resolution note)
     dismiss  → dismissReport (no action, logged)
  → report status:'resolved' | 'dismissed', handledBy set
  → author notified on action (mod_action); reporter never exposed
```

**Report reasons:** `spam`, `harassment`, `medical_misinfo`, `self_harm`, `hate`,
`off_topic`, `other`. `self_harm` and `medical_misinfo` are **priority** reasons
(see §4).

**Anti-abuse on reporting:** 20 reports/user/day; duplicate reports by the same
user on the same target are de-duplicated; frivolous mass-reporting is itself a
flaggable behavior.

---

## 3. Moderation actions & states

| Content state | Meaning                  | Set by                               |
| ------------- | ------------------------ | ------------------------------------ |
| `active`      | Normal, visible          | author create                        |
| `locked`      | Visible, no new comments | `lockPost` (mod)                     |
| `removed`     | Hidden by moderation     | `removeContent` (mod)                |
| `deleted`     | Hidden by author         | `deletePostSoft`/`deleteCommentSoft` |

| User state  | Meaning                                | Set by            |
| ----------- | -------------------------------------- | ----------------- |
| `active`    | Normal                                 | default           |
| `suspended` | Temp. write ban until `suspendedUntil` | `suspendUser`     |
| `banned`    | Indefinite, has `bans` record          | `banUser`         |
| `deleted`   | Account removed/anonymized             | `deleteMyAccount` |

**Soft-delete only.** Nothing is hard-deleted (except Auth record on account
deletion). `removed` vs `deleted` is preserved so actions are reversible
(`restoreContent`) and auditable.

---

## 3a. Strikes & auto-suspension (✅ implemented)

When a **human** removes a user's content for breaking the guidelines
(`removeContent`, or `reviewContent` with `reject`), the author accrues a
**strike**. AI holds alone never strike — only a human-confirmed removal does, so
nobody is penalized for something a person hasn't judged. Mods can pass
`strike:false` for benign removals (wrong community, duplicate).

**Escalation ladder** (by count of currently-active strikes):

| Active strikes | Consequence                              |
| -------------- | ---------------------------------------- |
| 1              | Warning only (calm notification)         |
| 2              | 24-hour suspension                       |
| 3              | 7-day suspension                         |
| 4              | 30-day suspension                        |
| 5+             | `needsAdminReview` — a human decides     |

- **Decay:** strikes **expire after 90 days** (`expiresAtMs`); only active
  (non-expired, non-cleared) strikes count toward escalation. A long-ago mistake
  doesn't follow someone forever.
- **Never shortens** an existing longer suspension; **never downgrades** a ban.
- **Admin override:** `clearUserStrikes` wipes active strikes + the review flag.
- **5+ never auto-permabans** — it flags the account so an admin chooses (suspend
  longer / ban / clear) on the **Accounts needing review** panel.
- **Privacy:** strike history lives in a mod-only collection (`userModeration/{uid}`
  + a function-only `users/{uid}/strikes` subcollection), **never** on the public
  profile. Only the enforced suspension (`status`/`suspendedUntil`) is on the user
  doc, exactly as before.
- **Every strike is audited** (`moderationActions` + `auditLogs`) and the user is
  notified with a clear, kind explanation and a link to the guidelines.

Code: `functions/src/shared/strikes.ts` (`applyStrike`, `clearStrikes`).

---

## 4. Health-safety policy (domain-specific)

Because the forum touches health:

- **Not medical advice.** A persistent disclaimer appears on the composer and in
  the footer: _"This platform does not provide medical advice. Consult a clinician
  for health concerns."_ (Mirrors the app/site language.)
- **`medical_misinfo`** reports are prioritized; clearly dangerous claims (e.g.
  unsafe "cures") are removable on sight.
- **`self_harm`** content triggers a priority path: the UI surfaces crisis-resource
  links, and the report is escalated to Admin immediately. Moderators are guided to
  respond with empathy, not punishment.
- **No diagnosis culture.** Community rules discourage users from diagnosing each
  other; templates redirect to "talk to a clinician."

---

## 5. Audit trail

Every privileged action writes an append-only `moderationActions` entry
(`actorId`, `actionType`, `targetId`, `reason`, `relatedReportId`, `createdAt`).
Security-sensitive events (role changes, bans, account deletion, rate-limit blocks)
**also** write to `auditLogs` (admin-only readable). Logs are **append-only** — no
function offers an update/delete path. This gives a defensible history and supports
incident response (`DISASTER` runbook lives in `DEPLOYMENT_PLAN.md`).

---

## 6. Automated abuse prevention

| Layer                      | Mechanism                                                    |
| -------------------------- | ------------------------------------------------------------ |
| **Bot/scripted traffic**   | Firebase **App Check** (reCAPTCHA v3) on callables           |
| **Rate limits**            | Per-user fixed-window counters (see `API_CONTRACT.md` §0)    |
| **Account-age gates**      | New accounts get lower limits for the first 24–48h           |
| **Email verification**     | Required before first post/comment                           |
| **Duplicate/spam content** | Hash recent submissions per user; throttle repeats           |
| **Link throttling**        | Cap external links per post for new accounts                 |
| **Vote integrity**         | One vote/user/target by deterministic ID; server aggregation |
| **Auto-flag thresholds**   | N distinct reports on one item → auto-hide pending review    |

**Phase 2:** optional AI moderation pass (toxicity/self-harm classifiers) as an
_assist_ that flags into the queue — never an autonomous banner. Always
human-in-the-loop for account-level actions.

---

## 7. Moderator tooling (MVP)

- **`/mod` dashboard:** report queue (filter by status/community/reason), one-click
  remove / lock / dismiss, user lookup with recent activity, action history.
- **`/admin` dashboard:** all of `/mod` across communities + ban/unban, restore
  content, manage communities, edit `settings/global` (flags, announcement,
  maintenance mode).
- Both are gated by role both in routing (client) and in every function (server).

---

## 8. Appeals (lightweight, MVP)

A removed/suspended user sees the reason and a link to `support` (email or the
`support` community). Admins can `restoreContent` / `unbanUser`. A formal in-app
appeals workflow is Phase 2.

---

## 9. Transparency

Consistent with the brand's "open to audit" ethos: community rules are public per
community, and we intend a periodic, aggregate transparency note (counts of removals
/ bans, no personal data) once volume justifies it.
