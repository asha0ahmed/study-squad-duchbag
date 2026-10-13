-- Migration: forgot-password / reset-password support.
-- Safe to run against the live database and safe to re-run. Run with:
--   psql -U postgres -d studysquad -f migrations/018_add_password_resets.sql

-- One row per reset link. Only a SHA-256 hash of the token is stored, so a
-- database leak does not expose usable reset links.
CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('student', 'mentor')),
  user_id INTEGER NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user
  ON password_resets(user_type, user_id);

-- Set when a password is reset. Login tokens issued before this moment stop
-- working, so resetting a password also signs out anyone who had access.
ALTER TABLE students ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
ALTER TABLE mentors  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
