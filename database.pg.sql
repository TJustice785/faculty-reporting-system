-- PostgreSQL schema for Faculty Reporting System
-- Note: Run the CREATE DATABASE step from psql as a separate command.

-- Optional: create the database (run from psql shell, not inside a transaction)
-- CREATE DATABASE faculty_reporting_system;

-- Connect to the database (psql only):
-- \c faculty_reporting_system

-- Safer to use UTC timestamps
SET TIME ZONE 'UTC';

-- Create custom ENUM-like constraints via CHECKs (portable)
-- Alternatively you can CREATE TYPE, but CHECK keeps it simple.

-- Extensions (optional but recommended)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (baseline)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure expected columns exist and constraints match application usage
DO $$
BEGIN
  -- username
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='username'
  ) THEN
    ALTER TABLE users ADD COLUMN username VARCHAR(50);
  END IF;

  -- first_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='first_name'
  ) THEN
    ALTER TABLE users ADD COLUMN first_name VARCHAR(50);
  END IF;

  -- last_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_name'
  ) THEN
    ALTER TABLE users ADD COLUMN last_name VARCHAR(50);
  END IF;

  -- optional phone
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone'
  ) THEN
    ALTER TABLE users ADD COLUMN phone VARCHAR(30);
  END IF;

  -- is_active flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_active'
  ) THEN
    ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;

  -- updated_at timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updated_at'
  ) THEN
    ALTER TABLE users ADD COLUMN updated_at TIMESTAMPTZ;
  END IF;

  -- drop old name column if present (optional, keep for compatibility)
  -- IF EXISTS (
  --   SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='name'
  -- ) THEN
  --   ALTER TABLE users RENAME COLUMN name TO legacy_name;
  -- END IF;

  -- Enforce allowed roles
  BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  EXCEPTION WHEN undefined_object THEN
    -- ignore
    NULL;
  END;
  ALTER TABLE users
    ADD CONSTRAINT users_role_check CHECK (role IN (
      'student','lecturer','program_leader','principal_lecturer','faculty_manager','admin'
    ));

  -- username unique
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename='users' AND indexname='users_username_unique'
  ) THEN
    -- create a unique index and matching constraint name
    CREATE UNIQUE INDEX users_username_unique ON users(username) WHERE username IS NOT NULL;
  END IF;
END$$;

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft','submitted','approved','rejected')) DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reports_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_reports_set_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;
