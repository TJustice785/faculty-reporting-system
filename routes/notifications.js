const express = require('express');
const { verifyToken } = require('../middleware/auth');

// Simple in-memory SSE registry
const clients = new Set();
let pingInterval = null;

function startPing() {
  if (pingInterval) return;
  pingInterval = setInterval(() => {
    const now = Date.now();
    for (const res of clients) {
      try { res.write(`event: ping\ndata: ${now}\n\n`); } catch (_) {}
    }
  }, 25000);
}

function notifyAll(event = { type: 'notification:new' }) {
  const payload = typeof event === 'string' ? event : JSON.stringify(event);
  for (const res of clients) {
    try { res.write(`event: message\ndata: ${payload}\n\n`); } catch (_) {}
  }
}

const router = express.Router();

// GET /api/notifications/stream - Server-Sent Events for notifications
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`event: hello\ndata: connected\n\n`);
  clients.add(res);
  startPing();

  req.on('close', () => {
    clients.delete(res);
  });
});

// Helper: ensure notifications table exists (idempotent). Exported for reuse.
async function ensureNotificationsTable(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      type TEXT NOT NULL,
      title TEXT,
      message TEXT,
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

module.exports = {
  router,
  notifyAll,
  ensureNotificationsTable,
};

// Preferences table helper
async function ensurePreferencesTable(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      email_enabled BOOLEAN DEFAULT TRUE,
      push_enabled BOOLEAN DEFAULT TRUE,
      system_enabled BOOLEAN DEFAULT TRUE,
      feedback_enabled BOOLEAN DEFAULT TRUE,
      new_report_enabled BOOLEAN DEFAULT TRUE
    );
  `);
}

// GET /api/notifications/preferences - get current user's preferences
router.get('/preferences', verifyToken, async (req, res) => {
  try {
    await ensurePreferencesTable(req.db);
    const userId = req.user.id;
    const [rows] = await req.db.execute(`
      SELECT user_id, email_enabled, push_enabled, system_enabled, feedback_enabled, new_report_enabled
      FROM notification_preferences WHERE user_id = ?
    `, [userId]);
    if (!rows || rows.length === 0) {
      return res.json({
        user_id: userId,
        email_enabled: true,
        push_enabled: true,
        system_enabled: true,
        feedback_enabled: true,
        new_report_enabled: true,
      });
    }
    res.json(rows[0]);
  } catch (e) {
    console.error('Get notification preferences error:', e);
    res.status(500).json({ error: 'Failed to get notification preferences' });
  }
});

// PUT /api/notifications/preferences - update current user's preferences
router.put('/preferences', verifyToken, async (req, res) => {
  try {
    await ensurePreferencesTable(req.db);
    const userId = req.user.id;
    const {
      email_enabled = true,
      push_enabled = true,
      system_enabled = true,
      feedback_enabled = true,
      new_report_enabled = true,
    } = req.body || {};

    await req.db.execute(`
      INSERT INTO notification_preferences (
        user_id, email_enabled, push_enabled, system_enabled, feedback_enabled, new_report_enabled
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id) DO UPDATE SET
        email_enabled = EXCLUDED.email_enabled,
        push_enabled = EXCLUDED.push_enabled,
        system_enabled = EXCLUDED.system_enabled,
        feedback_enabled = EXCLUDED.feedback_enabled,
        new_report_enabled = EXCLUDED.new_report_enabled
    `, [userId, !!email_enabled, !!push_enabled, !!system_enabled, !!feedback_enabled, !!new_report_enabled]);

    res.json({ message: 'Preferences updated' });
  } catch (e) {
    console.error('Update notification preferences error:', e);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});
