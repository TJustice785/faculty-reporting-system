const express = require('express');

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
