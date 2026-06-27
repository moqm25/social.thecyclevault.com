# The CycleVault Social Forum – Architecture & Implementation Specification

Version: 1.0
Status: Planning / Pre-Implementation

> **Decision record:** The rationale, alternatives, and consequences behind this
> architecture are captured in
> [`adr/0001-foundational-architecture.md`](./adr/0001-foundational-architecture.md).
> Phase 0 detail lives in the supporting docs listed in §32. This spec and
> [`SOCIAL_FORUM_ROADMAP.md`](./SOCIAL_FORUM_ROADMAP.md) are kept in sync.

# 1. Vision

Build `social.thecyclevault.com` as a privacy-conscious, Reddit-style community platform for The CycleVault users.

Core principles:

- Privacy-first
- Mobile-first
- Premium UI/UX
- Secure by default
- Highly maintainable
- Low operational overhead
- Cost-efficient scaling
- AI-agent friendly codebase

---

# 2. High-Level Architecture

```text
Users
  |
  v
GitHub Pages (social.thecyclevault.com)
  |
React + TypeScript SPA
  |
Firebase SDK
  |
+------------------------------+
| Firebase Authentication      |
| Cloud Firestore              |
| Cloud Functions              |
| Firebase Storage             |
| Firebase Analytics (optional)|
+------------------------------+
  |
Optional Future Integrations
  |
Algolia / Meilisearch
Email Provider
Push Notifications
AI Moderation Services
```

---

# 3. Technology Stack

## Frontend

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- TanStack Query
- Zod
- React Hook Form

## Backend

- Firebase Cloud Functions (TypeScript)
- Firebase Admin SDK

## Database

- Cloud Firestore

## Authentication

- Firebase Authentication

## Storage

- Firebase Storage (provisioned in infra; user image uploads land in Phase 2)

## Deployment

- GitHub Pages
- GitHub Actions
- Firebase CLI

---

# 4. Domain Strategy

```text
thecyclevault.com             -> Marketing website
social.thecyclevault.com      -> Community forum
learn.thecyclevault.com       -> Educational content
app.thecyclevault.com         -> Future web app
api.thecyclevault.com         -> Future standalone API
```

---

# 5. Repository Structure

```text
social.thecyclevault.com/
├── public/
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── auth/
│   │   ├── posts/
│   │   ├── comments/
│   │   ├── communities/
│   │   ├── profile/
│   │   ├── moderation/
│   │   ├── notifications/
│   │   └── search/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   ├── styles/
│   ├── types/
│   └── utils/
├── functions/
├── docs/
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── firebase.json
└── .github/workflows/
```

---

# 6. Product Scope

## MVP

- Authentication
- User profiles
- Communities
- Posts
- Comments
- Voting
- Reporting
- Moderation dashboard
- Search
- Notifications (basic)

## Phase 2

- Image uploads
- Saved posts
- DMs
- Polls
- Awards
- Recommendation engine
- AI moderation
- Mobile app integration

---

# 7. User Roles

```text
Guest
Registered User
Moderator
Administrator
Super Administrator
```

Permissions must be enforced in Cloud Functions and Firestore Rules.

---

# 8. Firestore Collections

```text
users
usernames
communities
posts
comments
votes
reports
moderationActions
notifications
auditLogs
bans
settings
```

---

# 9. Data Models

## users/{uid}

Fields:

- uid
- username
- displayName
- avatarUrl
- bio
- role
- status
- karma
- postCount
- commentCount
- createdAt
- updatedAt

## posts/{postId}

Fields:

- authorId
- authorUsername
- communityId
- title
- body
- score
- commentCount
- status
- tags
- createdAt
- updatedAt

## comments/{commentId}

Fields:

- postId
- parentCommentId
- authorId
- body
- score
- status
- createdAt
- updatedAt

---

# 10. Firestore Index Plan

Composite indexes expected:

- communityId + createdAt
- communityId + score
- status + createdAt
- status + score
- authorId + createdAt
- postId + createdAt
- postId + score

Review indexes after usage metrics.

---

# 11. Cloud Function API Contract

## Authentication

- createUserProfile
- reserveUsername

## Posts

- createPost
- updatePost
- deletePostSoft
- lockPost

## Comments

- createComment
- updateComment
- deleteCommentSoft

## Voting

- voteOnPost
- voteOnComment

## Moderation

- reportContent
- removeContent
- suspendUser
- banUser

## Notifications

- createNotification
- markNotificationRead

---

# 12. Security Model

Rules:

- No client-side role escalation.
- No direct karma updates.
- No direct vote aggregation.
- No direct moderation actions.
- Soft deletes only.
- Admin actions logged.

Principles:

