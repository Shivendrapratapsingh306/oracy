-- User-specific authentication foundation.
-- Back up the database before applying migrations in production.

ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(120) NOT NULL DEFAULT 'Student';
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(256) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'student';
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_data JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS ix_users_role ON users (role);

-- Existing anonymous interview sessions remain unowned and will not be exposed
-- by authenticated history/detail endpoints. New sessions always set user_id.
