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
  const cfg = process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === '1' ? { rejectUnauthorized: false } : undefined,
    max: 1,
  } : {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'faculty-reporting-system1',
    max: 1,
  };

  // Simple CLI args parsing: --students N --lecturers M
  const args = process.argv.slice(2);
  const getArg = (flag, def) => {
    const idx = args.indexOf(flag);
    if (idx !== -1 && args[idx + 1]) {
      const n = parseInt(args[idx + 1], 10);
      return Number.isFinite(n) ? n : def;
    }
    return def;
  };
  const EXTRA_STUDENTS = getArg('--students', 20);
  const EXTRA_LECTURERS = getArg('--lecturers', 5);

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
      { name: 'Business Information Systems', code: 'BIS' },
      { name: 'Cybersecurity', code: 'SEC' },
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
      { name: 'Data Structures', code: 'CS102', stream: 'Computer Science' },
      { name: 'Operating Systems', code: 'CS201', stream: 'Computer Science' },
      { name: 'Databases', code: 'IT101', stream: 'Information Technology' },
      { name: 'Computer Networks', code: 'IT201', stream: 'Information Technology' },
      { name: 'Web Development', code: 'IT202', stream: 'Information Technology' },
      { name: 'Machine Learning', code: 'DS301', stream: 'Data Science' },
      { name: 'Data Mining', code: 'DS302', stream: 'Data Science' },
      { name: 'Business Analytics', code: 'BIS101', stream: 'Business Information Systems' },
      { name: 'Information Systems', code: 'BIS201', stream: 'Business Information Systems' },
      { name: 'Introduction to Cybersecurity', code: 'SEC101', stream: 'Cybersecurity' },
      { name: 'Network Security', code: 'SEC201', stream: 'Cybersecurity' },
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
    // Users table fields: adapt to existing schema. Some DBs have a NOT NULL "name" column.
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('Password123', 10);

    const ensureUser = async (username, email, role, firstName, lastName) => {
      const userColumns = await getColumns('users');
      const hasName = userColumns.includes('name');
      const nameValue = [firstName, lastName].filter(Boolean).join(' ').trim() || username;
      const existing = await q(`SELECT id FROM users WHERE username = $1 OR email = $2`, [username, email]);
      if (existing.rows.length > 0) return existing.rows[0].id;
      // Build INSERT dynamically to include name if present
      const cols = ['username','email','password_hash','role','first_name','last_name','is_active'];
      const vals = [username, email, hash, role, firstName, lastName, true];
      if (hasName) { cols.splice(3, 0, 'name'); vals.splice(3, 0, nameValue); }
      const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
      const ins = await q(`
        INSERT INTO users (${cols.join(', ')})
        VALUES (${placeholders})
        RETURNING id
      `, vals);
      return ins.rows[0].id;
    };

    const studentId = await ensureUser('student1', 'student1@example.com', 'student', 'Alice', 'Student');
    const lecturerId = await ensureUser('lecturer1', 'lecturer1@example.com', 'lecturer', 'Bob', 'Lecturer');
    const plId = await ensureUser('pl1', 'pl1@example.com', 'program_leader', 'Carol', 'Leader');
    const fmId = await ensureUser('fm1', 'fm1@example.com', 'faculty_manager', 'Derek', 'Manager');
    const adminId = await ensureUser('admin1', 'admin1@example.com', 'admin', 'Erin', 'Admin');

    // Additional lecturers and students (idempotent)
    // Generate additional lecturers: lecturer2..lecturer{EXTRA_LECTURERS+1}
    const lecturerIds = [lecturerId];
    for (let i = 2; i <= EXTRA_LECTURERS + 1; i++) {
      const uname = `lecturer${i}`;
      const email = `${uname}@example.com`;
      const first = `Lecturer${i}`;
      const last = 'Demo';
      const id = await ensureUser(uname, email, 'lecturer', first, last);
      lecturerIds.push(id);
    }
    // Generate additional students: student2..student{EXTRA_STUDENTS+1}
    const studentIds = [studentId];
    for (let i = 2; i <= EXTRA_STUDENTS + 1; i++) {
      const uname = `student${i}`;
      const email = `${uname}@example.com`;
      const first = `Student${i}`;
      const last = 'Demo';
      const id = await ensureUser(uname, email, 'student', first, last);
      studentIds.push(id);
    }

    // 5) Map users to streams/courses
    // Assign program leader to the first stream
    const firstStream = Array.isArray(streamRows) && streamRows.length > 0 ? streamRows[0] : null;
    if (firstStream) {
      const { rows: us } = await q(`SELECT 1 FROM user_streams WHERE user_id = $1 AND stream_id = $2`, [plId, firstStream.id]);
      if (us.rows ? us.rows.length === 0 : us.length === 0) {
        await q(`INSERT INTO user_streams (user_id, stream_id) VALUES ($1, $2)`, [plId, firstStream.id]);
      }
    }

    // Assign first lecturer to first course, enroll first student to first two courses
    const firstCourse = Array.isArray(courseRows) && courseRows.length > 0 ? courseRows[0] : null;
    const secondCourse = Array.isArray(courseRows) && courseRows.length > 1 ? courseRows[1] : null;
    if (firstCourse) {
      // Detect optional columns
      const lcCols = await getColumns('lecturer_courses');
      const seCols = await getColumns('student_enrollments');
      const hasLcAY = lcCols.includes('academic_year');
      const hasLcSem = lcCols.includes('semester');
      const hasSeAY = seCols.includes('academic_year');
      const hasSeSem = seCols.includes('semester');

      let r;
      r = await q(`SELECT 1 FROM lecturer_courses WHERE lecturer_id = $1 AND course_id = $2`, [lecturerId, firstCourse.id]);
      if ((r.rows || []).length === 0) {
        const columns = ['lecturer_id','course_id'];
        const values = [lecturerId, firstCourse.id];
        if (hasLcAY) { columns.push('academic_year'); values.push('2024/2025'); }
        if (hasLcSem) { columns.push('semester'); values.push(1); }
        const ph = values.map((_, i) => `$${i+1}`).join(', ');
        await q(`INSERT INTO lecturer_courses (${columns.join(', ')}) VALUES (${ph})`, values);
      }
      r = await q(`SELECT 1 FROM student_enrollments WHERE student_id = $1 AND course_id = $2`, [studentId, firstCourse.id]);
      if ((r.rows || []).length === 0) {
        const columns = ['student_id','course_id'];
        const values = [studentId, firstCourse.id];
        if (hasSeAY) { columns.push('academic_year'); values.push('2024/2025'); }
        if (hasSeSem) { columns.push('semester'); values.push(1); }
        const ph = values.map((_, i) => `$${i+1}`).join(', ');
        await q(`INSERT INTO student_enrollments (${columns.join(', ')}) VALUES (${ph})`, values);
      }
    }
    if (secondCourse) {
      const seCols = await getColumns('student_enrollments');
      const hasSeAY = seCols.includes('academic_year');
      const hasSeSem = seCols.includes('semester');
      const r2 = await q(`SELECT 1 FROM student_enrollments WHERE student_id = $1 AND course_id = $2`, [studentId, secondCourse.id]);
      if (r2.rows.length === 0) {
        const columns = ['student_id','course_id'];
        const values = [studentId, secondCourse.id];
        if (hasSeAY) { columns.push('academic_year'); values.push('2024/2025'); }
        if (hasSeSem) { columns.push('semester'); values.push(1); }
        const ph = values.map((_, i) => `$${i+1}`).join(', ');
        await q(`INSERT INTO student_enrollments (${columns.join(', ')}) VALUES (${ph})`, values);
      }
    }

    // Map additional lecturers and students to courses
    if (Array.isArray(courseRows) && courseRows.length > 0) {
      const mapCourses = courseRows.slice(0, Math.min(courseRows.length, 4));
      // Each lecturer teaches one of the first 4 courses in round-robin
      const lcColsMap = await getColumns('lecturer_courses');
      const hasLcAYMap = lcColsMap.includes('academic_year');
      const hasLcSemMap = lcColsMap.includes('semester');
      for (let i = 0; i < lecturerIds.length; i++) {
        const lecId = lecturerIds[i];
        const course = mapCourses[i % mapCourses.length];
        const { rows: existL } = await q(`SELECT 1 FROM lecturer_courses WHERE lecturer_id = $1 AND course_id = $2`, [lecId, course.id]);
        if (existL.length === 0) {
          const columns = ['lecturer_id','course_id'];
          const values = [lecId, course.id];
          if (hasLcAYMap) { columns.push('academic_year'); values.push('2024/2025'); }
          if (hasLcSemMap) { columns.push('semester'); values.push(1); }
          const ph = values.map((_, i) => `$${i+1}`).join(', ');
          await q(`INSERT INTO lecturer_courses (${columns.join(', ')}) VALUES (${ph})`, values);
        }
      }
      // Enroll students across first two courses in round-robin
      const enrollCourses = courseRows.slice(0, Math.min(courseRows.length, 2));
      const seColsMap = await getColumns('student_enrollments');
      const hasSeAYMap = seColsMap.includes('academic_year');
      const hasSeSemMap = seColsMap.includes('semester');
      for (const sid of studentIds) {
        for (const c of enrollCourses) {
          const { rows: existE } = await q(`SELECT 1 FROM student_enrollments WHERE student_id = $1 AND course_id = $2`, [sid, c.id]);
          if (existE.length === 0) {
            const columns = ['student_id','course_id'];
            const values = [sid, c.id];
            if (hasSeAYMap) { columns.push('academic_year'); values.push('2024/2025'); }
            if (hasSeSemMap) { columns.push('semester'); values.push(1); }
            const ph = values.map((_, i) => `$${i+1}`).join(', ');
            await q(`INSERT INTO student_enrollments (${columns.join(', ')}) VALUES (${ph})`, values);
          }
        }
      }
    }

    // 6) Seed lecturer-to-lecturer peer ratings (each lecturer rates every other)
    if (Array.isArray(lecturerIds) && lecturerIds.length > 1) {
      for (let i = 0; i < lecturerIds.length; i++) {
        for (let j = 0; j < lecturerIds.length; j++) {
          const rater = lecturerIds[i];
          const rated = lecturerIds[j];
          if (rater === rated) continue; // no self-rating
          const { rows: existsPR } = await q(
            `SELECT 1 FROM peer_ratings WHERE rater_lecturer_id = $1 AND rated_lecturer_id = $2`,
            [rater, rated]
          );
          if (existsPR.length === 0) {
            // Deterministic rating between 3 and 5 for repeatability
            const base = (rater + rated) % 3; // 0..2
            const rating = 3 + base; // 3..5
            const comment = `Peer review from ${rater} to ${rated}`;
            await q(
              `INSERT INTO peer_ratings (rater_lecturer_id, rated_lecturer_id, rating, comments) VALUES ($1, $2, $3, $4)`,
              [rater, rated, rating, comment]
            );
          }
        }
      }
    }

    // 7) Insert sample reports
    const now = new Date();
    const statusList = ['draft','submitted','approved','rejected'];

    // Avoid duplicate sample reports by checking title per user
    const ensureReport = async (userId, courseId, title, content, status) => {
      const repCols = await getColumns('reports');
      const hasUserId = repCols.includes('user_id');
      const colsCheck = hasUserId ? ['user_id','title'] : ['title'];
      const paramsCheck = hasUserId ? [userId, title] : [title];
      const where = hasUserId ? 'user_id = $1 AND title = $2' : 'title = $1';
      const { rows } = await q(`SELECT 1 FROM reports WHERE ${where}`, paramsCheck);
      if (rows.length === 0) {
        const cols = ['reporter_id','course_id','title','content','status'];
        const vals = [userId, courseId, title, content, status];
        if (hasUserId) { cols.unshift('user_id'); vals.unshift(userId); }
        const ph = vals.map((_, i) => `$${i+1}`).join(', ');
        await q(`INSERT INTO reports (${cols.join(', ')}) VALUES (${ph})`, vals);
      }
    };

    for (let i = 0; i < Math.min(courseRows.length, 5); i++) {
      const c = courseRows[i];
      const status = statusList[i % statusList.length];
      await ensureReport(studentId, c.id, `Weekly Report ${i + 1}`, `Progress on ${c.course_name}`, status);
    }

    // Add one report for each of first 3 students across first 2 courses
    const miniStudents = studentIds.slice(0, 3);
    const miniCourses = courseRows.slice(0, 2);
    for (const sid of miniStudents) {
      for (const c of miniCourses) {
        await ensureReport(sid, c.id, `Intro Report ${sid}-${c.id}`, `Getting started with ${c.course_name}`, 'submitted');
      }
    }

    // 8) Insert some student->lecturer class ratings
    if (firstCourse) {
      const crCols = await getColumns('class_ratings');
      const hasClassDate = crCols.includes('class_date');
      const cols = ['student_id','lecturer_id','course_id','rating'];
      const vals1 = [studentId, lecturerId, firstCourse.id, 5];
      const vals2 = [studentId, lecturerId, firstCourse.id, 4];
      if (hasClassDate) { cols.push('class_date'); vals1.push(new Date()); vals2.push(new Date()); }
      const ph1 = vals1.map((_, i) => `$${i+1}`).join(', ');
      const ph2 = vals2.map((_, i) => `$${i+1}`).join(', ');
      await q(`INSERT INTO class_ratings (${cols.join(', ')}) VALUES (${ph1})`, vals1);
      await q(`INSERT INTO class_ratings (${cols.join(', ')}) VALUES (${ph2})`, vals2);
    }

    // 9) Progress tracking for the student
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
