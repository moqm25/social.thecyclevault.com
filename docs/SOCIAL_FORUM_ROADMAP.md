# The CycleVault Social Forum Roadmap

> **Canonical references:** This roadmap is the _sequencing_ view. For authoritative
> system design see [`Architecture.md`](./Architecture.md); for the rationale behind
> the stack see the decision record
> [`adr/0001-foundational-architecture.md`](./adr/0001-foundational-architecture.md).
> Detailed Phase 0 specs live in the supporting docs listed under "Immediate Next Step".
> This file and `Architecture.md` are kept in sync.

## Goal

Build `social.thecyclevault.com` as a Reddit-style community forum for The CycleVault.

Architecture:

- Frontend: React + TypeScript + Vite
- Hosting: GitHub Pages for `social.thecyclevault.com`
- Auth: Firebase Authentication
- Database: Cloud Firestore
- Backend/API: Firebase Cloud Functions
- Storage: Firebase Storage
- Moderation/Admin: Firestore rules + Cloud Functions + admin dashboard
- Analytics: Firebase Analytics or privacy-conscious alternative
- Deployment: GitHub Actions

## Product Scope

> **Shipped status (2026-06-28).** The full MVP is live, plus several "later"
> items pulled forward. **Shipped:** auth + pseudonymous profiles, communities,
> posts/comments/voting, feeds, in-app notifications, **semantic + AI search**
> (Firestore vector `findNearest` + `gemini-2.5-flash` grounded answers), **AI +
> human moderation** with a review queue and global moderators, **admin console**
> (platform stats + per-user activity report), **admin user directory** (search +
> superadmin delete), **Sponsored Products / Shop**, **cosmetic badges**, **guest
> name-blur**, **branded transactional emails** (SendGrid + Trigger Email), a
> **Firebase Hosting test channel** (`cyclevault-social.web.app`), a universal
> **"Report a problem"** flow + admin Issues queue, and a **report-a-member** flow.
> **Not yet:** DMs, private groups, rich-text/image uploads, polls, saved posts,
> web push, and the public custom-domain cutover.

### MVP Features

1. User authentication
    - Email/password login
    - Google login optional
    - Anonymous browsing allowed
    - Authenticated posting/commenting only

2. User profiles
    - Display name
    - Username/handle
    - Avatar
    - Bio
    - Created date
    - Karma/reputation score

3. Communities/categories
    - General
    - Cycle Questions
    - Symptoms
    - Privacy & App Feedback
    - Educational Discussion
    - Support

4. Posts
5. Comments
6. Voting
7. Moderation
8. Feed
9. Search
10. Basic notifications (in-app: replies, mentions, moderator actions)

### Non-MVP / Later Features

- Direct messages
- Private groups
- Rich text editor
- Image uploads
- Polls
- Saved posts
- Awards/badges ✅ shipped (cosmetic badges: supporter/founding_supporter/clinician/org)
- AI moderation ✅ shipped (AI + human review queue)
- AI post summarization
- Recommendation feed
- Mobile app integration
- Web push notifications

## Repository Structure

```txt
social.thecyclevault.com/
  public/
  src/
    app/
    components/
    features/
      auth/
      posts/
      comments/
      communities/
      profile/
      moderation/
      notifications/
      search/
    hooks/
    lib/
      firebase/
      api/
      validation/
      security/
    pages/
    styles/
    types/
    utils/
  functions/
    src/
      auth/
      posts/
      comments/
      votes/
      moderation/
      notifications/
      users/
      shared/
  firestore.rules
  firestore.indexes.json
  storage.rules
  firebase.json
  .github/
    workflows/
  docs/
```

## Frontend Plan

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS or CSS Modules
- Firebase client SDK
- Zod
- TanStack Query

Pages:

- `/`
- `/login`
- `/post/new`
- `/post/:postId`
- `/c/:communitySlug`
- `/u/:username`
- `/settings`
- `/mod`
- `/admin`

UI Requirements:

- Premium Apple-like layout
- Soft The CycleVault brand colors
- Responsive mobile-first design
- Minimum readable font size: 15px
- Accessible and keyboard navigable

## Firebase Services

- Firebase Authentication
- Cloud Firestore
- Cloud Functions
- Firebase Storage (provisioned in infra; user image uploads deferred to Phase 2)

Core collections:

- users
- usernames
- communities
- posts
- comments
- votes
- reports
- moderationActions
- notifications
- auditLogs
- bans
- settings

## Firestore Models

Collections:

- users/{uid}
- usernames/{username}
- communities/{communityId}
- posts/{postId}
- comments/{commentId}
- votes/{voteId}
- reports/{reportId}
- moderationActions/{actionId}
- notifications/{notificationId}
- auditLogs/{logId}
- bans/{banId}
- settings/{settingId}

## API / Cloud Function Contract

Functions:

- createUserProfile
- reserveUsername
- createPost
- updatePost
- deletePostSoft
- createComment
- updateComment
- deleteCommentSoft
- voteOnPost
- voteOnComment
- reportContent
- removeContent
- suspendUser
- banUser
- lockPost
- createNotification
- markNotificationRead

Rules:

- Validate with Zod
- Never trust client role claims
- Enforce rate limits
- Log security actions

## Security Rules

- Public read access only for active content
- Auth required for interaction
- Users edit only their own profile
- No self-assigned roles
- Sensitive writes go through Cloud Functions

## Moderation Plan

Features:

- Report content
- Remove content
- Lock post
- Suspend user
- Ban user
- Admin/mod dashboard
- Audit log

## Privacy and Safety

- No public email addresses
- Minimal personal data collection
- Username-based profiles
- Medical disclaimer
- Reporting tools everywhere
- Future account deletion and data export

## Development Phases

### Phase 0 — Planning

- Finalize architecture
- Finalize data model
- Firebase setup
- Firestore indexes
- Security rules
- API contracts

### Phase 1 — Frontend Shell

- Routing
- Layout
- Skeleton pages

### Phase 2 — Firebase Integration

- Auth
- Profiles
- Protected routes
- Emulators

### Phase 3 — Posts and Comments

### Phase 4 — Voting and Ranking

### Phase 5 — Moderation

### Phase 6 — Polish

### Phase 7 — Deployment

## Environment Variables

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Local Development

```bash
npm install
npm run dev
firebase emulators:start
npm run build
npm run lint
npm run typecheck
npm test
```

## Testing Requirements

- TypeScript strict mode
- ESLint
- Unit tests
- Firestore rules tests
- Cloud Function tests
- Frontend component tests
- Manual moderation tests

## AI Agent Instructions

1. Read documentation before coding.
2. Propose implementation plan.
3. Ask before major architecture changes.
4. Use TypeScript everywhere.
5. Do not hardcode secrets.
6. Do not weaken security rules.
7. Keep frontend/backend concerns separated.
8. Prioritize correctness.
9. Maintain premium The CycleVault branding.
10. Update documentation after major features.

## Immediate Next Step

Create:

- docs/DATA_MODEL.md
- docs/API_CONTRACT.md
- docs/SECURITY_RULES.md
- docs/MODERATION_PLAN.md
- docs/UI_REQUIREMENTS.md
- docs/DEPLOYMENT_PLAN.md
- docs/COST_MODEL.md
- docs/SCALING_PLAN.md
- docs/TESTING_PLAN.md

Then implement Phase 0.
