-- Migration: add an optional phone number to mentors.
-- Needed for the Admin "Mentor Records" panel. Nullable so it never
-- breaks existing mentor rows -- safe to run against the live database
-- and safe to re-run (IF NOT EXISTS).
--
-- Run with:
--   psql -U postgres -d studysquad -f migrations/002_add_mentor_phone.sql

ALTER TABLE mentors ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
