-- Chat: image sharing & voice messages in Squad Notes.
--
-- A message can now carry an optional attachment (image or voice clip)
-- instead of, or alongside, its text. Follows the same Cloudinary
-- URL-only storage pattern as Task Management (see
-- migrations/003_add_tasks.sql) -- file binaries are never stored in
-- Postgres, only the secure_url + metadata needed to display/play them.
--
-- Safe to run against the existing live database and safe to re-run.
--
-- Run with:
--   psql -U postgres -d studysquad -f migrations/004_add_chat_attachments.sql

-- `message` was NOT NULL because every message used to be text-only.
-- An attachment-only message (just an image, or just a voice clip) has
-- no text, so this becomes optional; the CHECK constraint below ensures
-- a message row still can't be completely empty.
ALTER TABLE squad_messages ALTER COLUMN message DROP NOT NULL;

ALTER TABLE squad_messages
  ADD COLUMN IF NOT EXISTS message_type VARCHAR(10) NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'voice'));

ALTER TABLE squad_messages ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(500);
ALTER TABLE squad_messages ADD COLUMN IF NOT EXISTS attachment_public_id VARCHAR(255);
ALTER TABLE squad_messages ADD COLUMN IF NOT EXISTS attachment_format VARCHAR(20);
ALTER TABLE squad_messages ADD COLUMN IF NOT EXISTS attachment_bytes INTEGER;
-- Voice clips only -- how long the recording runs, so the UI can show a
-- duration on the bubble without having to load the audio first.
ALTER TABLE squad_messages ADD COLUMN IF NOT EXISTS attachment_duration_seconds INTEGER;

ALTER TABLE squad_messages DROP CONSTRAINT IF EXISTS squad_messages_text_or_attachment;
ALTER TABLE squad_messages ADD CONSTRAINT squad_messages_text_or_attachment
  CHECK (message IS NOT NULL OR attachment_url IS NOT NULL);
