# Study Squad

Monorepo: `backend/` (Node/Express + PostgreSQL API) and `frontend/` (Next.js).

## 1. Prerequisites

- Node.js 18+
- A running PostgreSQL instance

## 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env      # then fill in DB_*, JWT_SECRET, ADMIN_SECRET
```

The API includes per-IP rate limits. Login failures are limited to 10 per
15 minutes, registration to 5 per hour, file uploads to 20 per 15 minutes,
chat messages to 60 per minute, matching to 10 per 15 minutes, admin routes
to 60 per 15 minutes, and all routes have a 300-request per 15-minute safety
limit. These defaults can be adjusted in `.env`; `TRUST_PROXY=true` should
only be used when the server is behind one trusted reverse proxy.

Create the database and load the schema (creates all tables, including
the `phone` column added to `mentors` in this update):

```bash
createdb studysquad          # or: psql -U postgres -c "CREATE DATABASE studysquad;"
psql -U postgres -d studysquad -f schema.sql
```

> Already have a database from before this update? Just run the new
> migration instead of the whole schema:
> `psql -U postgres -d studysquad -f migrations/002_add_mentor_phone.sql`

Start the API (listens on **port 3000**):

```bash
npm start        # or: npm run dev   (auto-restarts on file changes)
```

## 3. Frontend setup

```bash
cd frontend
npm install
cp .env.local.example .env.local   # defaults already point at localhost:3000
npm run dev
```

The dev server runs on **port 3001** (`next dev -p 3001`) so it doesn't
collide with the backend on port 3000 when both run locally at once.
Open http://localhost:3001.

## 4. Logging in as Admin

Admin auth is a shared secret, not an account. Go to
http://localhost:3001/admin/login and enter the value you set for
`ADMIN_SECRET` in `backend/.env`.

## 5. What changed in this update

See `CHANGES.md` for the full fix/improvement/test report.
