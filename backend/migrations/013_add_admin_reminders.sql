-- Migration: admin-sent reminders, surfaced to the student as an in-app
-- popup (e.g. "your subscription expires soon, renew now"). Sent from
-- the admin subscriptions screen via the Reminder button.
--
-- Safe to run against the existing live database.
--
-- Run with:
--   psql -U postgres -d studysquad -f migrations/013_add_admin_reminders.sql

CREATE TABLE IF NOT EXISTS admin_reminders (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  seen_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_reminders_student ON admin_reminders(student_id);
CREATE INDEX IF NOT EXISTS idx_admin_reminders_unseen ON admin_reminders(student_id) WHERE seen_at IS NULL;
