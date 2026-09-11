-- Migration: seed the 8-subject Commerce pool. Students pick any 6 of
-- these in the Profiler (see REQUIRED_SUBJECT_COUNT in
-- frontend/app/profiler/page.tsx) -- unlike Science/Arts, where every
-- listed subject is required.
--
-- Append-only and idempotent: only inserts a (name, academic_group) pair
-- that doesn't already exist, so it's safe to re-run and doesn't touch
-- Science/Arts rows, existing squads, or existing student_subjects data.
--
-- IMPORTANT -- do this after running it:
--   SELECT id, name FROM subjects WHERE academic_group = 'Commerce' ORDER BY id;
-- and report the actual (id, name) pairs back before finalizing
-- frontend/lib/subjects.ts. That file hardcodes subject IDs (there is no
-- GET /subjects endpoint), so if the IDs assigned here don't match what's
-- hardcoded, student ratings would silently save against the wrong
-- subject.
--
-- Run with:
--   psql -U postgres -d studysquad -f migrations/007_add_commerce_subjects.sql

INSERT INTO subjects (name, academic_group)
SELECT v.name, 'Commerce'
FROM (VALUES
  ('Accounting'),
  ('Finance and Banking'),
  ('Marketing'),
  ('Management Studies'),
  ('Statistics'),
  ('Economics'),
  ('English'),
  ('ICT')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM subjects s WHERE s.name = v.name AND s.academic_group = 'Commerce'
);
