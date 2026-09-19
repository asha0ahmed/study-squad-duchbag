-- Migration: store student complaints for admin review.
-- Safe to run against the live database and safe to re-run.

CREATE TABLE IF NOT EXISTS complaints (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  complaint_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_student
  ON complaints(student_id);

CREATE INDEX IF NOT EXISTS idx_complaints_created_at
  ON complaints(created_at);
