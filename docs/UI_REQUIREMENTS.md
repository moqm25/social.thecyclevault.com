# UI_REQUIREMENTS.md — The CycleVault Social

- **Status:** Phase 0 spec (Accepted)
- **Date:** 2026-06-26
- **Owner:** [`adr/0001-foundational-architecture.md`](./adr/0001-foundational-architecture.md)

The forum must feel like it belongs to The CycleVault: calm, premium, mobile-first,
unmistakably the same brand as the app and `thecyclevault.com`. This document is the
design contract for Phase 1 (frontend shell) onward.

---

## 1. Design principles

- **Calm, not loud.** Same ethos as the app: no dark patterns, no streaks, no
  manipulative urgency. Generous whitespace, soft motion, quiet color.
- **Mobile-first.** Designed at 375px first; scales up. Most users arrive from a
  phone via the app/site.
- **Premium / Apple-like.** Soft shadows, rounded corners, restrained type scale,
  decelerating motion. Polished but not flashy.
- **Readable.** Minimum body font size **15px**. High contrast. Comfortable measure.
- **Accessible by default.** Keyboard navigable, screen-reader labelled, reduced-
  motion aware, WCAG 2.1 AA contrast.

---

## 2. Brand tokens (inherited from `thecyclevault.com/site.css`)

Reuse the existing palette so social and marketing are visually continuous.

| Token          | Light     | Role                             |
| -------------- | --------- | -------------------------------- |
| `--coral`      | `#FF7A85` | Primary action, upvote, emphasis |
| `--coral-soft` | `#FFB4BB` | Hover/secondary coral            |
| `--coral-wash` | `#FFE6E8` | Tint backgrounds                 |
| `--lav`        | `#A89BFF` | Secondary, links, accents        |
| `--lav-wash`   | `#ECE8FF` | Tint backgrounds                 |
| `--cream`      | `#FFF8F6` | Warm surface                     |
| `--bg`         | `#FBF8FB` | App background                   |
| `--bg-2`       | `#F6F1F6` | Raised surface                   |
| `--ink`        | `#0F1116` | Primary text                     |
| `--ink-2`      | `#2A2733` | Secondary text                   |
| `--muted`      | `#6B6677` | Tertiary text                    |
| `--muted-2`    | `#9B95AE` | Disabled/hint                    |

- **Gradients:** `--grad-warm` (`#FF7A85 → #B6ADFF`) for hero/brand moments only.
- **Dark mode** is **required** (mirror the site's inverted palette; dark surfaces,
  light text). Respect `prefers-color-scheme` + a manual toggle persisted in
  `localStorage`.
- **Radii:** `--radius: 22px`, `--radius-lg: 32px` (cards), smaller (10–12px) for
  chips/inputs.
- **Shadows:** soft, layered (mirror `--shadow-1` / `--shadow-2`).
- **Motion:** `--ease-smooth: cubic-bezier(.2,.7,.1,1)`; reduce/disable under
  `prefers-reduced-motion`.

### Typography

- **Body/UI:** `Inter` (with system fallback). Weights 400/500/600/700.
- **Accent/headings (sparingly):** `Fraunces` italic for brand moments only — not
  for dense UI.
- Type scale (mobile): 15 / 16 / 18 / 22 / 28 / 34. Line-height ≥ 1.45 for body.

> Implementation note: expose tokens as CSS variables and map them into the
> Tailwind theme (`tailwind.config` `extend.colors/borderRadius/boxShadow`) so
> classes and raw CSS share one source of truth.

---

## 3. Pages / routes

