-- Migration: give mentor-fee subscriptions a real end date, and let
-- admins remove a student (e.g. subscription lapsed and was never
-- renewed) without deleting their row.
--
-- Safe to run against the existing live database -- does not touch or
-- drop any existing table, and is safe to re-run (IF NOT EXISTS / no-op
-- on conflict).
--
-- Run with:
--   psql -U postgres -d studysquad -f migrations/012_add_subscription_expiry_and_removal.sql

ALTER TABLE payments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_payments_expires_at ON payments(expires_at);

ALTER TABLE students ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_status_check;
ALTER TABLE students ADD CONSTRAINT students_status_check CHECK (status IN ('active', 'removed'));
ALTER TABLE students ADD COLUMN IF NOT EXISTS removed_at TIMESTAMP;

-- Backfill: every payment that was already approved before this
-- migration existed has no expires_at yet. Compute it the same way the
-- approve endpoint now does going forward, using reviewed_at (falling
-- back to created_at if reviewed_at is somehow null) as the start point.
UPDATE payments
SET expires_at = COALESCE(reviewed_at, created_at)
  + (CASE plan WHEN '1_month' THEN INTERVAL '1 month' ELSE INTERVAL '6 months' END)
WHERE status = 'approved' AND expires_at IS NULL;
