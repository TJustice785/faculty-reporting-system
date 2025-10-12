const express = require('express');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/ratings/peer/received?lecturerId=:id
router.get('/peer/received', verifyToken, async (req, res) => {
  try {
    const lecturerId = parseInt(req.query.lecturerId || req.user.id, 10);
    if (!Number.isFinite(lecturerId)) return res.status(400).json({ error: 'Invalid lecturerId' });
    const [rows] = await req.db.execute(`
      SELECT pr.id, pr.rating, pr.comment, pr.created_at,
             rater.first_name AS rater_first_name, rater.last_name AS rater_last_name
      FROM peer_ratings pr
      JOIN users rater ON rater.id = pr.rater_lecturer_id
      WHERE pr.rated_lecturer_id = ?
      ORDER BY pr.created_at DESC
      LIMIT 100
    `, [lecturerId]);
    res.json({ ratings: rows || [] });
  } catch (e) {
    console.error('Peer ratings received error:', e);
    res.status(500).json({ error: 'Failed to fetch peer ratings' });
  }
});

// GET /api/ratings/peer/given?lecturerId=:id
router.get('/peer/given', verifyToken, async (req, res) => {
  try {
    const lecturerId = parseInt(req.query.lecturerId || req.user.id, 10);
    if (!Number.isFinite(lecturerId)) return res.status(400).json({ error: 'Invalid lecturerId' });
    const [rows] = await req.db.execute(`
      SELECT pr.id, pr.rating, pr.comment, pr.created_at,
             rated.first_name AS rated_first_name, rated.last_name AS rated_last_name
      FROM peer_ratings pr
      JOIN users rated ON rated.id = pr.rated_lecturer_id
      WHERE pr.rater_lecturer_id = ?
      ORDER BY pr.created_at DESC
      LIMIT 100
    `, [lecturerId]);
    res.json({ ratings: rows || [] });
  } catch (e) {
    console.error('Peer ratings given error:', e);
    res.status(500).json({ error: 'Failed to fetch peer ratings' });
  }
});

// POST /api/ratings/peer { ratedLecturerId, rating, comment }
router.post('/peer', verifyToken, async (req, res) => {
  try {
    const raterId = req.user.id;
    const { ratedLecturerId, rating, comment } = req.body || {};
    const ratedId = parseInt(ratedLecturerId, 10);
    const val = Number(rating);
    if (!Number.isFinite(ratedId) || ratedId <= 0) return res.status(400).json({ error: 'Invalid ratedLecturerId' });
    if (!Number.isFinite(val) || val < 1 || val > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
    if (ratedId === raterId) return res.status(400).json({ error: 'Cannot rate yourself' });

    await req.db.execute(`
      INSERT INTO peer_ratings (rater_lecturer_id, rated_lecturer_id, rating, comment)
      VALUES (?, ?, ?, ?)
    `, [raterId, ratedId, val, comment ? String(comment).trim() : null]);

    res.status(201).json({ message: 'Peer rating submitted' });
  } catch (e) {
    console.error('Peer rating create error:', e);
    res.status(500).json({ error: 'Failed to submit peer rating' });
  }
});

module.exports = router;
