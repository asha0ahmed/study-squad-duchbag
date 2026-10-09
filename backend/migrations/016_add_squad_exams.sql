-- Migration: exam link (Google Form) sent by the admin to a specific squad.
-- Separate table so existing `SELECT * FROM squads` responses never expose it.
-- Safe to re-run. Run with:
--   psql -U postgres -d studysquad -f migrations/016_add_squad_exams.sql

CREATE TABLE IF NOT EXISTS squad_exams (
  squad_id INTEGER PRIMARY KEY REFERENCES squads(id),
  message TEXT NOT NULL DEFAULT '',
  url VARCHAR(1000) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
