# Study Squad — Fix & Improvement Report

## Session 8 — Squad Notes: Messenger-style sending + Camera/Gallery menu

- **Optimistic sending.** Messages appear instantly with "Sending…", then
  "✓ Sent", or "Failed to send" with per-message **Retry** / **Remove**. The
  input and Send button are never disabled while sending. Messages go out
  through a client-side queue (one request at a time) so server order matches
  send order; a failed or timed-out message is skipped, not blocking.
- **No duplicates.** Each send carries a client-generated `client_id`. The
  Socket.IO broadcast echoes it (never stored), and the server remembers it
  for 10 minutes (in memory) so a Retry of a message that actually went
  through returns the existing row instead of inserting again. Broadcast,
  reconnect catch-up/poll and POST response all merge through one
  id-deduplicating, id-ordered path.
- **Attachment menu.** The image button now opens 📷 Camera / 🖼️ Gallery /
  Cancel (opens upward inside the chat area, never over the dock). Phones use
  the native camera via `capture`; desktop opens a webcam dialog
  (`getUserMedia`) and falls back to the file picker if unavailable.
- Files: `backend/server.js`, `frontend/app/squad/notes/page.tsx`,
  `frontend/lib/api.ts`, `frontend/lib/types.ts`, `frontend/app/globals.css`.
  No schema/migration, auth, or dependency changes.
- **Promo code no longer saved.** `PaymentForm.tsx` no longer stores the applied
  promo code in `localStorage`; students enter it each time they open the
  payment form. Any code saved by the old behaviour is removed on load.

## Session 7 — 7-day free trial for invited students + stackable renewals

### What changed
- **Invited students no longer get free access forever.** An invited student
  (`squad_members.join_type = 'invite'`) gets a **7-day free trial that starts
  the moment their squad becomes fully confirmed** (`status = 'locked'`, i.e.
  4 members). One trial per student, ever (`students.trial_started_at IS NULL`
  guard). Length is `INVITE_TRIAL_DAYS` in `.env` (default 7).
- **After the trial they are treated as an expired paid user**: matching is
  refused with `402 subscriptionExpired`, and Squad Notes (REST + live socket)
  and Tasks (view / submit) return `402 subscriptionExpired`. The app sends the
  student to **More -> Subscribe** to buy a plan. Mentors are never affected.
- **Buying again while subscribed extends the subscription.** The new period
  starts where the student's existing time ends (latest of: now, earlier
  approved payments' end, and — invited students only — the end of the free
  trial). So 10 days left + 1 month = 10 days + 1 month. A lapsed student
  starts fresh from the approval date. Time is still added only when the admin
  approves the payment.
- **More -> Subscribe** now shows plan state (Free trial · Nd left / Active · Nd
  left / Expired — renew / Pending review) and the Subscribe page always offers
  "Extend / Renew" with the current end date. Squad page banner updated too.
- **Admin -> Subscriptions** lists trial-only students as "Free trial (invited)"
  and shows the real end date (trial + paid, stacked).

### Files
- `backend/migrations/015_add_invite_free_trial.sql` (new) + `schema.sql`:
  `students.trial_started_at`, `students.trial_ends_at`. **Existing invited
  students are backfilled from their original join date** (later of their join
  and when their squad reached 4 members) + 7 days — many will start out
  expired, as requested.
- `backend/server.js`: `startInviteTrials`, `getSubscriptionState`,
  `requireActiveSubscription`, `GET /students/:id/subscription`, stacking in
  `PATCH /admin/payments/:id/approve`, match gate, socket `join_squad` gate,
  `/admin/subscriptions`.
- Frontend: `lib/api.ts`, `lib/types.ts`, `BottomNav.tsx`,
  `app/squad/subscribe/page.tsx`, `SubscriptionStatus.tsx`,
  `app/admin/subscriptions/page.tsx`.

### Behaviour note
Squad Notes / Tasks are now blocked for ANY student whose subscription has
ended (paid or trial), not just invited ones. Previously an expired paid
student kept access until an admin removed them.

