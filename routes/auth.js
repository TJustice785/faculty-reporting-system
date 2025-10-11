const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Registration validation rules
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .bail()
    .isLength({ max: 150 })
    .withMessage('Email must be 150 characters or fewer')
    .bail()
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be 50 characters or fewer'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be 50 characters or fewer'),
  body('phone')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 30 })
    .withMessage('Phone must be 30 characters or fewer'),
  body('role')
    .isIn(['student', 'lecturer', 'program_leader', 'principal_lecturer', 'faculty_manager'])
    .withMessage('Invalid role specified')
  ,
  body('streamId')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('streamId must be a valid ID'),
  body('courseId')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('courseId must be a valid ID')
];

// Login validation rules
const loginValidation = [
  body('username')
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// POST /api/auth/register
router.post('/register', registerValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, email, password, firstName, lastName, role, phone, streamId, courseId } = req.body;

    // Check if user already exists
    const [existingUsers] = await req.db.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        error: 'User already exists with this username or email'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Optional: validate stream and course exist if provided
    let validStreamId = null;
    let validCourseId = null;
    if (streamId) {
      const [streams] = await req.db.execute('SELECT id FROM streams WHERE id = ?', [streamId]);
      if (streams.length === 0) return res.status(400).json({ error: 'Selected faculty (stream) not found' });
      validStreamId = Number(streamId);
    }
    if (courseId) {
      const [courses] = await req.db.execute('SELECT id, stream_id FROM courses WHERE id = ?', [courseId]);
      if (courses.length === 0) return res.status(400).json({ error: 'Selected course not found' });
      // If both provided, ensure course belongs to stream
      if (validStreamId && courses[0].stream_id !== validStreamId) {
        return res.status(400).json({ error: 'Selected course does not belong to the selected faculty' });
      }
      validCourseId = Number(courseId);
      // if stream not provided, infer from course
      if (!validStreamId) validStreamId = courses[0].stream_id;
    }

    // Insert new user (PostgreSQL)
    const [result] = await req.db.execute(
      `INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone, stream_id, course_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        String(username).trim(),
        String(email).trim(),
        passwordHash,
        role,
        String(firstName).trim(),
        String(lastName).trim(),
        phone ? String(phone).trim() : null,
        validStreamId,
        validCourseId,
      ]
    );

    const newUserId = result[0]?.id;

    // Generate token
    const token = generateToken(newUserId, role);

    // Create a welcome system notification for the new user (idempotent friendly)
    try {
      await req.db.execute(`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL,
          type TEXT NOT NULL,
          title TEXT,
          message TEXT,
          read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      // Insert welcome notification
      await req.db.execute(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES (?, 'system', 'Welcome to Faculty Reporting System', 'Your account was created successfully. Explore your dashboard, courses, and notifications to get started.')`,
        [newUserId]
      );
    } catch (e) {
      // Non-fatal: do not block registration on notification failure
      console.warn('Welcome notification failed:', e.message);
    }

    // Return user data (without password)
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUserId,
        username,
        email,
        role,
        firstName,
        lastName,
        phone,
        streamId: validStreamId,
        courseId: validCourseId
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    // Surface validation-like feedback for common DB errors
    if (error && error.code === '22001') {
      return res.status(400).json({ error: 'One or more fields exceed allowed length. Please shorten your input.' });
    }
    if (error && error.code === '23505') {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, password } = req.body;
    const input = (username || '').trim().toLowerCase();

    // Try to find user by username OR email
    const [rows] = await req.db.execute(
      'SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1',
      [input, input]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const user = rows[0];

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    // Generate JWT
    const token = generateToken(user.id, user.role);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'An unexpected error occurred. Login failed' });
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', verifyToken, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        firstName: req.user.first_name,
        lastName: req.user.last_name
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', [
  verifyToken,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get current password hash
    const [users] = await req.db.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await req.db.execute(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, userId]
    );

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// POST /api/auth/logout (optional - mainly for client-side token removal)
router.post('/logout', verifyToken, (req, res) => {
  // In a more complex setup, you might maintain a blacklist of tokens
  // For now, we'll just return success and let client handle token removal
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/verify-token - Verify if token is still valid
router.get('/verify-token', verifyToken, (req, res) => {
  res.json({ 
    valid: true, 
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    }
  });
});

module.exports = router;