| Route               | Page            | Notes                                                           |
| ------------------- | --------------- | --------------------------------------------------------------- |
| `/`                 | Home feed       | Default sort **Hot**; toggles Hot/New/Top; community rail       |
| `/login`            | Auth            | Email/password + optional Google; sign-up flow w/ username pick |
| `/c/:communitySlug` | Community       | Header (name/desc/rules), sorted post list                      |
| `/post/new`         | Composer        | Community picker, title, body, tags; disclaimer                 |
| `/post/:postId`     | Post detail     | Post + threaded comments + composer                             |
| `/u/:username`      | Profile         | Karma, posts, comments tabs (pseudonymous)                      |
| `/settings`         | Settings        | Profile edit, appearance, notifications, data export/delete     |
| `/notifications`    | Inbox           | List, unread badge, mark-read                                   |
| `/mod`              | Mod dashboard   | Role-gated (mod+)                                               |
| `/admin`            | Admin dashboard | Role-gated (admin+)                                             |
| `*`                 | Not found       | Friendly empty state                                            |

Deep links must survive refresh on GitHub Pages (see `DEPLOYMENT_PLAN.md` §2).

---

## 4. Core components

- **AppShell:** top bar (logo → `thecyclevault.com`, search, theme toggle, auth/
  avatar), responsive nav (bottom tab bar on mobile, sidebar on desktop).
- **PostCard:** vote control, title, community + author + relative time, score,
  comment count, overflow menu (report/share/edit/delete by permission).
- **VoteControl:** up/down with optimistic state; coral up, lavender/muted down;
  haptic-like micro-interaction; disabled for guests with a sign-in nudge.
- **CommentTree:** threaded to depth 6, collapsible, "continue thread" at cap.
- **Composer:** title/body, markdown-lite, character counters, the medical
  disclaimer, submit with rate-limit-aware error.
- **CommunityChip / TagChip / Flowless badges** reusing app visual language.
- **Skeletons, EmptyState, ErrorState, Toast, Modal/Sheet, ConfirmDialog,
  Avatar, KarmaPill, RoleBadge, ReportDialog.**

---

## 5. Required UI states

Every data-driven view must implement **all four**:

1. **Loading** — skeletons that match final layout (no spinners-only).
2. **Empty** — calm, branded, with a primary action ("Be the first to post").
3. **Error** — human message + retry; never a raw stack trace.
4. **Loaded** — the content.

Plus: **offline** awareness (TanStack Query cache + retry), **optimistic** voting
with rollback on failure, and **permission** states (guest vs user vs mod controls).

---

## 6. Accessibility (hard requirements)

- Body text ≥ **15px**; never below.
- Full **keyboard** operability (focus rings, logical tab order, skip-to-content).
- **Screen-reader** labels on icon-only controls (vote, overflow, nav).
- Contrast **AA** (≥ 4.5:1 text, 3:1 large/UI) in **both** themes — verify coral on
  cream and lavender links pass.
- `prefers-reduced-motion` disables non-essential animation.
- Forms: labelled inputs, inline validation, error summaries.
- Touch targets ≥ 44×44px.

---

## 7. Performance budget

| Metric                                | Target       |
| ------------------------------------- | ------------ |
| Initial JS (gzipped)                  | **< 300 KB** |
| First load (4G mobile)                | **< 2 s**    |
| Lighthouse (Perf/A11y/Best-Practices) | **> 90**     |
| Largest Contentful Paint              | < 2.5 s      |
| Interaction to Next Paint             | < 200 ms     |

Techniques: route-level code splitting, lazy-load `/mod` `/admin`, paginate feeds
(no unbounded reads), cache reads via TanStack Query, defer `Fraunces` (display
font) and subset `Inter`, compress/resize avatars (Phase 2).

---

## 8. Content & tone

- Microcopy is warm and plain — match the app ("Hi 👋", "Be the first to post",
  "Nothing here yet"). No guilt, no growth-hacky nudges.
- Persistent **medical disclaimer** on composer + footer.
- Empty/error copy reassures rather than alarms.

---

## 9. Out of scope for MVP (Phase 2 UI)

Rich-text/markdown editor toolbar, image uploads, polls, awards/badges UI, DMs,
saved-posts view, web-push permission prompts. Design tokens and component
structure should leave room for these without rework.
