/*
 Seed PostgreSQL demo data for dashboard and auth flows.
 Usage:
   node scripts/seed_pg_demo_data.js

 Reads configuration from .env: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
*/

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

(async () => {
  const cfg = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'faculty_reporting_system',
    max: 1,
  };

  const pool = new Pool(cfg);
  const client = await pool.connect();

  const q = async (text, params = []) => {
    try {
      return await client.query(text, params);
    } catch (e) {
      console.log('SQL error (continuing):', e.message);
      return { rows: [] };
    }
  };

  try {
    console.log('Connecting to PostgreSQL to seed demo data...');

    // 0) Ensure schema matches application expectations
    // Helper: ensure column exists
    const ensureColumn = async (table, column, typeSql, defaultSql = '') => {
      const { rows } = await q(
        `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [table, column]
      );
      if (rows.length === 0) {
        await q(
          `ALTER TABLE ${table} ADD COLUMN ${column} ${typeSql} ${defaultSql}`
        );
      }
    };

    // Ensure reports table exists and has expected columns
    await q(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        user_id INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await ensureColumn('reports', 'reporter_id', 'INT');
    await ensureColumn('reports', 'report_type', 'TEXT');
    await ensureColumn('reports', 'course_id', 'INT');
    await ensureColumn('reports', 'title', 'TEXT');
    await ensureColumn('reports', 'content', 'TEXT');
    await ensureColumn('reports', 'status', "TEXT NOT NULL DEFAULT 'draft'");
    await ensureColumn('reports', 'attendance_count', 'INT');
    await ensureColumn('reports', 'topic_covered', 'TEXT');
    await ensureColumn('reports', 'learning_outcomes', 'TEXT');
    await ensureColumn('reports', 'challenges', 'TEXT');
    await ensureColumn('reports', 'recommendations', 'TEXT');
    await ensureColumn('reports', 'rating', 'INT');
    await ensureColumn('reports', 'submitted_to_role', 'TEXT');

    // Ensure trigger function exists to update updated_at (skip if present to avoid ownership issues)
    const funcCheck = await q(`SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at'`);
    if (funcCheck.rows.length === 0) {
      await q(`
        CREATE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at := NOW();
          RETURN NEW;
        END; $$ LANGUAGE plpgsql;
      `);
    }
    // Attach trigger if missing
    const trgCheck = await q(`SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reports_set_updated_at'`);
    if (trgCheck.rows.length === 0) {
      await q(`
        CREATE TRIGGER trg_reports_set_updated_at
        BEFORE UPDATE ON reports
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      `);
    }

    // 1) Ensure minimal domain tables exist (if your DB already has them, this is harmless)
    await q(`
      CREATE TABLE IF NOT EXISTS streams (
        id SERIAL PRIMARY KEY,
        stream_name TEXT NOT NULL
      );
    `);
    // No unique index creation to avoid ownership issues

    await q(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        course_name TEXT NOT NULL,
        course_code TEXT NOT NULL,
        stream_id INT REFERENCES streams(id) ON DELETE SET NULL
      );
    `);
    // No unique index creation to avoid ownership issues

    await q(`
      CREATE TABLE IF NOT EXISTS user_streams (
        user_id INT NOT NULL,
        stream_id INT NOT NULL,
        PRIMARY KEY (user_id, stream_id)
      );
    `);

    await q(`
      CREATE TABLE IF NOT EXISTS lecturer_courses (
        lecturer_id INT NOT NULL,
        course_id INT NOT NULL,
        PRIMARY KEY (lecturer_id, course_id)
      );
    `);

    await q(`
      CREATE TABLE IF NOT EXISTS student_enrollments (
        student_id INT NOT NULL,
        course_id INT NOT NULL,
        PRIMARY KEY (student_id, course_id)
      );
    `);

    await q(`
      CREATE TABLE IF NOT EXISTS class_ratings (
        id SERIAL PRIMARY KEY,
        student_id INT,
        lecturer_id INT,
        course_id INT,
        rating INT CHECK (rating BETWEEN 1 AND 5),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await q(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        report_id INT,
        feedback_from_id INT,
        feedback_to_id INT,
        feedback_content TEXT,
        feedback_type TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await q(`
      CREATE TABLE IF NOT EXISTS progress_tracking (
        id SERIAL PRIMARY KEY,
        student_id INT,
        course_id INT,
        completion_percentage INT CHECK (completion_percentage BETWEEN 0 AND 100)
      );
    `);

    // Helpers to introspect columns
    const getColumns = async (table) => {
      const { rows } = await q(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
      `, [table]);
      return rows.map(r => r.column_name);
    };

    // 2) Insert streams (adaptive to optional stream_code column)
    const streamColumns = await getColumns('streams');
    const hasStreamCode = streamColumns.includes('stream_code');
    const streams = [
      { name: 'Computer Science', code: 'CS' },
      { name: 'Information Technology', code: 'IT' },
      { name: 'Data Science', code: 'DS' },
    ];
    for (const s of streams) {
      const { rows } = await q(`SELECT id FROM streams WHERE stream_name = $1`, [s.name]);
      if (rows.length === 0) {
        if (hasStreamCode) {
          await q(`INSERT INTO streams (stream_name, stream_code) VALUES ($1, $2)`, [s.name, s.code]);
        } else {
          await q(`INSERT INTO streams (stream_name) VALUES ($1)`, [s.name]);
        }
      }
    }

    const { rows: streamRows } = await q(`SELECT id, stream_name FROM streams`);

    // 3) Insert courses (adaptive to schema)
    const coursesSeed = [
      { name: 'Algorithms', code: 'CS101', stream: 'Computer Science' },
      { name: 'Databases', code: 'CS102', stream: 'Computer Science' },
      { name: 'Networks', code: 'IT201', stream: 'Information Technology' },
      { name: 'Machine Learning', code: 'DS301', stream: 'Data Science' },
    ];
    const courseColumns = await getColumns('courses');
    const hasSemester = courseColumns.includes('semester');
    const hasAcademicYear = courseColumns.includes('academic_year');
    for (const c of coursesSeed) {
      const streamId = streamRows.find(s => s.stream_name === c.stream)?.id || null;
      const { rows: exists } = await q(`SELECT id FROM courses WHERE course_code = $1`, [c.code]);
      if (exists.length === 0) {
        const columns = ['course_name', 'course_code', 'stream_id'];
        const values = [c.name, c.code, streamId];
        if (hasSemester) { columns.push('semester'); values.push(1); }
        if (hasAcademicYear) { columns.push('academic_year'); values.push('2024/2025'); }
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        await q(`INSERT INTO courses (${columns.join(', ')}) VALUES (${placeholders})`, values);
      }
    }

    const { rows: courseRows } = await q(`SELECT id, course_name, course_code FROM courses`);

    // 4) Ensure required roles/users exist
    // Users table fields (from database.pg.sql adjustments): username, email, password_hash, role, first_name, last_name, phone, is_active
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('Password123', 10);

    const ensureUser = async (username, email, role, firstName, lastName) => {
      const existing = await q(`SELECT id FROM users WHERE username = $1 OR email = $2`, [username, email]);
      if (existing.rows.length > 0) return existing.rows[0].id;
      const ins = await q(`
        INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE)
        RETURNING id
      `, [username, email, hash, role, firstName, lastName]);
      return ins.rows[0].id;
    };

    const studentId = await ensureUser('student1', 'student1@example.com', 'student', 'Alice', 'Student');
    const lecturerId = await ensureUser('lecturer1', 'lecturer1@example.com', 'lecturer', 'Bob', 'Lecturer');
    const plId = await ensureUser('pl1', 'pl1@example.com', 'program_leader', 'Carol', 'Leader');
    const fmId = await ensureUser('fm1', 'fm1@example.com', 'faculty_manager', 'Derek', 'Manager');
    const adminId = await ensureUser('admin1', 'admin1@example.com', 'admin', 'Erin', 'Admin');

    // 5) Map users to streams/courses
    // Assign program leader to the first stream
    const firstStream = streamRows[0];
    if (firstStream) {
      const { rows: us } = await q(`SELECT 1 FROM user_streams WHERE user_id = $1 AND stream_id = $2`, [plId, firstStream.id]);
      if (us.length === 0) {
        await q(`INSERT INTO user_streams (user_id, stream_id) VALUES ($1, $2)`, [plId, firstStream.id]);
      }
    }

    // Assign lecturer to first course, enroll student to first two courses
    const firstCourse = courseRows[0];
    const secondCourse = courseRows[1];
    if (firstCourse) {
      let r;
      r = await q(`SELECT 1 FROM lecturer_courses WHERE lecturer_id = $1 AND course_id = $2`, [lecturerId, firstCourse.id]);
      if (r.rows.length === 0) {
        await q(`INSERT INTO lecturer_courses (lecturer_id, course_id) VALUES ($1, $2)`, [lecturerId, firstCourse.id]);
      }
      r = await q(`SELECT 1 FROM student_enrollments WHERE student_id = $1 AND course_id = $2`, [studentId, firstCourse.id]);
      if (r.rows.length === 0) {
        await q(`INSERT INTO student_enrollments (student_id, course_id) VALUES ($1, $2)`, [studentId, firstCourse.id]);
      }
    }
    if (secondCourse) {
      const r2 = await q(`SELECT 1 FROM student_enrollments WHERE student_id = $1 AND course_id = $2`, [studentId, secondCourse.id]);
      if (r2.rows.length === 0) {
        await q(`INSERT INTO student_enrollments (student_id, course_id) VALUES ($1, $2)`, [studentId, secondCourse.id]);
      }
    }

    // 6) Insert sample reports
    const now = new Date();
    const statusList = ['draft','submitted','approved','rejected'];

    for (let i = 0; i < Math.min(courseRows.length, 3); i++) {
      const c = courseRows[i];
      const status = statusList[i % statusList.length];
      await q(`
        INSERT INTO reports (user_id, reporter_id, course_id, title, content, status, created_at)
        VALUES ($1, $1, $2, $3, $4, $5, NOW())
      `, [studentId, c.id, `Weekly Report ${i + 1}`, `Progress on ${c.course_name}`, status]);
    }

    // 7) Insert some ratings for the lecturer
    if (firstCourse) {
      await q(`INSERT INTO class_ratings (student_id, lecturer_id, course_id, rating) VALUES ($1, $2, $3, 5)`, [studentId, lecturerId, firstCourse.id]);
      await q(`INSERT INTO class_ratings (student_id, lecturer_id, course_id, rating) VALUES ($1, $2, $3, 4)`, [studentId, lecturerId, firstCourse.id]);
    }

    // 8) Progress tracking for the student
    if (firstCourse) {
      await q(`INSERT INTO progress_tracking (student_id, course_id, completion_percentage) VALUES ($1, $2, 60)`, [studentId, firstCourse.id]);
    }

    // Done seeding
    console.log('Demo data seeded successfully.');
  } catch (e) {
    console.error('Seeding failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
