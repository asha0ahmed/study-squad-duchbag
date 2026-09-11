-- Migration: add an optional phone number to students, so students can log
-- in with either email or phone (see POST /login).
--
-- Nullable, so it never breaks existing student rows that have no phone on
-- file -- they simply keep logging in with email only. The unique index
-- (rather than a plain UNIQUE column constraint) explicitly excludes NULLs
-- so any number of existing/future students without a phone on file can
-- coexist, while still preventing two students from claiming the same
-- phone number. Safe to run against the live database and safe to re-run.
--
-- Run with:
--   psql -U postgres -d studysquad -f migrations/005_add_student_phone.sql

ALTER TABLE students ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS students_phone_unique
  ON students (phone)
  WHERE phone IS NOT NULL;
