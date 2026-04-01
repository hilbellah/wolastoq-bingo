const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// GET /api/sessions — list all upcoming active sessions
router.get('/', (req, res) => {
  const db = getDb();
  const sessions = db.prepare(`
    SELECT
      s.id,
      s.date,
      s.time,
      s.doors_open,
      s.is_active,
      COUNT(CASE WHEN se.status = 'vacant' THEN 1 END) AS available_seats,
      COUNT(CASE WHEN se.status = 'held'   THEN 1 END) AS held_seats,
      COUNT(CASE WHEN se.status = 'sold'   THEN 1 END) AS sold_seats,
      COUNT(se.id) AS total_seats
    FROM sessions s
    LEFT JOIN seats se ON se.session_id = s.id
    WHERE s.is_active = 1 AND s.date >= date('now')
    GROUP BY s.id
    ORDER BY s.date ASC, s.time ASC
    LIMIT 10
  `).all();
  res.json({ sessions });
});

// GET /api/sessions/:id — single session with seat counts
router.get('/:id', (req, res) => {
  const db = getDb();
  const session = db.prepare(`
    SELECT s.*,
      COUNT(CASE WHEN se.status = 'vacant' THEN 1 END) AS available_seats,
      COUNT(CASE WHEN se.status = 'sold'   THEN 1 END) AS sold_seats,
      COUNT(se.id) AS total_seats
    FROM sessions s
    LEFT JOIN seats se ON se.session_id = s.id
    WHERE s.id = ?
    GROUP BY s.id
  `).get(req.params.id);

  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ session });
});

module.exports = router;
