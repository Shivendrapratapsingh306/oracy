# Database Schema (Proposed)

PostgreSQL. **Initial implementation status:** SQLAlchemy models exist for `users`, `resumes`, `interview_sessions`, `questions`, and `answers`. The remaining entities below are proposed and not implemented yet. No migrations exist yet; use Alembic before production schema changes. DB models (`backend/app/models`) are separate from API schemas (`backend/app/schemas`).

## Entities and relationships

- `users` 1—N `resumes`
- `resumes` 1—1 `candidate_profiles`
- `users` 1—N `interview_sessions` (each references a resume and target role)
- `interview_sessions` 1—N `questions`
- `questions` 1—N `answers` (follow-ups reference a parent question)
- `answers` 1—N `media_files`; 1—1 `answer_evaluations`; 1—1 `speech_metrics`; 1—1 `vision_metrics`
- `interview_sessions` 1—1 `readiness_scores`; 1—N `feedback_items`
- `analysis_jobs` track background work for resumes/answers/sessions

## Proposed SQL

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE resumes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE candidate_profiles (
  id UUID PRIMARY KEY,
  resume_id UUID UNIQUE NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  profile JSONB NOT NULL,          -- skills, experience, education, projects
  parser_version TEXT NOT NULL
);

CREATE TABLE interview_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES resumes(id),
  target_role TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE questions (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  parent_question_id UUID REFERENCES questions(id),
  text TEXT NOT NULL,
  category TEXT,
  position INT NOT NULL
);

CREATE TABLE answers (
  id UUID PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  transcript TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE media_files (
  id UUID PRIMARY KEY,
  answer_id UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,              -- audio | video
  storage_key TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  delete_after TIMESTAMPTZ
);

CREATE TABLE answer_evaluations (
  answer_id UUID PRIMARY KEY REFERENCES answers(id) ON DELETE CASCADE,
  metrics JSONB NOT NULL,          -- relevance, structure, grammar, completeness
  model_version TEXT NOT NULL
);

CREATE TABLE speech_metrics (
  answer_id UUID PRIMARY KEY REFERENCES answers(id) ON DELETE CASCADE,
  metrics JSONB NOT NULL,          -- rate, pauses, fillers, hesitation
  version TEXT NOT NULL
);

CREATE TABLE vision_metrics (
  answer_id UUID PRIMARY KEY REFERENCES answers(id) ON DELETE CASCADE,
  metrics JSONB NOT NULL,          -- posture, gaze, movement, framing (estimates)
  version TEXT NOT NULL
);

CREATE TABLE readiness_scores (
  session_id UUID PRIMARY KEY REFERENCES interview_sessions(id) ON DELETE CASCADE,
  overall NUMERIC(5,2) NOT NULL,
  breakdown JSONB NOT NULL,        -- per-component score, weight, evidence
  config_version TEXT NOT NULL
);

CREATE TABLE feedback_items (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  message TEXT NOT NULL,
  priority INT
);

CREATE TABLE analysis_jobs (
  id UUID PRIMARY KEY,
  kind TEXT NOT NULL,
  subject_id UUID NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX ON interview_sessions (user_id, created_at DESC);
CREATE INDEX ON questions (session_id, position);
```

## Notes

- Store file *references* (`storage_key`), never file bytes, in the DB.
- JSONB metric columns include a `version` so results stay reproducible as models change.
- Personal data (resumes, transcripts, media) needs a retention and deletion policy; cascade deletes support user data removal.
- Migrations (likely Alembic) are not set up yet.
