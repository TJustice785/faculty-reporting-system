const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { verifyToken, authorize, authorizeOwnerOrHigher } = require('../middleware/auth');
const { notifyAll, ensureNotificationsTable } = require('./notifications');

const router = express.Router();

// Public test endpoint (no auth) to verify API is reachable
// GET /api/users/public-test
router.get('/public-test', (req, res) => {
  res.json({
    message: 'Users public test endpoint OK',
    service: 'users',
    timestamp: new Date().toISOString(),
  });
});

// POST /api/users/:id/reset-password - Admin resets a user's password (returns temp password once)
router.post('/:id/reset-password', verifyToken, authorize('admin'), async (req, res) => {
  try {
    const userId = req.params.id;
    // Ensure user exists
    const [rows] = await req.db.execute('SELECT id FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const generate = (len = 12) => {
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
      let out = '';
      for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
      return out;
    };
    const tempPassword = generate(12);
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(tempPassword, 12);
    await req.db.execute('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hash, userId]);

    // Audit (do not store plaintext password)
    await req.db.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_ids INT[] NOT NULL,
        meta JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await req.db.execute(
      `INSERT INTO audit_logs (user_id, action, target_type, target_ids, meta)
       VALUES (?, 'resetPassword', 'user', ?, ?)`,
      [req.user.id, [Number(userId)], JSON.stringify({ length: tempPassword.length })]
    );

    res.json({ message: 'Temporary password generated. Displaying once.', tempPassword });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// GET /api/users/lecturers/by-course?courseId= - List lecturers assigned to a course
router.get('/lecturers/by-course', verifyToken, async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ error: 'courseId is required' });

    const [rows] = await req.db.execute(`
      SELECT u.id, u.first_name, u.last_name, u.email
      FROM lecturer_courses lc
      JOIN users u ON u.id = lc.lecturer_id
      WHERE lc.course_id = ?
    `, [courseId]);

    res.json({ lecturers: rows });
  } catch (error) {
    console.error('Get lecturers by course error:', error);
    res.status(500).json({ error: 'Failed to fetch lecturers' });
  }
});

