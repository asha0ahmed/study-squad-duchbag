-- Migration: 7-day free trial for invited students.
--
-- An invited student (squad_members.join_type = 'invite') gets a 7-day
-- free trial that starts the moment their squad becomes fully confirmed
-- (status = 'locked'). After it ends they are treated exactly like an
-- expired paid user and must buy a subscription.
--
-- Safe to re-run. Does not touch or drop any existing data.
--
-- Run with:
--   psql -U postgres -d studysquad -f migrations/015_add_invite_free_trial.sql

ALTER TABLE students ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP;
ALTER TABLE students ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;

-- Backfill for students who already joined via invite before this
-- migration existed. Their trial counts from their ORIGINAL join date:
-- the later of (a) when they joined and (b) when their squad reached its
-- 4th member (i.e. became fully confirmed). Many of these will already be
-- past 7 days and therefore start out as expired -- that is intended.
-- Only squads that are already 'locked' are touched; invited students in
-- a squad that is not yet fully confirmed get their trial when it is.
WITH ranked AS (
  SELECT squad_id, joined_at,
         ROW_NUMBER() OVER (PARTITION BY squad_id ORDER BY joined_at, id) AS rn
  FROM squad_members
),
confirmed AS (
  SELECT squad_id, joined_at AS confirmed_at FROM ranked WHERE rn = 4
)
UPDATE students s
SET trial_started_at = GREATEST(COALESCE(sm.joined_at, NOW()), c.confirmed_at),
    trial_ends_at    = GREATEST(COALESCE(sm.joined_at, NOW()), c.confirmed_at) + INTERVAL '7 days'
FROM squad_members sm
JOIN squads sq ON sq.id = sm.squad_id
JOIN confirmed c ON c.squad_id = sm.squad_id
WHERE sm.student_id = s.id
  AND sm.join_type = 'invite'
  AND sq.status = 'locked'
  AND s.trial_started_at IS NULL;