1. Validate all input.
2. Principle of least privilege.
3. Trust server only.
4. Fail closed.

---

# 13. Authentication Flow

```text
Register
↓
Create Firebase Account
↓
Reserve Username
↓
Create User Profile
↓
Issue Session
↓
Enter Platform
```

---

# 14. Authorization Matrix

| Action       | Guest | User | Mod     | Admin |
| ------------ | ----- | ---- | ------- | ----- |
| View posts   | Yes   | Yes  | Yes     | Yes   |
| Create posts | No    | Yes  | Yes     | Yes   |
| Comment      | No    | Yes  | Yes     | Yes   |
| Moderate     | No    | No   | Yes     | Yes   |
| Ban users    | No    | No   | Limited | Yes   |

---

# 15. Moderation System

Capabilities:

- Reports
- User suspensions
- Bans
- Post locking
- Content removal
- Audit trail

Every moderation action generates:

```text
moderationActions
auditLogs
```

---

# 16. Search Architecture

## Phase 1

Firestore query search.

## Phase 2

Algolia or Meilisearch.

Search targets:

- Posts
- Users
- Communities

---

# 17. Notification System

Notifications:

- Comment replies
- Post replies
- Moderator actions
- Mentions
- System announcements

---

# 18. Rate Limiting

Examples:

- Posts:
    - 5 per hour

- Comments:
    - 30 per hour

- Reports:
    - 20 per day

- Login attempts:
    - Temporary lockouts

Implement in Cloud Functions.

---

# 19. Abuse Prevention

- Spam detection
- Duplicate content detection
- Link throttling
- Account age requirements
- Optional AI moderation

---

# 20. Privacy Requirements

- No public emails
- Minimal data collection
- User export tools
- User deletion tools
- Clear disclaimer:
  "This platform does not provide medical advice."

---

# 21. Frontend Requirements

Design goals:

- Apple-like
- Premium
- Clean
- Mobile-first
- Responsive
- Accessible

Minimum font size:

15px

Must support:

- Skeleton states
- Error states
- Empty states
- Dark mode

---

# 22. Performance Targets

Initial load:

< 2 seconds

Lighthouse:

> 90

Bundle:

< 300KB initial JS

---

# 23. Observability

- Firebase Analytics
- Error reporting
- Structured logging
- Audit logs

---

# 24. CI/CD

## Pull Requests

- Lint
- Typecheck
- Tests

## Main Branch

- Build
- Deploy GitHub Pages
- Deploy Firebase Functions
- Deploy Rules

---

# 25. Local Development

Commands:

```bash
npm install
npm run dev
firebase emulators:start
npm run lint
npm run test
npm run build
```

---

# 26. Testing Strategy

- Unit tests
- Component tests
- Firestore rule tests
- Function tests
- End-to-end tests

Critical flows:

- Registration
- Username reservation
- Post creation
- Comment creation
- Voting
- Reporting
- Moderation

---

# 27. Scaling Strategy

## Stage 1

0-10k users

Entirely Firebase.

## Stage 2

10k-100k users

Add:

- Algolia
- Caching
- Background jobs

## Stage 3

100k+ users

Evaluate:

- Dedicated API
- GCP services
- Kubernetes
- Event-driven architecture

---

# 28. Disaster Recovery

- Automated backups
- Firestore exports
- Infrastructure documentation
- Incident runbooks

---

# 29. Cost Expectations

## Early Stage

Likely within Firebase free tier or low monthly cost.

## Growth Stage

Primary costs:

- Firestore reads
- Storage
- Cloud Functions
- Search provider

Monitor aggressively.

---

# 30. Development Phases

## Phase 0

Planning and architecture.

## Phase 1

Frontend shell.

## Phase 2

Firebase integration.

## Phase 3

Posts and comments.

## Phase 4

Voting and ranking.

## Phase 5

Moderation.

## Phase 6

Polish.

## Phase 7

Production deployment.

---

# 31. AI Agent Instructions

Before coding:

1. Read this document completely.
2. Inspect repository structure.
3. Produce implementation plan.
4. Do not make architectural changes without approval.
5. Use TypeScript everywhere.
6. Prefer composition over complexity.
7. Maintain strict validation.
8. Never weaken security rules.
9. Update documentation continuously.
10. Build production-quality code.

---

# 32. Immediate Deliverables

Create:

```text
docs/DATA_MODEL.md
docs/API_CONTRACT.md
docs/SECURITY_RULES.md
docs/MODERATION_PLAN.md
docs/UI_REQUIREMENTS.md
docs/DEPLOYMENT_PLAN.md
docs/COST_MODEL.md
docs/SCALING_PLAN.md
docs/TESTING_PLAN.md
```

No implementation should begin until Phase 0 documentation is approved.
