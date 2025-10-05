const express = require('express');
const { verifyToken, authorize } = require('../middleware/auth');
const { notifyAll, ensureNotificationsTable } = require('./notifications');

const router = express.Router();

// GET /api/admin/overview - privileged metrics for admins
router.get('/overview', verifyToken, authorize('admin'), async (req, res) => {
  try {
    const db = req.db;
    const daysParam = parseInt(req.query.days || '30', 10);
    const days = Math.min(90, Math.max(7, isNaN(daysParam) ? 30 : daysParam));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Totals by role and user activity
    const [userTotals] = await db.execute(`
      SELECT 
        COUNT(*)::int AS total_users,
        COUNT(CASE WHEN is_active THEN 1 END)::int AS active_users,
        COUNT(CASE WHEN role='student' THEN 1 END)::int AS students,
        COUNT(CASE WHEN role='lecturer' THEN 1 END)::int AS lecturers,
        COUNT(CASE WHEN role='program_leader' THEN 1 END)::int AS program_leaders,
        COUNT(CASE WHEN role='principal_lecturer' THEN 1 END)::int AS principal_lecturers,
        COUNT(CASE WHEN role='faculty_manager' THEN 1 END)::int AS faculty_managers,
        COUNT(CASE WHEN role='admin' THEN 1 END)::int AS admins
      FROM users;
    `);

    // Reports by status and recent trend
    const [reportTotals] = await db.execute(`
      SELECT 
        COUNT(*)::int AS total_reports,
        COUNT(CASE WHEN status='draft' THEN 1 END)::int AS drafts,
        COUNT(CASE WHEN status='submitted' THEN 1 END)::int AS submitted,
        COUNT(CASE WHEN status='approved' THEN 1 END)::int AS approved,
        COUNT(CASE WHEN status='rejected' THEN 1 END)::int AS rejected
      FROM reports;
    `);

    const [reportTrend] = await db.execute(`
      SELECT 
        date_trunc('day', created_at)::date AS day,
        COUNT(*)::int AS count
      FROM reports
      WHERE created_at >= ?
      GROUP BY 1
      ORDER BY 1 ASC;
    `, [since.toISOString()]);

    // Top courses by activity/enrollments
    const [topCourses] = await db.execute(`
      SELECT c.id, c.course_name, c.course_code,
             COALESCE(COUNT(DISTINCT se.student_id), 0)::int AS enrolled_students,
             COALESCE(COUNT(r.id), 0)::int AS report_count,
             COALESCE(AVG(cr.rating), NULL) AS avg_rating
      FROM courses c
      LEFT JOIN student_enrollments se ON se.course_id = c.id
      LEFT JOIN reports r ON r.course_id = c.id
      LEFT JOIN class_ratings cr ON cr.course_id = c.id
      GROUP BY c.id
      ORDER BY enrolled_students DESC, report_count DESC
      LIMIT 10;
    `);

    // Recent user registrations
    const [recentUsers] = await db.execute(`
      SELECT id, username, email, role, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10;
    `);

    // Streams overview
    const [streams] = await db.execute(`
      SELECT s.id, s.stream_name,
             COUNT(DISTINCT c.id)::int AS courses,
             COUNT(DISTINCT se.student_id)::int AS students,
             COUNT(DISTINCT lc.lecturer_id)::int AS lecturers
      FROM streams s
      LEFT JOIN courses c ON c.stream_id = s.id
      LEFT JOIN student_enrollments se ON se.course_id = c.id
      LEFT JOIN lecturer_courses lc ON lc.course_id = c.id
      GROUP BY s.id, s.stream_name
      ORDER BY s.stream_name ASC;
    `);

    res.json({
      users: userTotals?.[0] || {},
      reports: reportTotals?.[0] || {},
      reportTrend: reportTrend || [],
      topCourses: topCourses || [],
      recentUsers: recentUsers || [],
      streams: streams || [],
      generatedAt: new Date().toISOString(),
      rangeDays: days,
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ error: 'Failed to load admin overview' });
  }
});

module.exports = router;

// POST /api/admin/users/bulk - perform bulk actions on users (admin only)
router.post('/users/bulk', verifyToken, authorize('admin'), async (req, res) => {
  try {
    const { action, ids, role } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No user IDs provided' });
    }
    // Prevent accidental self-delete/disable
    const safeIds = ids.filter(id => Number(id) !== Number(req.user.id));
    if (safeIds.length === 0) return res.json({ message: 'No changes performed (skipped self)' });

    // Ensure audit_logs table exists
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

    switch (action) {
      case 'activate':
        await req.db.execute(`UPDATE users SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ANY(?)`, [safeIds]);
        break;
      case 'deactivate':
        await req.db.execute(`UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ANY(?)`, [safeIds]);
        break;
      case 'delete':
        await req.db.execute(`DELETE FROM users WHERE id = ANY(?)`, [safeIds]);
        break;
      case 'setRole':
        if (!role) return res.status(400).json({ error: 'role is required for setRole action' });
        await req.db.execute(`UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ANY(?)`, [role, safeIds]);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    // Insert audit log
    await req.db.execute(
      `INSERT INTO audit_logs (user_id, action, target_type, target_ids, meta)
       VALUES (?, ?, 'user', ?, ?)`,
      [req.user.id, action, safeIds, role ? JSON.stringify({ role }) : JSON.stringify({})]
    );

    // Insert notifications for affected users
    await ensureNotificationsTable(req.db);
    const title = 'Account update';
    const baseMsg = action === 'setRole' ? `Your role has been updated to ${role}`
                    : action === 'activate' ? 'Your account has been activated'
                    : action === 'deactivate' ? 'Your account has been deactivated'
                    : action === 'delete' ? 'Your account has been scheduled for deletion'
                    : 'Your account has been updated';
    for (const uid of safeIds) {
      await req.db.execute(
        `INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'account', ?, ?)`,
        [uid, title, baseMsg]
      );
    }
    // Broadcast to all connected clients (lightweight ping)
    notifyAll({ type: 'notification:new' });

    res.json({ message: 'Bulk action completed', action, count: safeIds.length });
  } catch (error) {
    console.error('Bulk users error:', error);
    res.status(500).json({ error: 'Failed to perform bulk user action' });
  }
});

// GET /api/admin/audit - list audit logs (admin only)
router.get('/audit', verifyToken, authorize('admin'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit || '25', 10)));
    const offset = (page - 1) * limit;
    const { action, q, startDate, endDate } = req.query || {};

    // Ensure table exists (idempotent)
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

    // Build filters
    const where = [];
    const params = [];
    if (action) { where.push('al.action = ?'); params.push(action); }
    if (q) { where.push('(LOWER(u.username) LIKE LOWER(?) OR LOWER(u.email) LIKE LOWER(?))'); params.push(`%${q}%`, `%${q}%`); }
    if (startDate) { where.push('al.created_at >= ?'); params.push(startDate); }
    if (endDate) { where.push('al.created_at <= ?'); params.push(endDate + ' 23:59:59'); }

    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

    const listSql = `
      SELECT al.*, u.username, u.email
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ${whereSql}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await req.db.execute(listSql, [...params, limit, offset]);

    const countSql = `SELECT COUNT(*)::int AS cnt FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id ${whereSql}`;
    const [countRows] = await req.db.execute(countSql, params);
    const total = countRows?.[0]?.cnt || 0;

    res.json({
      logs: rows,
      pagination: { page, pages: Math.max(1, Math.ceil(total / limit)), total, limit },
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Failed to load audit logs' });
  }
});