### Verified
Against a real PostgreSQL 16: trial starts only when the 4th member joins;
non-invited members get none; trial = exactly 7 days; buying 1 month then 6
months while active stacks after the previous end; expired -> 402 on messages,
renew after lapse starts from now and restores access; admin list includes
trial-only students; migration backfill uses the original join date and is
re-runnable. Frontend: `tsc --noEmit`, `eslint`, `next build` clean.
Not tested: real Cloudinary uploads / browser click-through.

**Action required:** run
`psql -U postgres -d studysquad -f backend/migrations/015_add_invite_free_trial.sql`
on your local DB and the live Neon DB, then restart the backend.

## Session 6 — Squad Notes: composer arrangement + send icon

- New `send` paper-plane icon in `components/layout/DockIcons.tsx`.
- Composer order is now: image, voice (mic), typing box, round send button --
  always on ONE row (no wrapping on phones). Recording state keeps the image
  button, shows a timer pill with Cancel, and a round send button.
- Round 44px icon buttons, pill-shaped typing box, round gradient send button
  (disabled/dimmed until text is typed). New classes in `globals.css`:
  `.chat-icon-btn`, `.chat-send-btn`, `.chat-input`, `.chat-recording`.
- Placeholder shortened to "Write a note…" so it is not clipped on phones.
- Chat log fills the space down to the composer and stays scrolled to the
  newest message; log and composer share the same left/right edges.
- Phones only: chat block extended lower so the type row sits ~18px above the
  dock (was ~38px), matching the reference screenshot. Page still never scrolls.
- Verified in headless Chromium against the real built app (mock backend) at
  360x640, 390x780, 412x915, 390x420 (keyboard), 1280x584.

## Session 5 — Squad Notes: composer pushed under the bottom dock (root cause)

### Problem
The message input, image button, mic and send button were not visible on
`/squad/notes`; the page scrolled as a whole and the composer sat under the
fixed bottom dock.

### Root cause
`<body>` is a flex column with only `min-height` (no definite height) and the
chat `<main>` also carries Tailwind `flex-1` (`flex: 1 1 0%`). A percentage
flex-basis against an indefinite container resolves to `content`, and a
non-`auto` flex-basis overrides `height`. So the `height: calc(100dvh - ...)`
on `.chat-page` was never applied: `<main>` grew to fit every message, the
body scrolled instead of the message list, and the composer landed below the
fold, behind the dock.

### Fix (`frontend/app/globals.css`, `.chat-page` only)
- `flex: 0 0 auto; min-height: 0;` so the explicit height is authoritative.
- Height now also subtracts the navbar's 1px border, so the page no longer
  overflows by 1px.
- Result: the message list is the only scrolling region and the composer stays
  visible directly above the dock on mobile and desktop.

### Verified
`npm install`, `tsc --noEmit` and `next build` pass. No JS/TS, backend, or
schema changes.

## Session 4 — Squad Notes chat: cursor pagination + index (7–8 req/s target)

### Problem

Squad Notes (chat) had two scalability issues:

1. **Full-history refetch on every request.** `GET /squads/:squadId/messages`
   returned every message in the squad, every time, with no `LIMIT`. The
   frontend polled this endpoint every 7s and also called it after every
   single send. A squad's chat load time and payload size grew without
   bound as its history grew.
2. **No supporting index.** The query filtered by `squad_id` and sorted by
   `created_at` with nothing but the table's primary key to help — a
   sequential scan + sort on every call.

### Changes made (chat system only)

- **`backend/db.js`** — made the `pg.Pool` size/timeouts explicit and
  env-configurable (`DB_POOL_MAX`, `DB_POOL_IDLE_TIMEOUT_MS`,
  `DB_POOL_CONN_TIMEOUT_MS`), default behavior unchanged (`max=10`).
- **`backend/server.js`** — rewrote only `GET /squads/:squadId/messages`
  to page by message id instead of returning full history:
  - no cursor → latest page (initial load, default 60, capped at 100)
  - `?before=<id>` → older page (scroll-up pagination)
  - `?after=<id>` → only messages newer than that id (polling)
  - Response shape is now `{ messages, hasMore }`. Auth, squad-membership
    checks, and the `POST` send route are untouched.
