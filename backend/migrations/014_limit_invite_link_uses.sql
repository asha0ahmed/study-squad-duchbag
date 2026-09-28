-- Each squad invite link may be used by at most two students.
-- Initialize the counter from existing invite-joined members before enforcing
-- the same rule for all future joins.
ALTER TABLE squads
  ADD COLUMN IF NOT EXISTS invite_uses INTEGER NOT NULL DEFAULT 0;

UPDATE squads s
SET invite_uses = LEAST(2, counts.invite_uses)
FROM (
  SELECT squad_id, COUNT(*)::integer AS invite_uses
  FROM squad_members
  WHERE join_type = 'invite'
  GROUP BY squad_id
) counts
WHERE s.id = counts.squad_id;

ALTER TABLE squads
  DROP CONSTRAINT IF EXISTS squads_invite_uses_check;

ALTER TABLE squads
  ADD CONSTRAINT squads_invite_uses_check CHECK (invite_uses BETWEEN 0 AND 2);
