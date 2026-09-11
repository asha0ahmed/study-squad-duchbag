-- Migration: make students.email optional.
--
-- A student can now sign up with just a phone number (see
-- migrations/005_add_student_phone.sql) instead of email, so email can no
-- longer be required at the database level -- only "at least one of
-- email/phone" is required, and that's enforced in application code
-- (POST /students in server.js), not by a DB constraint, since Postgres
-- can't easily express "at least one of these two nullable columns" as a
-- simple CHECK without also having to handle the empty-string case from
-- forms.
--
-- Existing students all already have an email on file, so relaxing this
-- constraint doesn't change or risk any existing data -- it only allows
-- new rows going forward to omit it. Safe to run against the live
-- database and safe to re-run.
--
-- Run with:
--   psql -U postgres -d studysquad -f migrations/006_student_email_optional.sql

ALTER TABLE students ALTER COLUMN email DROP NOT NULL;