- **`backend/migrations/010_add_squad_messages_index.sql`** (new) +
  **`schema.sql`** — added `idx_squad_messages_squad_id_id` on
  `squad_messages (squad_id, id)`. A single composite btree index serves
  all three access patterns above in either scan direction.
- **`frontend/lib/api.ts` / `lib/types.ts`** — `getSquadMessages` now takes
  `{ limit, before, after }` and returns `SquadMessagesPage`;
  `sendSquadMessage`'s return type corrected to
  `SquadMessageInsertResult` (it never actually included `sender_name`;
  the frontend previously just ignored the response and refetched).
- **`frontend/app/squad/notes/page.tsx`** — rewritten to: load the latest
  60 messages on open; load older messages in batches of 40 on scroll-up,
  preserving exact scroll position; poll only `?after=<lastId>` every 7s
  instead of refetching everything; append a sent message locally instead
  of refetching after every send; memoize each message row (`React.memo`)
  so appending/prepending doesn't re-render existing bubbles. Text,
  image, and voice sending, and Cloudinary attachment handling, are
  unchanged.

### Verified

- `EXPLAIN ANALYZE` on all three query shapes (no cursor / `before` /
  `after`) against a 6,000-row squad: `Index Only Scan` in both scan
  directions, sub-millisecond execution — vs. the old query's `Seq Scan`
  + `Sort` at the same size.
- Mixed-workload load test (poll/older/initial/send, weighted realistically)
  across 15 seeded squads (75 concurrent simulated users) with 60,000+
  seeded messages: **90s sustained at ~7.4 req/s → 0% errors, p95 3–8ms,
  p99 6–12ms** across every request type. A follow-up stress run pushed
  to ~60 req/s (8x the target) with still 0% errors, confirming headroom
  above the target on the same free-tier-equivalent single Postgres
  instance.
- `tsc --noEmit`, `eslint`, and `next build` all pass clean.
- Re-verified against the original codebase: `git diff` on `server.js`
  touches only the `GET` messages route; `POST` route, rate limiters,
  auth middleware, matching, payments, and every other endpoint are
  byte-for-byte unchanged.

## Session 3 — Background feature, mentor photo, and a full re-audit

### Audit (before any code was touched)

Re-inspected the whole repo against the Session 1/2 record above:

- **Email/phone-optional student signup/login** — intact. `students.phone`
  is nullable with a partial unique index, `email`'s `NOT NULL` was already
  dropped (`migrations/006_student_email_optional.sql`), and `POST /login`
  correctly routes on `identifier` (checks for `@`) against either field.
- **Commerce academic group (8-subject pool, pick any 6)** — intact.
  `schema.sql` seeds it, `migrations/007_add_commerce_subjects.sql` seeds
  it idempotently for existing DBs, `frontend/app/profiler/page.tsx` has
  `REQUIRED_SUBJECT_COUNT.Commerce = 6` vs. "all required" for Science/Arts.
- **"Commerce Admission" in Aspirant Type** — searched the whole repo; it
  was never actually present in `ASPIRANT_TYPE_OPTIONS`. The four options
  (Engineering Admission / Medical Admission / University Admission
  (General) / HSC Board Exam) were already correctly separate from
  `academic_group`. Nothing to fix here.
- **Mentor squad-claiming** — re-verified atomic and correctly filtered
  (`status = 'locked' AND mentor_id IS NULL`, claim uses
  `UPDATE ... WHERE mentor_id IS NULL RETURNING *` with a 409 on a lost
  race). No changes made.
- **Squad Name column** — asked; declined for this session. Squads remain
  identified by academic_group + year + aspirant_type only.

### Features added

