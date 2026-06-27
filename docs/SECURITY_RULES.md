# SECURITY_RULES.md — The CycleVault Social

- **Status:** Phase 0 spec (Accepted)
- **Date:** 2026-06-26
- **Owner:** [`adr/0001-foundational-architecture.md`](./adr/0001-foundational-architecture.md)
- **Scope:** Cloud Firestore Security Rules + Cloud Storage Rules

These rules are the **last line of defense**, not the only one. The primary
integrity boundary is the Cloud Functions layer ([`API_CONTRACT.md`](./API_CONTRACT.md)).
Rules exist to guarantee that _even if a client talks to Firestore directly_, it
can only do what we explicitly allow. Schema references: [`DATA_MODEL.md`](./DATA_MODEL.md).

---

## 1. Principles

1. **Fail closed.** Default `allow read, write: if false;`. Nothing is permitted
   unless a rule explicitly grants it.
2. **Trust the server only.** All privileged writes happen via Cloud Functions
   (Admin SDK), which **bypass** rules. Therefore client-facing rules can be
   strict: most collections are **read-only or no-access** to clients.
3. **Least privilege.** Clients get the narrowest capability that makes the UI
   work: read public content, read/write their own narrow profile fields, read
   their own votes/notifications.
4. **No role escalation.** `role` and `status` are never client-writable. There is
   no rule path that lets a user raise their own privileges.
5. **No field smuggling.** Writes that touch protected fields are rejected by
   comparing changed keys against an allow-list.
6. **Validate shape at the edge.** Even allowed client writes (profile edits)
   validate types and lengths in rules as a backstop to Zod.

---

## 2. Capability matrix (client SDK, not Functions)

| Collection          | Guest read            | Auth read         | Client write                            |
| ------------------- | --------------------- | ----------------- | --------------------------------------- |
| `users`             | ✅ public subset      | ✅                | ✅ own doc, allow-listed fields only    |
| `usernames`         | ✅ existence          | ✅                | ❌ (functions only)                     |
| `communities`       | ✅                    | ✅                | ❌                                      |
| `posts`             | ✅ if `active`        | ✅ if `active`    | ❌ (functions only)                     |
| `comments`          | ✅ if `active`        | ✅ if `active`    | ❌ (functions only)                     |
| `votes`             | ❌                    | ✅ own only       | ❌ (functions only)                     |
| `reports`           | ❌                    | mod/admin, or own | ❌ (functions only)                     |
| `moderationActions` | ❌                    | mod/admin         | ❌                                      |
| `notifications`     | ❌                    | recipient only    | ✅ recipient may set `read:true` only\* |
| `auditLogs`         | ❌                    | admin only        | ❌                                      |
| `bans`              | ❌                    | mod/admin         | ❌                                      |
| `settings`          | ✅ flags/announcement | ✅                | ❌                                      |

\* Even `markNotificationRead` is exposed as a function; the direct-write rule for
`read` is an optional convenience that can be disabled.

---

## 3. Helper functions (rules)

```
rules_version = '2';
service cloud.firestore {
  function isSignedIn() { return request.auth != null; }
  function uid() { return request.auth.uid; }

  // Role/status are read from the user's own profile doc.
  function userDoc() {
    return get(/databases/$(database)/documents/users/$(uid())).data;
  }
  function role()      { return isSignedIn() ? userDoc().role : 'guest'; }
  function isMod()     { return role() in ['moderator','admin','superadmin']; }
  function isAdmin()   { return role() in ['admin','superadmin']; }

  // Only these keys may differ between before/after on a client profile edit.
  function changedKeysWithin(allowed) {
    return request.resource.data.diff(resource.data)
             .affectedKeys().hasOnly(allowed);
  }
}
```

> Note: calling `get()` in rules costs a document read. We minimize it by gating
> only the rare client-side mutations; high-volume reads (posts/comments) use
> field checks (`status == 'active'`) that need no `get()`.

---

## 4. Rule sketches per collection

