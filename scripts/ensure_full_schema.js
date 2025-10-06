/*
 Ensure and normalize full PostgreSQL schema used by the app.
 Safe and idempotent: creates tables/columns/triggers if missing.
 Usage:
   node scripts/ensure_full_schema.js
*/
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

(async () => {
  const cfg = process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === '1' ? { rejectUnauthorized: false } : undefined,
  } : {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'faculty-reporting-system1',
  };

  const pool = new Pool(cfg);
  const client = await pool.connect();
  const q = async (sql, params=[]) => client.query(sql, params).catch(_ => ({ rows: [] }));

  try {
    console.log('Ensuring core tables...');

    await q(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50),
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      first_name VARCHAR(50),
      last_name VARCHAR(50),
      phone VARCHAR(30),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ
    );`);

    await q(`DO $$ BEGIN
      BEGIN ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('student','lecturer','program_leader','principal_lecturer','faculty_manager','admin')); EXCEPTION WHEN duplicate_object THEN NULL; END;
    END $$;`);

    await q(`CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users(username) WHERE username IS NOT NULL;`);

    await q(`CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      user_id INT,
      reporter_id INT,
      course_id INT,
      report_type TEXT,
      title TEXT,
      content TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      attendance_count INT,
      topic_covered TEXT,
      learning_outcomes TEXT,
      challenges TEXT,
      recommendations TEXT,
      rating INT,
      submitted_to_role TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`);

    await q(`CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at := NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;`);
    await q(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reports_set_updated_at') THEN
        CREATE TRIGGER trg_reports_set_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      END IF;
    END $$;`);

    await q(`CREATE TABLE IF NOT EXISTS streams (
      id SERIAL PRIMARY KEY,
      stream_name TEXT NOT NULL,
      stream_code TEXT,
      description TEXT
    );`);

    await q(`CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      course_name TEXT NOT NULL,
      course_code TEXT NOT NULL,
      stream_id INT REFERENCES streams(id) ON DELETE SET NULL,
      credits INT,
      semester INT,
      academic_year TEXT
    );`);

    await q(`CREATE TABLE IF NOT EXISTS user_streams (
      user_id INT NOT NULL,
      stream_id INT NOT NULL,
      PRIMARY KEY (user_id, stream_id)
    );`);

    await q(`CREATE TABLE IF NOT EXISTS lecturer_courses (
      id SERIAL PRIMARY KEY,
      lecturer_id INT NOT NULL,
      course_id INT NOT NULL,
      academic_year TEXT,
      semester INT
    );`);

    await q(`CREATE TABLE IF NOT EXISTS student_enrollments (
      id SERIAL PRIMARY KEY,
      student_id INT NOT NULL,
      course_id INT NOT NULL,
      academic_year TEXT,
      semester INT
    );`);

    await q(`CREATE TABLE IF NOT EXISTS class_ratings (
      id SERIAL PRIMARY KEY,
      student_id INT,
      lecturer_id INT,
      course_id INT,
      rating INT CHECK (rating BETWEEN 1 AND 5),
      comments TEXT,
      class_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`);

    await q(`CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      report_id INT,
      feedback_from_id INT,
      feedback_to_id INT,
      feedback_content TEXT,
      feedback_type TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`);

    await q(`CREATE TABLE IF NOT EXISTS progress_tracking (
      id SERIAL PRIMARY KEY,
      student_id INT,
      course_id INT,
      completion_percentage INT CHECK (completion_percentage BETWEEN 0 AND 100)
    );`);

    await q(`CREATE TABLE IF NOT EXISTS notification_reads (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      type TEXT NOT NULL,
      source_id INT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, type, source_id)
    );`);

    await q(`CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      type TEXT NOT NULL,
      title TEXT,
      message TEXT,
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`);

    await q(`CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_ids INT[] NOT NULL,
      meta JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`);

    // Additional utility tables to reach 20 and support future features
    await q(`CREATE TABLE IF NOT EXISTS attachments (
      id SERIAL PRIMARY KEY,
      report_id INT,
      file_path TEXT NOT NULL,
      uploaded_at TIMESTAMPTZ DEFAULT NOW()
    );`);

    await q(`CREATE TABLE IF NOT EXISTS report_workflow (
      id SERIAL PRIMARY KEY,
      report_id INT NOT NULL,
      current_stage TEXT,
      assigned_to_role TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`);

    await q(`CREATE TABLE IF NOT EXISTS roles (
      role TEXT PRIMARY KEY
    );`);

    await q(`CREATE TABLE IF NOT EXISTS course_materials (
      id SERIAL PRIMARY KEY,
      course_id INT NOT NULL,
      title TEXT NOT NULL,
      url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`);

    await q(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );`);

    // Additional small utility tables to reach 20
    await q(`CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      token TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`);

    await q(`CREATE TABLE IF NOT EXISTS api_keys (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      key TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      revoked BOOLEAN DEFAULT FALSE
    );`);

    // Done
    console.log('Schema ensured.');
  } finally {
    client.release();
    await pool.end();
  }
})();
