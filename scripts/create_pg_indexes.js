/*
 Create helpful PostgreSQL indexes for common query patterns.
 Usage:
   node scripts/create_pg_indexes.js
*/
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

(async () => {
  const cfg = process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === '1' ? { rejectUnauthorized: false } : undefined,
    max: 1,
  } : {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'faculty_reporting',
    max: 1,
  };

  const pool = new Pool(cfg);
  const client = await pool.connect();
  const q = async (sql) => {
    try {
      await client.query(sql);
      console.log('OK:', sql.split('\n')[0].slice(0, 80));
    } catch (e) {
      console.log('Skipped:', e.message);
    }
  };

  try {
    console.log('Creating indexes (idempotent)...');

    // Users
    await q(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
    await q(`CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)`);

    // Reports
    await q(`CREATE INDEX IF NOT EXISTS idx_reports_course_id ON reports(course_id)`);
    await q(`CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id)`);
    await q(`CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)`);
    await q(`CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at)`);

    // Lecturer courses
    await q(`CREATE INDEX IF NOT EXISTS idx_lecturer_courses_lecturer_id ON lecturer_courses(lecturer_id)`);
    await q(`CREATE INDEX IF NOT EXISTS idx_lecturer_courses_course_id ON lecturer_courses(course_id)`);

    // Student enrollments
    await q(`CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_id ON student_enrollments(student_id)`);
    await q(`CREATE INDEX IF NOT EXISTS idx_student_enrollments_course_id ON student_enrollments(course_id)`);

    // Feedback
    await q(`CREATE INDEX IF NOT EXISTS idx_feedback_report_id ON feedback(report_id)`);
    await q(`CREATE INDEX IF NOT EXISTS idx_feedback_to_id ON feedback(feedback_to_id)`);

    // Class ratings
    await q(`CREATE INDEX IF NOT EXISTS idx_class_ratings_course_id ON class_ratings(course_id)`);
    await q(`CREATE INDEX IF NOT EXISTS idx_class_ratings_lecturer_id ON class_ratings(lecturer_id)`);

    // Progress tracking
    await q(`CREATE INDEX IF NOT EXISTS idx_progress_tracking_student_id ON progress_tracking(student_id)`);
    await q(`CREATE INDEX IF NOT EXISTS idx_progress_tracking_course_id ON progress_tracking(course_id)`);

    // Courses
    await q(`CREATE INDEX IF NOT EXISTS idx_courses_stream_id ON courses(stream_id)`);

    // Streams
    await q(`CREATE INDEX IF NOT EXISTS idx_streams_name ON streams(stream_name)`);

    console.log('Index creation complete.');
  } catch (e) {
    console.error('Index creation failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