- **Aspirant-Type Based Permanent Background.** A student's in-app
  background is now fixed to their `aspirant_type` (existing column,
  reused — no duplicate field) and shown identically on every login.
  - `frontend/lib/aspirantBackgrounds.ts` — the mapping.
  - `frontend/components/layout/AspirantBackground.tsx` — renders it,
    mounted once in `app/layout.tsx`; shows nothing for mentors or on the
    public landing page (no student session = no background).
  - `POST /login` now returns `aspirant_type` on the student session object
    (it didn't before) so the frontend can key off it without an extra
    request.
  - This is a **separate mapping from** the academic_group-keyed gate
    images already used by the public landing page's hero slider — the two
    are not merged.
  - "Engineering Admission" reuses the existing real BUET photo
    (`public/images/gates/science-buet.webp`). Medical / University
    (General) / HSC Board Exam use **placeholder graphics** (abstract,
    not real building photos — see `public/images/gates/README.md`)
    pending the real DMC/DU/board-exam images being dropped in under the
    exact same filenames; no code changes needed when that happens.
- **Mentor Profile Photo** (mentor-only; no student-side equivalent).
  - `migrations/008_add_mentor_photo.sql` — adds nullable
    `mentors.photo_url` and `mentors.photo_public_id`.
  - `POST /mentors/me/photo` — reuses the existing Cloudinary integration
    (`backend/utils/cloudinary.js`) and the same multer/in-memory pattern
    already used for chat attachments. Scoped strictly to the
    authenticated mentor's own record via the verified JWT's `mentorId`
    (no `:id` in the URL, so a mentor can never target another mentor's
    row).
  - `components/ui/Avatar.tsx` gained an optional `photoUrl` prop
    (backward compatible — no existing caller passes it, so every other
    avatar in the app is unaffected) and `components/desk/MentorDesk.tsx`
    now shows the mentor's own photo with an upload control in their
    desk header ("mentor profile view").

### Verification

Backend: `node --check` on every `.js` file in `backend/`. Frontend:
`npx tsc --noEmit` and `npx eslint .` across the whole project — both
clean (zero errors; the only lint warnings are the same pre-existing
`<img>`-vs-`next/image` warnings already present elsewhere in the
codebase, e.g. `HeroImageSlider.tsx`).

**Action required on your deployment:** run
`backend/migrations/008_add_mentor_photo.sql` against your local Postgres
and the live Neon database (see the migration instructions given
alongside this delivery). It's additive/nullable and safe to run against
a database with existing mentors, students, squads, and payments.

## Session 2 — Task Management, Rating, and the "phone column" root cause

### Bugs fixed

1. **Admin → Mentor Record ("Something went wrong loading mentor's record")
   and Mentor Signup ("Something went wrong saving the mentor") — same root
   cause.** Reproduced live against a real Postgres instance: both routes
   read/write `mentors.phone`, which only exists if
   `migrations/002_add_mentor_phone.sql` has been applied. On a database
   that predates that migration, Postgres throws `42703: column "phone"
   does not exist`, which both routes catch and report as their generic
   message. Confirmed by dropping the column and reproducing the exact
   screenshot symptom (including the "jahangir nagar unu" test case), then
   restoring it and re-verifying both routes succeed. **No schema change
   was needed in this codebase** — `schema.sql` already includes `phone` —
   but the mentor-signup route is now wrapped in a transaction
   (`BEGIN`/`COMMIT`/`ROLLBACK`) so a failure partway through can no longer
   leave a mentor row committed without its groups, and the server-side
   error log now includes the actual Postgres error code to make this
   class of issue diagnosable in the future. **Action required on your
   deployment:** run `backend/migrations/002_add_mentor_phone.sql` (and
   `003_add_tasks.sql`, added this session) against your live database if
   you haven't already.
2. **Mentor → Browse Open Squad.** Re-verified end-to-end; this was
   already fixed correctly in Session 1 (item 3 below) and works once a
   mentor's subject group is approved via Admin → Mentor Records.

### Features added — Task Management, Submissions, and Rating

- **Database:** `migrations/003_add_tasks.sql` adds `tasks` and
  `task_submissions`. A task belongs to one squad (never duplicated per
  student); "who sees it" is derived at read-time from `squad_members`.
  No file binaries are stored in Postgres — only Cloudinary's
  `secure_url`, `public_id`, `resource_type`, `format`, and `bytes`.
- **Cloudinary:** `backend/utils/cloudinary.js` (env-var only config, see
  `.env.example`) + `backend/middleware/upload.js` (multer, in-memory,
  server-side MIME whitelist — PDF/JPG/JPEG/PNG/WEBP — 15MB limit,
  validated against the actual detected mimetype, not a client-supplied
  extension).
- **Backend routes:** `POST /tasks` (mentor uploads a task to a squad they
  mentor), `GET /mentors/tasks` (mentor's own tasks + submission counts),
  `GET /students/:id/tasks` ("Today's Given Tasks" + the student's own
  submission status), `POST /tasks/:taskId/submit` (student submits/
  resubmits an answer), `GET /tasks/:taskId/submissions` (mentor's Rating
  data source), `PATCH /submissions/:id/rate` (mentor rates 1–5 +
  optional feedback).
- **Authorization:** every route re-derives ownership from the database
  (mentor must be assigned to the squad to create a task or rate its
  submissions; a student must currently belong to a task's squad to
  submit) rather than trusting any client-supplied id. Verified live: a
  second mentor cannot create tasks for, view submissions for, or rate
  students in a squad they don't mentor; a student outside a squad cannot
  submit to its task; wrong-role and unauthenticated requests are
  rejected; disallowed file types are rejected server-side.
- **Frontend:** new `/tasks` route (role-aware — students see "Today's
  Given Tasks" with a Submit Answer flow; mentors see task upload +
  a per-task submission-count list) and new `/rating` route (mentor-only —
  pick a task, review each submission's file, give a 1–5 star rating +
  feedback). "Upload Task" now sits next to "Squad Notes" on each of a
  mentor's squad cards. Bottom nav: Home → **Tasks** for both roles;
  Mentor's My Squad → **Rating** (Student's My Squad is unchanged).

### Testing performed

- Stood up a real Postgres instance and ran the actual `backend/server.js`
  against it (not just code review) to confirm every claim above,
  including the phone-column root-cause reproduction and the full
  Task → Submission → Rating happy path and its security boundaries.
- `cd frontend && npm run build` succeeds, including the two new routes;
  `npx eslint` clean on all new/changed files.
- **Not tested:** an actual network call to Cloudinary's API — this
  sandbox has no route to `api.cloudinary.com`. The upload code path
  (multer → buffer → `cloudinary.uploader.upload_stream`) was verified
  end-to-end with a temporary local stub standing in for that one network
  call, then reverted to the real `cloudinary` SDK call before delivery.
  You'll want to smoke-test one real task upload and one real submission
  after adding your Cloudinary credentials.

---

## Session 1 — Original Fix & Improvement Report

## Fixed

1. **Admin/Mentor navbar behaving like the Student navbar.** Admin auth is a
   shared secret (`sessionStorage`), completely separate from the
   student/mentor `session` (`localStorage`) that the global `Navbar` and
   `BottomNav` read. An authenticated admin therefore looked "logged out"
   to those components and saw the public "Sign in / Get started" Student
   buttons. Fix: `Navbar` and `BottomNav` now render nothing at all on
   `/admin/*` routes; the Admin Panel gets its own dedicated
   `AdminNavbar` + `app/admin/layout.tsx` guard instead.
2. **Admin/Mentor "Home" tab sending logged-in users back to login.** The
   dock's Home item was hardcoded to `/`, the public landing page, whose
   only CTAs are "I'm a Student" / "I'm a Mentor" — both login links. Any
   authenticated user tapping them landed on a login screen. Fix: added
   `HomeRedirect`, which immediately routes an already-authenticated
   visitor away from `/` to their real dashboard (`/desk` for
   student/mentor, `/admin` for admin); Mentor's Home dock item now also
   points at `/desk` directly.
3. **Mentor "Browse Squads" not showing eligible squads.** Root cause
   wasn't a missing "name" field (squads never had one — they're shown as
   group · year, by design). It was that new mentors' groups default to
   `approval_status = 'pending'`, and the only endpoint to approve a group
   required the admin secret — with **no UI anywhere that called it**. So
   `available-squads` always returned `[]` for a brand-new mentor. Fixed
   by wiring a real "Approve" action into the new Mentor Records page,
   backed by the existing (previously orphaned) `/mentors/:id/groups/:g/approve`
   endpoint.
