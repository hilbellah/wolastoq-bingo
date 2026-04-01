const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// GET /api/announcements — public, returns currently active announcements
router.get('/', (req, res) => {
  const db  = getDb();
  const now = new Date().toISOString();
  const rows = db.prepare(`
    SELECT id, title, message, type
    FROM announcements
    WHERE is_active = 1
      AND (starts_at IS NULL OR starts_at <= ?)
      AND (ends_at   IS NULL OR ends_at   >= ?)
    ORDER BY created_at DESC
  `).all(now, now);
  res.set('Cache-Control', 'public, max-age=30');
  res.json({ announcements: rows });
});

module.exports = router;
