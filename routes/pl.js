const express = require('express');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/pl/streams - Streams managed by current user (PL/PRL)
router.get('/streams', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await req.db.execute(`
      SELECT s.id, s.stream_name
      FROM user_streams us
      JOIN streams s ON s.id = us.stream_id
      WHERE us.user_id = ?
      ORDER BY s.stream_name ASC
    `, [userId]);
    res.json({ streams: rows || [] });
  } catch (e) {
    console.error('PL streams error:', e);
    res.status(500).json({ error: 'Failed to fetch streams' });
  }
});

// GET /api/pl/streams/:id/courses - Courses under a managed stream
router.get('/streams/:id/courses', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const streamId = parseInt(req.params.id, 10);
    if (!Number.isFinite(streamId)) return res.status(400).json({ error: 'Invalid stream id' });

    // Check user manages the stream
    const [chk] = await req.db.execute(`SELECT 1 FROM user_streams WHERE user_id = ? AND stream_id = ?`, [userId, streamId]);
    if (!chk || chk.length === 0) return res.status(403).json({ error: 'Not authorized for this stream' });

    const [courses] = await req.db.execute(`
      SELECT c.id, c.course_name, c.course_code
      FROM courses c
      WHERE c.stream_id = ?
      ORDER BY c.course_name ASC
    `, [streamId]);
    res.json({ courses: courses || [] });
  } catch (e) {
    console.error('PL stream courses error:', e);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// GET /api/pl/streams/:id/reports - Reports scoped by stream
router.get('/streams/:id/reports', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const streamId = parseInt(req.params.id, 10);
    const status = String(req.query.status || '').trim();
    if (!Number.isFinite(streamId)) return res.status(400).json({ error: 'Invalid stream id' });

    const [chk] = await req.db.execute(`SELECT 1 FROM user_streams WHERE user_id = ? AND stream_id = ?`, [userId, streamId]);
    if (!chk || chk.length === 0) return res.status(403).json({ error: 'Not authorized for this stream' });

    let base = `
      FROM reports r
      LEFT JOIN courses c ON c.id = r.course_id
      LEFT JOIN users u ON u.id = r.reporter_id
      WHERE c.stream_id = ?
    `;
    const params = [streamId];
    if (status) {
      base += ` AND r.status = ?`;
      params.push(status);
    }
    const [rows] = await req.db.execute(`
      SELECT r.id, r.title, r.status, r.created_at,
             c.course_name,
             u.first_name, u.last_name, u.role as reporter_role
      ${base}
      ORDER BY r.created_at DESC
      LIMIT 50
    `, params);
    res.json({ reports: rows || [] });
  } catch (e) {
    console.error('PL stream reports error:', e);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

module.exports = router;