4. **No Admin UI for Student Records / Mentor Records** (items didn't
   exist at all). Built both, backed by two new endpoints.
5. **No `phone` field on mentors** — required for Mentor Records but
   missing from the schema entirely. Added a nullable `phone` column via
   migration (`backend/migrations/002_add_mentor_phone.sql`), safe to run
   against an existing database.
6. **Backend/frontend dev servers both default to port 3000** — running
   the full stack locally at once would conflict. Frontend dev/start
   scripts now use port 3001; `.env.local.example` documents this.
7. **No `.env.example` for the backend** and **no `start`/`dev` npm
   scripts** — both added, matching the env vars actually read in
   `server.js`.

## Added / Improved

- **Admin Panel** (`/admin`): dedicated `AdminNavbar` with 5 sections —
  **Student Records** (search by email, phone, or transaction ID, with
  loading / no-results / error / result-card states), **Mentor Records**
  (name, phone, institution, group-approval status with an inline
  Approve action, and currently assigned squads), **Payments** (existing
  page, now living under the shared admin layout instead of its own
  duplicate auth-guard code), and two clearly-labeled "Coming soon"
  placeholders — **Squad & Activity Monitoring** and **Reports &
  Analytics** — with a real layout, not a blank page.
- **Admin auth guard centralized** in `app/admin/layout.tsx` instead of
  being re-implemented per page, so every current and future admin page
  is automatically protected and gets the same nav.
