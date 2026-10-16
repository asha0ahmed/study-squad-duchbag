-- Transaction IDs are optional for student payment submissions.
-- Safe to run repeatedly against an existing database.
ALTER TABLE payments ALTER COLUMN trx_id DROP NOT NULL;