```
match /databases/{db}/documents {

  // ---- users ----
  match /users/{userId} {
    allow read: if true;                       // public pseudonymous profile
    allow update: if isSignedIn() && userId == uid()
      && changedKeysWithin(['displayName','avatarUrl','bio','updatedAt'])
      && request.resource.data.bio.size() <= 300
      && (request.resource.data.displayName == null
          || request.resource.data.displayName.size() <= 50);
    allow create, delete: if false;            // functions only
  }

  // ---- usernames ----
  match /usernames/{name} {
    allow get: if true;                        // availability check
    allow list, write: if false;
  }

  // ---- communities ----
  match /communities/{slug} {
    allow read: if true;
    allow write: if false;
  }

  // ---- posts ----
  match /posts/{postId} {
    allow read: if resource.data.status == 'active' || isMod();
    allow write: if false;                      // createPost/updatePost/etc.
  }

  // ---- comments ----
  match /comments/{commentId} {
    allow read: if resource.data.status == 'active' || isMod();
    allow write: if false;
  }

  // ---- votes ----
  match /votes/{voteId} {
    allow read: if isSignedIn() && resource.data.uid == uid();
    allow write: if false;                      // voteOn* functions only
  }

  // ---- reports ----
  match /reports/{reportId} {
    allow read: if isMod() ||
      (isSignedIn() && resource.data.reporterId == uid());
    allow write: if false;
  }

  // ---- moderationActions ----
  match /moderationActions/{id} {
    allow read: if isMod();
    allow write: if false;
  }

  // ---- notifications ----
  match /notifications/{id} {
    allow read: if isSignedIn() && resource.data.recipientId == uid();
    allow update: if isSignedIn() && resource.data.recipientId == uid()
      && changedKeysWithin(['read']);          // may only flip read
    allow create, delete: if false;
  }

  // ---- auditLogs ----
  match /auditLogs/{id} {
    allow read: if isAdmin();
    allow write: if false;
  }

  // ---- bans ----
  match /bans/{id} {
    allow read: if isMod();
    allow write: if false;
  }

  // ---- settings ----
  match /settings/{id} {
    allow read: if true;                        // feature flags / announcement
    allow write: if false;                      // admin functions only
  }

  // ---- default deny ----
  match /{document=**} { allow read, write: if false; }
}
```

---

## 5. Cloud Storage rules (`storage.rules`)

Storage is provisioned but user uploads (avatars/images) land in Phase 2. Rules are
written restrictively from day one:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Public avatars: world-readable, owner-writable, image-only, ≤ 2 MB.
    match /avatars/{userId}/{file} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size < 2 * 1024 * 1024
        && request.resource.contentType.matches('image/(png|jpeg|webp)');
    }

    // Everything else denied until Phase 2 designs it.
    match /{allPaths=**} { allow read, write: if false; }
  }
}
```

---

## 6. Auth-layer protections

- **Email/password + optional Google.** Email is never written to Firestore.
- **Email verification** required before first post/comment (checked in functions
  via `context.auth.token.email_verified`).
- **Custom claims** may mirror `role` for cheaper rule checks later; the
  **source of truth stays `users.role`**, mutated only by `setUserRole`
  (superadmin). Claims are refreshed by that function.
- **App Check** (reCAPTCHA v3 for web) SHOULD be enabled to ensure callable
  functions and Firestore are reached only by our app, blunting scripted abuse.
  Tracked as a launch hardening item.

---

## 7. Things rules explicitly prevent

- A user setting their own `role`/`status`/`karma`/counters.
- Writing posts/comments with a forged `authorId` or pre-set `score`.
- Reading another user's votes, notifications, reports, or any audit log.
- Casting votes by writing `votes` docs directly (bypassing aggregation).
- Reading `removed`/`deleted` content as a normal user.
- Any access to a collection we did not explicitly allow (default deny).

---

## 8. Testing

Rules are covered by the emulator-based test suite in
[`TESTING_PLAN.md`](./TESTING_PLAN.md) (`@firebase/rules-unit-testing`). Required
cases: each row of the capability matrix, both positive and negative; field-smuggle
attempts on profile edits; role-escalation attempts; cross-user reads. Rules deploy
only if these tests pass in CI.