- **Landing page**: added a structural "Squads currently running"
  section (placeholder data, clearly labeled "Preview layout"), ready to
  be swapped for real data once the final design is provided, without
  touching the rest of the landing page.
- **Backend**: `GET /admin/students/search` (email / phone / transaction
  ID, via a join on `payments.sender_phone` / `payments.trx_id` since
  students don't store a phone number directly) and `GET /admin/mentors`
  (mentor + group approval status + assigned squads in one call).

## Verified (code-level audit, no live DB in this sandbox — see Remaining)

- `frontend build` (`next build`) — compiles clean, all 22 routes
  generated, including the 6 new `/admin/*` pages.
- `eslint` on `app/`, `components/`, `lib/` — 0 errors, 0 warnings.
- `node -c backend/server.js` — syntax valid.
- Traced onboarding order (`profiler` → `squad/find` → `squad/subscribe`
  → payment → `squad`) and role guards on `/desk`, `/squad`,
  `/squad/notes`, `/invite/[code]` — all already correctly redirect
  unauthenticated or wrong-role users; no changes needed there.
- Traced squad eligibility logic (`squad_members` count → `locked`
  status) in `server.js` — already correct, not the source of the
  reported bug.
- "Find My Squad" → "View My Squad" — already sourced from the server
  (`getMySquad`), not local-only state, so it already survives refresh
  and re-login; no change needed.

## Remaining / Not testable in this sandbox

- **No live PostgreSQL instance was available in this environment**
  (network is restricted to package registries, not a DB or apt mirror
  with working package availability), so the new `/admin/students/search`
  and `/admin/mentors` endpoints, and the mentor-group approve action,
  are verified by code review and syntax check only — not by running
  requests against real data. Please run the flows in Section 15 of the
  original brief once you have the app running locally with a real
  database.
- The three placeholder Admin sections (Squad Monitoring, Reports &
  Analytics) are intentionally structural only, per the brief.
- Broader responsive/mobile visual QA (item #10) was reviewed at the code
  level (existing Tailwind classes, existing responsive patterns reused)
  but not visually verified in a browser, since this sandbox has no
  screenshot/browser tool.
