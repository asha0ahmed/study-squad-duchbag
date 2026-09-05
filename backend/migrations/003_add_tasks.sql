-- Task Management system: Mentors upload tasks to a squad they mentor;
-- every member of that squad can see and submit an answer to it.
--
-- Design notes:
--   * Task -> Squad is the single source of truth for "who sees this task"
--     (every current squad_members row for task.squad_id), so a task is
--     stored once per assignment, never duplicated per student.
--   * File binaries are never stored in Postgres -- only the Cloudinary
--     secure URL + metadata needed to display/download/re-derive the asset.
--   * task_submissions has a UNIQUE(task_id, student_id) so a resubmission
--     updates the existing row (upsert) instead of creating a duplicate --
--     "has this student already submitted?" is then a single row lookup.

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  mentor_id INTEGER NOT NULL REFERENCES mentors(id),
  squad_id INTEGER NOT NULL REFERENCES squads(id),
  title VARCHAR(150) NOT NULL,
  description TEXT,
  file_url VARCHAR(500) NOT NULL,
  file_public_id VARCHAR(255) NOT NULL,
  file_resource_type VARCHAR(20) NOT NULL,
  file_format VARCHAR(20),
  original_filename VARCHAR(255),
  file_size INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_squad ON tasks(squad_id);
CREATE INDEX IF NOT EXISTS idx_tasks_mentor ON tasks(mentor_id);

CREATE TABLE IF NOT EXISTS task_submissions (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id),
  squad_id INTEGER NOT NULL REFERENCES squads(id),
  mentor_id INTEGER NOT NULL REFERENCES mentors(id),
  submission_url VARCHAR(500) NOT NULL,
  submission_public_id VARCHAR(255) NOT NULL,
  file_resource_type VARCHAR(20) NOT NULL,
  file_format VARCHAR(20),
  original_filename VARCHAR(255),
  file_size INTEGER,
  submitted_at TIMESTAMP DEFAULT NOW(),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  rated_at TIMESTAMP,
  UNIQUE (task_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_task ON task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON task_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_squad ON task_submissions(squad_id);
