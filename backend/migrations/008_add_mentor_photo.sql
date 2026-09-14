-- Migration: add an optional profile photo to mentors.
-- Backed by the existing Cloudinary integration (see backend/utils/cloudinary.js),
-- same pattern already used for chat attachments (attachment_url/attachment_public_id
-- on squad_messages) -- the URL is what's rendered, the public_id is kept so a future
-- replace/delete can target the right Cloudinary asset without a lookup.
-- Both nullable so it never breaks existing mentor rows -- safe to run against the
-- live database and safe to re-run (IF NOT EXISTS). Student-side tables are
-- untouched; there is no student profile-photo feature.
--
-- Run with:
--   psql -U postgres -d studysquad -f migrations/008_add_mentor_photo.sql

ALTER TABLE mentors ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS photo_public_id VARCHAR(255);
