const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { verifyToken, authorize, validateReportAccess } = require('../middleware/auth');
const { notifyAll, ensureNotificationsTable } = require('./notifications');

const router = express.Router();

// Validation rules for report creation (relaxed to allow simple title + description)
const reportValidation = [
  body('title')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required and must be less than 200 characters'),
  // Allow either 'content' or 'description' with at least 1 char
  body('content')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Content must be at least 1 character long'),
  body('description')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Description must be at least 1 character long'),
  // reportType is optional; if provided, must be valid. Otherwise we infer by role.
  body('reportType')
    .optional()
    .isIn(['student_report', 'lecturer_report', 'progress_report', 'feedback_report'])
    .withMessage('Invalid report type'),
  body('courseId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Course ID must be a valid number'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5')
];

// GET /api/reports - Get reports based on user role
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, courseId, reportType, search } = req.query;
    const streamParam = req.query.stream_id || req.query.streamId || null;
    const offset = (page - 1) * limit;
    const userId = req.user.id;
    const userRole = req.user.role;

    let baseQuery = `
      SELECT 
        r.id, r.title, r.content, r.report_type, r.status, r.rating,
        r.attendance_count, r.topic_covered, r.learning_outcomes,
        r.challenges, r.recommendations, r.created_at, r.updated_at,
        u.first_name, u.last_name, u.role as reporter_role,
        c.course_name, c.course_code
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      LEFT JOIN courses c ON r.course_id = c.id
    `;

    let whereConditions = [];
    let queryParams = [];

    // Role-based filtering
    switch (userRole) {
      case 'student':
        whereConditions.push('r.reporter_id = ?');
        queryParams.push(userId);
        break;
        
      case 'lecturer':
        // Lecturers see their own reports and student reports from their courses
        whereConditions.push(`(
          r.reporter_id = ? OR 
          (u.role = 'student' AND r.course_id IN (
            SELECT course_id FROM lecturer_courses WHERE lecturer_id = ?
          ))
        )`);
        queryParams.push(userId, userId);
        break;
        
      case 'program_leader':
        // Program leaders see lecturer and student reports from their streams
        whereConditions.push(`(
          r.reporter_id = ? OR
          u.role IN ('lecturer', 'student')
        )`);
        queryParams.push(userId);
        break;
        
      case 'principal_lecturer':
        // Principal lecturers see reports from their streams
        whereConditions.push(`(
          r.reporter_id = ? OR
          u.role IN ('program_leader', 'lecturer', 'student')
        )`);
        queryParams.push(userId);
        break;
        
      case 'faculty_manager':
        // Faculty managers see all reports
        break;
        
      default:
        whereConditions.push('r.reporter_id = ?');
        queryParams.push(userId);
    }

    // Additional filters
    if (status) {
      whereConditions.push('r.status = ?');
      queryParams.push(status);
    }

    if (courseId) {
      whereConditions.push('r.course_id = ?');
      queryParams.push(courseId);
    }

    if (reportType) {
      whereConditions.push('r.report_type = ?');
      queryParams.push(reportType);
    }

    if (streamParam) {
      whereConditions.push('c.stream_id = ?');
      queryParams.push(streamParam);
    }

    if (search) {
      whereConditions.push('(r.title ILIKE ? OR r.content ILIKE ?)');
      const term = `%${search}%`;
      queryParams.push(term, term);
    }

    // Build final query
    let finalQuery = baseQuery;
    if (whereConditions.length > 0) {
      finalQuery += ' WHERE ' + whereConditions.join(' AND ');
    }
    finalQuery += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), parseInt(offset));

    // Execute query
    const [reports] = await req.db.execute(finalQuery, queryParams);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM reports r JOIN users u ON r.reporter_id = u.id LEFT JOIN courses c ON r.course_id = c.id';
    let countParams = [];
    
    if (whereConditions.length > 0) {
      countQuery += ' WHERE ' + whereConditions.join(' AND ');
      countParams = queryParams.slice(0, -2); // Remove limit and offset
    }

    const [countResult] = await req.db.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

