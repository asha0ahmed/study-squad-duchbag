-- Migration: widen students.year, squads.year, and squads.aspirant_type so
-- they can hold every value the signup form actually offers.
--
-- Bug: the student signup dropdown (frontend/app/auth/student/signup/page.tsx)
-- offers "HSC Passout / Admission Candidate" (34 chars) as a `year` value,
-- but students.year was only VARCHAR(20) and squads.year only VARCHAR(30).
-- Postgres rejected the insert with "value too long for type character
-- varying(20)", which server.js's catch-all then reported to the user as
-- the generic "Something went wrong saving the student." -- hiding the real
-- cause. squads.aspirant_type was VARCHAR(30), exactly the length of
-- "University Admission (General)" (30 chars) -- it happens to fit today
-- but leaves zero room for that option's label/value to ever grow.
--
-- Widening a VARCHAR column is a metadata-only change in Postgres (no table
-- rewrite, no row scan), so this is safe to run against a live Neon
-- database with no downtime.
--
-- Run with (from backend/):
--   psql "$DATABASE_URL" -f migrations/011_widen_year_aspirant_type.sql
--
-- $DATABASE_URL is your Neon connection string (Neon dashboard -> your
-- project -> Connection Details -- use the "pooled connection" string if
-- that's what your app normally connects with). You can also paste the SQL
-- directly into the Neon console's SQL Editor.

ALTER TABLE students ALTER COLUMN year TYPE VARCHAR(50);
ALTER TABLE squads   ALTER COLUMN year TYPE VARCHAR(50);
ALTER TABLE squads   ALTER COLUMN aspirant_type TYPE VARCHAR(60);

-- students.aspirant_type is already VARCHAR(50), which comfortably fits
-- every current option (max is "University Admission (General)" at 30
-- chars), so it's left as-is. Widened here too for headroom/consistency
-- with squads.aspirant_type, since both are populated from the same form:
ALTER TABLE students ALTER COLUMN aspirant_type TYPE VARCHAR(60);
