const express = require('express');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/me/progress - list per-course progress for the current student
router.get('/users/me/progress', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await req.db.execute(`
      SELECT 
        pt.course_id,
        c.course_name,
        c.course_code,
        pt.completion_percentage,
        pt.updated_at
      FROM progress_tracking pt
      JOIN courses c ON c.id = pt.course_id
      WHERE pt.student_id = ?
      ORDER BY c.course_name ASC
    `, [userId]);
    res.json({ progress: rows || [] });
  } catch (e) {
    console.error('Get progress error:', e);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// PUT /api/users/me/progress - update a single course progress { courseId, completion }
router.put('/users/me/progress', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId, completion } = req.body || {};
    const cid = parseInt(courseId, 10);
    const comp = Number(completion);
    if (!Number.isFinite(cid) || cid <= 0) return res.status(400).json({ error: 'Invalid courseId' });
    if (!Number.isFinite(comp) || comp < 0 || comp > 100) return res.status(400).json({ error: 'completion must be 0-100' });

    await req.db.execute(`
      INSERT INTO progress_tracking (student_id, course_id, completion_percentage, updated_at)
      VALUES (?, ?, ?, NOW())
      ON CONFLICT (student_id, course_id) DO UPDATE SET
        completion_percentage = EXCLUDED.completion_percentage,
        updated_at = NOW()
    `, [userId, cid, comp]);

    res.json({ message: 'Progress updated' });
  } catch (e) {
    console.error('Update progress error:', e);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

module.exports = router;
