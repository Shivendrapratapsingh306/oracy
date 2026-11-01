-- PostgreSQL migration for Task 8.
-- Back up the database before applying this migration to an existing installation.
ALTER TABLE interview_sessions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE interview_sessions ALTER COLUMN resume_id DROP NOT NULL;
ALTER TABLE answers ADD COLUMN IF NOT EXISTS evaluation_score INTEGER NULL;
ALTER TABLE answers ADD COLUMN IF NOT EXISTS evaluation_feedback JSON NULL;

-- The API stores one current answer per question and updates it on each save.
-- If historical duplicate answers already exist, resolve them before creating this constraint.
ALTER TABLE answers ADD CONSTRAINT uq_answers_question_id UNIQUE (question_id);
