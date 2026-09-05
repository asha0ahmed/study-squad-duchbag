# Study Squad — Fix & Improvement Report

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
   to those components and saw the public "Sign in / Get started" scholar
   buttons. Fix: `Navbar` and `BottomNav` now render nothing at all on
   `/admin/*` routes; the Admin Panel gets its own dedicated
   `AdminNavbar` + `app/admin/layout.tsx` guard instead.
2. **Admin/Mentor "Home" tab sending logged-in users back to login.** The
   dock's Home item was hardcoded to `/`, the public landing page, whose
   only CTAs are "I'm a Scholar" / "I'm a Mentor" — both login links. Any
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
