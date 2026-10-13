-- Migration: public Squad ID (random 2-3 digit number shown to students,
-- mentors and admin so everyone can refer to the same squad in chat/support).
-- It is NOT the internal squads.id. Safe to re-run. Run with:
--   psql -U postgres -d studysquad -f migrations/017_add_squad_public_code.sql

ALTER TABLE squads ADD COLUMN IF NOT EXISTS public_code INTEGER;

-- Backfill existing squads that have no code yet with distinct random codes.
-- 2-3 digit codes (10..999) are used first; 4+ digit codes are only used if
-- all 990 short codes are already taken.
WITH needs_code AS (
  SELECT id, row_number() OVER (ORDER BY random()) AS rn
  FROM squads
  WHERE public_code IS NULL
),
free_codes AS (
  SELECT n, row_number() OVER (ORDER BY (n > 999), random()) AS rn
  FROM generate_series(10, 99999) AS n
  WHERE n NOT IN (SELECT public_code FROM squads WHERE public_code IS NOT NULL)
)
UPDATE squads s
SET public_code = f.n
FROM needs_code nc
JOIN free_codes f ON f.rn = nc.rn
WHERE s.id = nc.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_squads_public_code ON squads (public_code);

-- New squads get a code automatically (no server code needed).
CREATE OR REPLACE FUNCTION assign_squad_public_code() RETURNS trigger AS $$
DECLARE
  candidate INTEGER;
BEGIN
  IF NEW.public_code IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Serialise squad creation so two squads never pick the same code.
  PERFORM pg_advisory_xact_lock(7301);

  SELECT n INTO candidate
  FROM generate_series(10, 999) AS n
  WHERE NOT EXISTS (SELECT 1 FROM squads WHERE public_code = n)
  ORDER BY random()
  LIMIT 1;

  IF candidate IS NULL THEN
    SELECT n INTO candidate
    FROM generate_series(1000, 99999) AS n
    WHERE NOT EXISTS (SELECT 1 FROM squads WHERE public_code = n)
    ORDER BY random()
    LIMIT 1;
  END IF;

  NEW.public_code := candidate;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_squad_public_code ON squads;
CREATE TRIGGER trg_assign_squad_public_code
  BEFORE INSERT ON squads
  FOR EACH ROW EXECUTE FUNCTION assign_squad_public_code();
