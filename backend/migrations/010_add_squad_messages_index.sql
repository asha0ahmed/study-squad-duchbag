-- Chat performance: index for Squad Notes pagination and polling.
--
-- GET /squads/:squadId/messages now serves three access patterns instead
-- of "give me the whole history every time":
--   WHERE squad_id = $1                  ORDER BY id DESC LIMIT $n   (initial load)
--   WHERE squad_id = $1 AND id < $before ORDER BY id DESC LIMIT $n   (scroll-up pagination)
--   WHERE squad_id = $1 AND id > $after  ORDER BY id ASC             (poll for new messages)
--
-- A single composite btree index on (squad_id, id) serves all three: a
-- btree can be scanned in either direction, so both the "id < $before
-- DESC" and "id > $after ASC" cases use it directly, with no sort step
-- and no sequential scan, no matter how large a squad's message history
-- grows.
--
-- Safe to run against the existing live database and safe to re-run.
--
-- Run with:
--   psql -U postgres -d studysquad -f migrations/010_add_squad_messages_index.sql

CREATE INDEX IF NOT EXISTS idx_squad_messages_squad_id_id
  ON squad_messages (squad_id, id);
