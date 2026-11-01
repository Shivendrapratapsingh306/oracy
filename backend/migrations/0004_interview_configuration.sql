-- Add interview configuration columns to interview_sessions and rationale to questions.
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS experience_level VARCHAR(40) DEFAULT 'mid';
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS interview_type VARCHAR(40) DEFAULT 'mixed';
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS difficulty VARCHAR(40) DEFAULT 'medium';
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS generation_method VARCHAR(60) DEFAULT 'rule_based_baseline';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS rationale TEXT;