// ====== Self Profile Endpoints ======
// GET /api/users/me - get own profile with avatarUrl
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await req.db.execute(
      'SELECT id, username, email, role, first_name, last_name, phone, is_active, created_at FROM users WHERE id = ?',[userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    // Compute avatar URL if exists
    const avatarDir = path.join(__dirname, '..', 'uploads', 'avatars', String(userId));
    let avatarUrl = null;
    try {
      const files = fs.readdirSync(avatarDir);
      const match = files.find(f => /^avatar\.(png|jpg|jpeg|gif|webp)$/i.test(f));
      if (match) avatarUrl = `/uploads/avatars/${userId}/${match}`;
    } catch (_) {}

    res.json({ ...rows[0], avatarUrl });
  } catch (error) {
    console.error('Get self profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/users/me - update own profile fields
router.put('/me', verifyToken, [
  body('firstName').optional().isLength({ max: 50 }),
  body('lastName').optional().isLength({ max: 50 }),
  body('phone').optional().isLength({ max: 30 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const userId = req.user.id;
    const { firstName, lastName, phone } = req.body;
    const fields = [];
    const params = [];
    if (typeof firstName !== 'undefined') { fields.push('first_name = ?'); params.push(firstName); }
    if (typeof lastName !== 'undefined') { fields.push('last_name = ?'); params.push(lastName); }

    const sql = `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    params.push(userId);
    await req.db.execute(sql, params);
    res.json({ message: 'Profile updated' });
  } catch (error) {
    console.error('Update self profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});


// Configure multer storage for avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'avatars', String(req.user.id));
    fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
  },
  filename: (req, file, cb) => {
    const ext = (file.mimetype.split('/')[1] || 'png').toLowerCase().replace('jpeg', 'jpg');
    cb(null, `avatar.${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Invalid image type'));
  }
});

// POST /api/users/me/avatar - upload/replace own avatar
router.post('/me/avatar', verifyToken, avatarUpload.single('avatar'), async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `/uploads/avatars/${userId}/${file.filename}`;
    res.status(201).json({ message: 'Avatar uploaded', url });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// GET /api/users - Get users list (admin roles only)
router.get('/', verifyToken, authorize('admin', 'program_leader', 'principal_lecturer', 'faculty_manager'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        u.id, u.username, u.email, u.role, u.first_name, u.last_name, 
        u.phone, u.created_at, u.is_active,
        COUNT(r.id) as total_reports
      FROM users u
      LEFT JOIN reports r ON u.id = r.reporter_id
    `;

    let whereConditions = ['u.is_active = TRUE'];
    let queryParams = [];

    if (role) {
      whereConditions.push('u.role = ?');
      queryParams.push(role);
    }

    if (search) {
      whereConditions.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' WHERE ' + whereConditions.join(' AND ');
    query += ' GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), parseInt(offset));

    const [users] = await req.db.execute(query, queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users u WHERE ' + whereConditions.join(' AND ');
    const [countResult] = await req.db.execute(countQuery, queryParams.slice(0, -2));
    const total = countResult[0].total;

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users - Create a user (admin roles)
router.post('/', [
  verifyToken,
  authorize('admin', 'program_leader', 'principal_lecturer', 'faculty_manager'),
  body('username').isLength({ min: 3, max: 50 }).matches(/^[a-zA-Z0-9_]+$/),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').optional().isLength({ max: 50 }),
  body('lastName').optional().isLength({ max: 50 }),
  body('role').optional().isIn(['admin', 'student', 'lecturer', 'program_leader', 'principal_lecturer', 'faculty_manager'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { username, email, password, firstName = '', lastName = '', role = 'student', phone = null } = req.body;

    // Check duplicates
    const [existing] = await req.db.execute('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'User already exists with this username or email' });
    }

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await req.db.execute(
      `INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
       RETURNING id`,
      [username, email, passwordHash, role, firstName, lastName, phone]
    );

    res.status(201).json({
      message: 'User created',
      user: {
        id: result[0]?.id || null,
        username,
        email,
        role,
        firstName,
        lastName,
        phone,
        is_active: true,
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// GET /api/users/:id - Get user by id
router.get('/:id', verifyToken, authorize('admin', 'program_leader', 'principal_lecturer', 'faculty_manager'), async (req, res) => {
  try {
    const userId = req.params.id;
    const [rows] = await req.db.execute(
      'SELECT id, username, email, role, first_name, last_name, phone, is_active, created_at FROM users WHERE id = ?',
      [userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/users/:id - Update user (self or higher role)
router.put('/:id', [
  verifyToken,
  authorizeOwnerOrHigher,
  body('username').optional().isLength({ min: 3, max: 50 }).matches(/^[a-zA-Z0-9_]+$/),
  body('email').optional().isEmail().normalizeEmail(),
  body('firstName').optional().isLength({ max: 50 }),
  body('lastName').optional().isLength({ max: 50 }),
  body('role').optional().isIn(['admin', 'student', 'lecturer', 'program_leader', 'principal_lecturer', 'faculty_manager']),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const userId = req.params.id;
    const { username, email, firstName, first_name, lastName, last_name, role, is_active, phone } = req.body;

    // Load current row for comparison
    const [beforeRows] = await req.db.execute(
      'SELECT id, username, email, role, first_name, last_name, phone, is_active FROM users WHERE id = ?',
      [userId]
    );
    if (beforeRows.length === 0) return res.status(404).json({ error: 'User not found' });
    const before = beforeRows[0];

    // If username/email provided and changed, enforce uniqueness
    if (typeof username !== 'undefined' && username !== before.username) {
      const [u1] = await req.db.execute('SELECT id FROM users WHERE username = ? AND id <> ?', [username, userId]);
      if (u1.length > 0) return res.status(400).json({ error: 'Username already in use' });
    }
    if (typeof email !== 'undefined' && email !== before.email) {
      const [u2] = await req.db.execute('SELECT id FROM users WHERE email = ? AND id <> ?', [email, userId]);
      if (u2.length > 0) return res.status(400).json({ error: 'Email already in use' });
    }

    // Build dynamic update
    const fields = [];
    const params = [];
    const changed = {};
    if (typeof username !== 'undefined' && username !== before.username) { fields.push('username = ?'); params.push(username); changed.username = { from: before.username, to: username }; }
    if (typeof email !== 'undefined' && email !== before.email) { fields.push('email = ?'); params.push(email); changed.email = { from: before.email, to: email }; }
    const fn = typeof firstName !== 'undefined' ? firstName : (typeof first_name !== 'undefined' ? first_name : undefined);
    const ln = typeof lastName !== 'undefined' ? lastName : (typeof last_name !== 'undefined' ? last_name : undefined);
    if (typeof fn !== 'undefined' && fn !== before.first_name) { fields.push('first_name = ?'); params.push(fn); changed.firstName = { from: before.first_name, to: fn }; }
    if (typeof ln !== 'undefined' && ln !== before.last_name) { fields.push('last_name = ?'); params.push(ln); changed.lastName = { from: before.last_name, to: ln }; }
    if (typeof role !== 'undefined' && role !== before.role) { fields.push('role = ?'); params.push(role); changed.role = { from: before.role, to: role }; }
    if (typeof phone !== 'undefined' && phone !== before.phone) { fields.push('phone = ?'); params.push(phone); changed.phone = { from: before.phone, to: phone }; }
    if (typeof is_active !== 'undefined' && (!!is_active) !== before.is_active) { fields.push('is_active = ?'); params.push(!!is_active); changed.is_active = { from: before.is_active, to: !!is_active }; }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const sql = `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    params.push(userId);
    await req.db.execute(sql, params);

    const [rows] = await req.db.execute(
      'SELECT id, username, email, role, first_name, last_name, phone, is_active FROM users WHERE id = ?',
      [userId]
    );
    res.json({ message: 'User updated', user: rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete user (admin roles)
router.delete('/:id', verifyToken, authorize('admin', 'program_leader', 'principal_lecturer', 'faculty_manager'), async (req, res) => {
  try {
    const userId = req.params.id;
    await req.db.execute('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// POST /api/users/:id/deactivate - Deactivate user (admin roles)
router.post('/:id/deactivate', verifyToken, authorize('admin', 'program_leader', 'principal_lecturer', 'faculty_manager'), async (req, res) => {
  try {
    const userId = req.params.id;
    await req.db.execute('UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
    await ensureNotificationsTable(req.db);
    await req.db.execute(
      `INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'account', 'Account deactivated', 'Your account has been deactivated by an administrator.')`,
      [Number(userId)]
    );
    notifyAll({ type: 'notification:new' });
    res.json({ message: 'User deactivated' });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// POST /api/users/:id/reactivate - Reactivate user (admin roles)
router.post('/:id/reactivate', verifyToken, authorize('admin', 'program_leader', 'principal_lecturer', 'faculty_manager'), async (req, res) => {
  try {
    const userId = req.params.id;
    await req.db.execute('UPDATE users SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
    await ensureNotificationsTable(req.db);
    await req.db.execute(
      `INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'account', 'Account reactivated', 'Your account has been reactivated by an administrator.')`,
      [Number(userId)]
    );
    notifyAll({ type: 'notification:new' });
    res.json({ message: 'User reactivated' });
  } catch (error) {
    console.error('Reactivate user error:', error);
    res.status(500).json({ error: 'Failed to reactivate user' });
  }
});

// GET /api/users/courses/available - Get available courses for enrollment
router.get('/courses/available', verifyToken, async (req, res) => {
  try {
    const { stream_id, all } = req.query;
    const userId = req.user.id;
    const role = req.user.role;

    // Force return all courses when explicitly requested
    if (String(all).toLowerCase() === 'true') {
      let allQuery = `
        SELECT 
          c.id, c.course_name, c.course_code, c.credits, c.semester,
          s.stream_name, s.stream_code
        FROM courses c
        JOIN streams s ON c.stream_id = s.id
      `;
      const allParams = [];
      if (stream_id) {
        allQuery += ' WHERE c.stream_id = ?';
        allParams.push(stream_id);
      }
      allQuery += ' ORDER BY s.stream_name, c.semester, c.course_name';
      const [allCourses] = await req.db.execute(allQuery, allParams);
      return res.json({ courses: allCourses });
    }

    if (role === 'student') {
      // Student: return enrolled courses
      let query = `
        SELECT 
          c.id, c.course_name, c.course_code, c.credits, c.semester,
          s.stream_name, s.stream_code
        FROM student_enrollments se
        JOIN courses c ON se.course_id = c.id
        JOIN streams s ON c.stream_id = s.id
        WHERE se.student_id = ?
      `;
      const params = [userId];
      if (stream_id) {
        query += ' AND c.stream_id = ?';
        params.push(stream_id);
      }
      query += ' ORDER BY s.stream_name, c.semester, c.course_name';
      const [courses] = await req.db.execute(query, params);
      return res.json({ courses });
    }

    // Any non-student: try assigned courses first
    let assignedQuery = `
      SELECT 
        c.id, c.course_name, c.course_code, c.credits, c.semester,
        s.stream_name, s.stream_code
      FROM lecturer_courses lc
      JOIN courses c ON lc.course_id = c.id
      JOIN streams s ON c.stream_id = s.id
      WHERE lc.lecturer_id = ?
    `;
    const assignedParams = [userId];
    if (stream_id) {
      assignedQuery += ' AND c.stream_id = ?';
      assignedParams.push(stream_id);
    }
    assignedQuery += ' ORDER BY s.stream_name, c.semester, c.course_name';
    const [assigned] = await req.db.execute(assignedQuery, assignedParams);
    if (assigned && assigned.length > 0) {
      return res.json({ courses: assigned });
    }

    // Fallback for managers with no assignments: return all courses (optionally filtered)
    let allQuery = `
      SELECT 
        c.id, c.course_name, c.course_code, c.credits, c.semester,
        s.stream_name, s.stream_code
      FROM courses c
      JOIN streams s ON c.stream_id = s.id
    `;
    const allParams = [];
    if (stream_id) {
      allQuery += ' WHERE c.stream_id = ?';
      allParams.push(stream_id);
    }
    allQuery += ' ORDER BY s.stream_name, c.semester, c.course_name';
    const [allCourses] = await req.db.execute(allQuery, allParams);
    return res.json({ courses: allCourses });

  } catch (error) {
    console.error('Get available courses error:', error);
    res.status(500).json({ error: 'Failed to fetch available courses' });
  }
});

// POST /api/users/:id/enroll - Enroll student in course
router.post('/:id/enroll', [
  verifyToken,
  authorize('program_leader', 'principal_lecturer', 'faculty_manager'),
  body('courseId').isInt({ min: 1 }).withMessage('Valid course ID is required'),
  body('academicYear').matches(/^\d{4}$/).withMessage('Academic year must be 4 digits'),
  body('semester').isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const studentId = req.params.id;
    const { courseId, academicYear, semester } = req.body;

    // Check if user is a student
    const [users] = await req.db.execute(
      'SELECT role FROM users WHERE id = ? AND is_active = TRUE',
      [studentId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (users[0].role !== 'student') {
      return res.status(400).json({ error: 'User is not a student' });
    }

    // Check if course exists
    const [courses] = await req.db.execute('SELECT id FROM courses WHERE id = ?', [courseId]);
    if (courses.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if already enrolled
    const [existingEnrollment] = await req.db.execute(
      'SELECT id FROM student_enrollments WHERE student_id = ? AND course_id = ? AND academic_year = ?',
      [studentId, courseId, academicYear]
    );

    if (existingEnrollment.length > 0) {
      return res.status(400).json({ error: 'Student already enrolled in this course for this academic year' });
    }

    // Enroll student
    await req.db.execute(
      'INSERT INTO student_enrollments (student_id, course_id, academic_year, semester) VALUES (?, ?, ?, ?)',
      [studentId, courseId, academicYear, semester]
    );

    // Initialize progress tracking
    await req.db.execute(
      'INSERT INTO progress_tracking (student_id, course_id, completion_percentage) VALUES (?, ?, 0.00)',
      [studentId, courseId]
    );

    res.json({ message: 'Student enrolled successfully' });

  } catch (error) {
    console.error('Enroll student error:', error);
    res.status(500).json({ error: 'Failed to enroll student' });
  }
});

// POST /api/users/:id/assign-course - Assign course to lecturer
router.post('/:id/assign-course', [
  verifyToken,
  authorize('program_leader', 'principal_lecturer', 'faculty_manager'),
  body('courseId').isInt({ min: 1 }).withMessage('Valid course ID is required'),
  body('academicYear').matches(/^\d{4}$/).withMessage('Academic year must be 4 digits'),
  body('semester').isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const lecturerId = req.params.id;
    const { courseId, academicYear, semester } = req.body;

    // Allow assigning courses to ANY non-student user (treat them as lecturers functionally)
    const [users] = await req.db.execute(
      'SELECT role FROM users WHERE id = ? AND is_active = TRUE',
      [lecturerId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (users[0].role === 'student') {
      return res.status(400).json({ error: 'Cannot assign courses to a student' });
    }

    // Check if course exists
    const [courses] = await req.db.execute('SELECT id FROM courses WHERE id = ?', [courseId]);
    if (courses.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if already assigned
    const [existingAssignment] = await req.db.execute(
      'SELECT id FROM lecturer_courses WHERE lecturer_id = ? AND course_id = ? AND academic_year = ?',
      [lecturerId, courseId, academicYear]
    );

    if (existingAssignment.length > 0) {
      return res.status(400).json({ error: 'Lecturer already assigned to this course for this academic year' });
    }

    // Check user's course limit (business rule: max 3 courses per academic year)
    const [currentAssignments] = await req.db.execute(
      'SELECT COUNT(*) as count FROM lecturer_courses WHERE lecturer_id = ? AND academic_year = ?',
      [lecturerId, academicYear]
    );

    if (currentAssignments[0].count >= 3) {
      return res.status(400).json({ error: 'Lecturer already has maximum of 3 courses assigned' });
    }

    // Assign course
    await req.db.execute(
      'INSERT INTO lecturer_courses (lecturer_id, course_id, academic_year, semester) VALUES (?, ?, ?, ?)',
      [lecturerId, courseId, academicYear, semester]
    );

    res.json({ message: 'Course assigned to lecturer successfully' });

  } catch (error) {
    console.error('Assign course error:', error);
    res.status(500).json({ error: 'Failed to assign course to lecturer' });
  }
});

// GET /api/users/streams - Get all streams
router.get('/streams/list', verifyToken, async (req, res) => {
  try {
    const [streams] = await req.db.execute(`
      SELECT 
        s.id, s.stream_name, s.stream_code, s.description,
        COUNT(DISTINCT c.id) as course_count,
        COUNT(DISTINCT se.student_id) as student_count
      FROM streams s
      LEFT JOIN courses c ON s.id = c.stream_id
      LEFT JOIN student_enrollments se ON c.id = se.course_id
      GROUP BY s.id
      ORDER BY s.stream_name
    `);

    res.json({ streams });

  } catch (error) {
    console.error('Get streams error:', error);
    res.status(500).json({ error: 'Failed to fetch streams' });
  }
});

// POST /api/users/rate-class - Rate a class/lecture (students only)
router.post('/rate-class', [
  verifyToken,
  authorize('student'),
  body('courseId').isInt({ min: 1 }).withMessage('Valid course ID is required'),
  body('lecturerId').isInt({ min: 1 }).withMessage('Valid lecturer ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comments').optional().isLength({ max: 500 }).withMessage('Comments must be less than 500 characters'),
  body('classDate').isISO8601().withMessage('Valid class date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const studentId = req.user.id;
    const { courseId, lecturerId, rating, comments, classDate } = req.body;

    // Check if student is enrolled in the course
    const [enrollment] = await req.db.execute(
      'SELECT id FROM student_enrollments WHERE student_id = ? AND course_id = ?',
      [studentId, courseId]
    );

    if (enrollment.length === 0) {
      return res.status(400).json({ error: 'You are not enrolled in this course' });
    }

    // Check if lecturer teaches this course
    const [lecturerCourse] = await req.db.execute(
      'SELECT id FROM lecturer_courses WHERE lecturer_id = ? AND course_id = ?',
      [lecturerId, courseId]
    );

    if (lecturerCourse.length === 0) {
      return res.status(400).json({ error: 'This lecturer does not teach this course' });
    }

    // Check if already rated this class
    const [existingRating] = await req.db.execute(
      'SELECT id FROM class_ratings WHERE student_id = ? AND course_id = ? AND lecturer_id = ? AND class_date = ?',
      [studentId, courseId, lecturerId, classDate]
    );

    if (existingRating.length > 0) {
      // Update existing rating
      await req.db.execute(
        'UPDATE class_ratings SET rating = ?, comments = ? WHERE id = ?',
        [rating, comments, existingRating[0].id]
      );
      res.json({ message: 'Class rating updated successfully' });
    } else {
      // Create new rating  
      await req.db.execute(
        'INSERT INTO class_ratings (student_id, course_id, lecturer_id, rating, comments, class_date) VALUES (?, ?, ?, ?, ?, ?)',
        [studentId, courseId, lecturerId, rating, comments, classDate]
      );
      res.json({ message: 'Class rated successfully' });
    }
  } catch (error) {
    console.error('Rate class error:', error);
    res.status(500).json({ error: 'Failed to rate class' });
  }
    
});

module.exports = router;