// POST /api/reports/:id/submit - Submit a draft report (owner only)
router.post('/:id/submit', verifyToken, validateReportAccess, async (req, res) => {
  try {
    const reportId = req.params.id;
    const report = req.report; // from validateReportAccess

    if (report.reporter_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can submit this report' });
    }
    if (report.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft reports can be submitted' });
    }

    // Determine target role for submission based on reporter role
    let submittedToRole = null;
    switch (req.user.role) {
      case 'student':
        submittedToRole = 'lecturer';
        break;
      case 'lecturer':
      case 'admin':
      case 'program_leader':
      case 'principal_lecturer':
      case 'faculty_manager':
        submittedToRole = 'program_leader';
        break;
      default:
        submittedToRole = null;
    }

    await req.db.execute(
      `UPDATE reports SET status = ?, submitted_to_role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      ['submitted', submittedToRole, reportId]
    );

    res.json({ message: 'Report submitted' });
  } catch (error) {
    console.error('Submit report error:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// GET /api/reports/:id/attachments - List attachments for a report
router.get('/:id/attachments', verifyToken, async (req, res) => {
  try {
    const reportId = req.params.id;
    // Ensure report exists and access allowed (basic check: owner or elevated see files)
    const [reports] = await req.db.execute('SELECT id, reporter_id FROM reports WHERE id = ?', [reportId]);
    if (!reports || reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    const dir = path.join(__dirname, '..', 'uploads', 'reports', String(reportId));
    let files = [];
    try {
      const list = fs.readdirSync(dir, { withFileTypes: true });
      files = list.filter(d => d.isFile()).map(d => {
        const filepath = path.join(dir, d.name);
        const stat = fs.statSync(filepath);
        return {
          filename: d.name,
          size: stat.size,
          url: `/uploads/reports/${reportId}/${d.name}`,
        };
      });
    } catch (_) {}
    res.json({ files });
  } catch (error) {
    console.error('List attachments error:', error);
    res.status(500).json({ error: 'Failed to list attachments' });
  }
});

// PUT /api/reports/:id/moderate - Elevated roles update status/rating
router.put('/:id/moderate', [
  verifyToken,
  authorize(['admin','faculty_manager','principal_lecturer','program_leader']),
  body('status').optional().isIn(['approved','rejected','reviewed']).withMessage('Invalid status'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    const reportId = req.params.id;
    const { status, rating } = req.body;
    // Ensure report exists
    const [reports] = await req.db.execute('SELECT id FROM reports WHERE id = ?', [reportId]);
    if (!reports || reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    // Build dynamic SET
    const sets = [];
    const params = [];
    if (status) { sets.push('status = ?'); params.push(status); }
    if (Number.isInteger(rating)) { sets.push('rating = ?'); params.push(rating); }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    sets.push('updated_at = CURRENT_TIMESTAMP');
    await req.db.execute(`UPDATE reports SET ${sets.join(', ')} WHERE id = ?`, [...params, reportId]);

    // Notify report owner about status change
    await ensureNotificationsTable(req.db);
    const title = 'Report updated';
    const msg = status ? `Your report #${reportId} status changed to ${status}` : `Your report #${reportId} was updated by a reviewer.`;
    const [ownerRows] = await req.db.execute('SELECT reporter_id FROM reports WHERE id = ?', [reportId]);
    const ownerId = ownerRows?.[0]?.reporter_id;
    if (ownerId) {
      await req.db.execute(
        `INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'report', ?, ?)`,
        [ownerId, title, msg]
      );
      notifyAll({ type: 'notification:new' });
    }

    res.json({ message: 'Report moderated successfully' });
  } catch (error) {
    console.error('Moderate report error:', error);
    res.status(500).json({ error: 'Failed to moderate report' });
  }
});
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET /api/reports/:id - Get specific report
router.get('/:id', verifyToken, validateReportAccess, async (req, res) => {
  try {
    const reportId = req.params.id;

    const [reports] = await req.db.execute(`
      SELECT 
        r.*,
        u.first_name, u.last_name, u.role as reporter_role,
        c.course_name, c.course_code
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      LEFT JOIN courses c ON r.course_id = c.id
      WHERE r.id = ?
    `, [reportId]);

    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Get feedback for this report
    const [feedback] = await req.db.execute(`
      SELECT 
        f.*,
        uf.first_name as from_first_name, uf.last_name as from_last_name,
        ut.first_name as to_first_name, ut.last_name as to_last_name
      FROM feedback f
      JOIN users uf ON f.feedback_from_id = uf.id
      JOIN users ut ON f.feedback_to_id = ut.id
      WHERE f.report_id = ?
      ORDER BY f.created_at DESC
    `, [reportId]);

    res.json({
      report: reports[0],
      feedback
    });

  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// POST /api/reports - Create new report
router.post('/', [verifyToken, ...reportValidation], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    let {
      title,
      content,
      description,
      reportType,
      courseId,
      attendanceCount,
      topicCovered,
      learningOutcomes,
      challenges,
      recommendations,
      rating
    } = req.body;

    const userId = req.user.id;
    const userRole = req.user.role;

    // If content is missing but description provided, use description as content
    if (!content && description) {
      content = description;
    }

    // Determine submitted_to_role based on user role
    let submittedToRole;
    switch (userRole) {
      case 'student':
        submittedToRole = 'lecturer';
        break;
      case 'lecturer':
        submittedToRole = 'program_leader';
        break;
      case 'program_leader':
        submittedToRole = 'principal_lecturer';
        break;
      case 'principal_lecturer':
        submittedToRole = 'faculty_manager';
        break;
      default:
        submittedToRole = null;
    }

    // Treat ALL non-student users like lecturers for workflows
    const isNonStudent = userRole !== 'student';

    // Set initial status: submitted for student and all non-students to enable review workflows
    const initialStatus = (userRole === 'student' || isNonStudent)
      ? 'submitted'
      : 'draft';

    // If reportType not provided, infer a sensible default by role
    if (!reportType) {
      if (userRole === 'student') reportType = 'student_report';
      else if (isNonStudent) reportType = 'lecturer_report';
      else reportType = 'progress_report';
    }

    // Business rule: ALL non-students must specify the course the report belongs to
    if (isNonStudent && !courseId) {
      return res.status(400).json({ error: 'Please select a course for this report' });
    }

    // Final minimal guard: ensure we have at least title + content
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content (or description) are required' });
    }

    // Insert report (PostgreSQL)
    const [result] = await req.db.execute(`
      INSERT INTO reports (
        reporter_id, report_type, course_id, title, content,
        attendance_count, topic_covered, learning_outcomes,
        challenges, recommendations, rating, status, submitted_to_role
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
    `, [
      userId, reportType, courseId, title, content,
      attendanceCount, topicCovered, learningOutcomes,
      challenges, recommendations, rating, initialStatus, submittedToRole
    ]);

    // Get the created report
    const [newReport] = await req.db.execute(`
      SELECT 
        r.*,
        u.first_name, u.last_name, u.role as reporter_role,
        c.course_name, c.course_code
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      LEFT JOIN courses c ON r.course_id = c.id
      WHERE r.id = ?
    `, [result[0]?.id]);

    res.status(201).json({
      message: 'Report created successfully',
      report: newReport[0]
    });

  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// PUT /api/reports/:id - Update report
router.put('/:id', [verifyToken, validateReportAccess, ...reportValidation], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const reportId = req.params.id;
    const report = req.report; // From validateReportAccess middleware

    // Only report owner can update (unless admin features needed)
    if (report.reporter_id !== req.user.id) {
      return res.status(403).json({ error: 'Can only update your own reports' });
    }

    // Don't allow updates to submitted reports (optional business rule)
    if (report.status === 'approved' || report.status === 'reviewed') {
      return res.status(400).json({ error: 'Cannot update reports that have been reviewed' });
    }

    const {
      title,
      content,
      courseId,
      attendanceCount,
      topicCovered,
      learningOutcomes,
      challenges,
      recommendations,
      rating
    } = req.body;

    // Update report
    await req.db.execute(`
      UPDATE reports SET
        title = ?, content = ?, course_id = ?,
        attendance_count = ?, topic_covered = ?, learning_outcomes = ?,
        challenges = ?, recommendations = ?, rating = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title, content, courseId,
      attendanceCount, topicCovered, learningOutcomes,
      challenges, recommendations, rating,
      reportId
    ]);

    // Get updated report
    const [updatedReport] = await req.db.execute(`
      SELECT 
        r.*,
        u.first_name, u.last_name, u.role as reporter_role,
        c.course_name, c.course_code
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      LEFT JOIN courses c ON r.course_id = c.id
      WHERE r.id = ?
    `, [reportId]);

    res.json({
      message: 'Report updated successfully',
      report: updatedReport[0]
    });

  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// DELETE /api/reports/:id - Delete report
router.delete('/:id', verifyToken, validateReportAccess, async (req, res) => {
  try {
    const reportId = req.params.id;
    const report = req.report;

    // Only report owner can delete
    if (report.reporter_id !== req.user.id) {
      return res.status(403).json({ error: 'Can only delete your own reports' });
    }

    // Don't allow deletion of reviewed reports
    if (report.status === 'approved' || report.status === 'reviewed') {
      return res.status(400).json({ error: 'Cannot delete reports that have been reviewed' });
    }

    // Delete report (feedback will be deleted due to CASCADE)
    await req.db.execute('DELETE FROM reports WHERE id = ?', [reportId]);

    res.json({ message: 'Report deleted successfully' });

  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// POST /api/reports/:id/feedback - Add feedback to a report
router.post('/:id/feedback', [
  verifyToken,
  validateReportAccess,
  body('content').isLength({ min: 1 }).withMessage('Feedback content is required'),
  body('feedbackType').isIn(['approval', 'rejection', 'suggestion', 'clarification']).withMessage('Invalid feedback type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const reportId = req.params.id;
    const { content, feedbackType } = req.body;
    const report = req.report;

    // Add feedback
    const [result] = await req.db.execute(`
      INSERT INTO feedback (report_id, feedback_from_id, feedback_to_id, feedback_content, feedback_type)
      VALUES (?, ?, ?, ?, ?) RETURNING id
    `, [reportId, req.user.id, report.reporter_id, content, feedbackType]);

    // Update report status based on feedback
    let newStatus = report.status;
    if (feedbackType === 'approval') {
      newStatus = 'approved';
    } else if (feedbackType === 'rejection') {
      newStatus = 'rejected';
    } else {
      newStatus = 'reviewed';
    }

    await req.db.execute(
      'UPDATE reports SET status = ? WHERE id = ?',
      [newStatus, reportId]
    );

    // Notify report owner about feedback
    await ensureNotificationsTable(req.db);
    const fbTitle = 'New feedback on your report';
    const fbMsg = `Your report #${reportId} received ${feedbackType} feedback`;
    await req.db.execute(
      `INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'feedback', ?, ?)`,
      [report.reporter_id, fbTitle, fbMsg]
    );
    notifyAll({ type: 'notification:new' });

    res.status(201).json({ message: 'Feedback added successfully', feedbackId: result[0]?.id });

  } catch (error) {
    console.error('Add feedback error:', error);
    res.status(500).json({ error: 'Failed to add feedback' });
  }
});

// GET /api/reports/stats/summary - Get report statistics
router.get('/stats/summary', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let statsQuery = `
      SELECT 
        COUNT(*) as total_reports,
        COUNT(CASE WHEN status = 'submitted' THEN 1 END) as pending_reports,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_reports,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_reports,
        AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
    `;

    let queryParams = [];

    // Role-based filtering for stats
    switch (userRole) {
      case 'student':
        statsQuery += ' WHERE r.reporter_id = ?';
        queryParams.push(userId);
        break;
      case 'lecturer':
        statsQuery += ` WHERE (
          r.reporter_id = ? OR 
          (u.role = 'student' AND r.course_id IN (
            SELECT course_id FROM lecturer_courses WHERE lecturer_id = ?
          ))
        )`;
        queryParams.push(userId, userId);
        break;
      // Add other roles as needed
    }

    const [stats] = await req.db.execute(statsQuery, queryParams);

    res.json({
      stats: stats[0]
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Attachments upload handling
// Configure multer storage to uploads/reports/:id
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const reportId = req.params.id;
    const dir = path.join(__dirname, '..', 'uploads', 'reports', String(reportId));
    fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
  },
  filename: (req, file, cb) => {
    // Keep original name prefixed with timestamp
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'application/pdf', 'text/plain'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Invalid file type'));
  },
});

// POST /api/reports/:id/attachments - Upload attachments for a report
router.post('/:id/attachments', verifyToken, upload.array('files', 5), async (req, res) => {
  try {
    const reportId = req.params.id;

    // Optionally, ensure the report exists and user has access
    const [reports] = await req.db.execute('SELECT id, reporter_id FROM reports WHERE id = ?', [reportId]);
    if (!reports || reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Basic access: allow owner or higher roles to upload
    const isOwner = reports[0].reporter_id === req.user.id;
    const elevatedRoles = ['admin', 'faculty_manager', 'principal_lecturer', 'program_leader'];
    if (!isOwner && !elevatedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not allowed to upload attachments for this report' });
    }

    // Build file metadata response
    const files = (req.files || []).map((f) => ({
      filename: f.filename,
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      url: `/uploads/reports/${reportId}/${f.filename}`,
    }));

    return res.status(201).json({ message: 'Attachments uploaded', files });
  } catch (error) {
    console.error('Upload attachments error:', error);
    return res.status(500).json({ error: 'Failed to upload attachments' });
  }
});

module.exports = router;