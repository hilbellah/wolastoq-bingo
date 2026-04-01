const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { v4: uuidv4 } = require('uuid');

const HOLD_MINUTES = parseInt(process.env.SESSION_HOLD_MINUTES || '30');

// GET /api/seats/:sessionId — all seats for a session
router.get('/:sessionId', (req, res) => {
  const db = getDb();

  // Auto-release expired holds
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE seats SET status='vacant', held_by=NULL, held_until=NULL
    WHERE session_id=? AND status='held' AND held_until < ?
  `).run(req.params.sessionId, now);

  const seats = db.prepare(`
    SELECT
      s.id,
      s.session_id,
      s.table_id,
      s.seat_position,
      s.status,
      s.held_by,
      s.held_until,
      rt.table_number,
      rt.section,
      rt.capacity
    FROM seats s
    JOIN room_tables rt ON rt.id = s.table_id
    WHERE s.session_id = ?
    ORDER BY rt.table_number, s.seat_position
  `).all(req.params.sessionId);

  res.json({ seats });
});

// POST /api/seats/lock — lock one or more seats for a user
router.post('/lock', (req, res) => {
  const db = getDb();
  const { sessionId, seatIds, userToken } = req.body;

  if (!sessionId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({ error: 'sessionId and seatIds array required' });
  }

  const token = userToken || uuidv4();
  const heldUntil = new Date(Date.now() + HOLD_MINUTES * 60 * 1000).toISOString();

  const results = [];
  db.exec('BEGIN');
  try {
    for (const seatId of seatIds) {
      const seat = db.prepare(
        `SELECT * FROM seats WHERE id=? AND session_id=?`
      ).get(seatId, sessionId);

      if (!seat) {
        results.push({ seatId, success: false, reason: 'Seat not found' });
        continue;
      }
      if (seat.status === 'held' && seat.held_by !== token) {
        results.push({ seatId, success: false, reason: 'Already held by another user' });
        continue;
      }
      if (seat.status === 'sold') {
        results.push({ seatId, success: false, reason: 'Seat already sold' });
        continue;
      }

      db.prepare(
        `UPDATE seats SET status='held', held_by=?, held_until=? WHERE id=?`
      ).run(token, heldUntil, seatId);

      results.push({ seatId, success: true });
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Failed to lock seats' });
  }

  const allLocked = results.every(r => r.success);

  // Broadcast update via WebSocket
  const wss = req.app.get('wss');
  if (wss) broadcastSeatUpdate(wss, sessionId);

  // Return `userToken` (matches frontend expectation) AND `token` for compatibility
  res.json({ userToken: token, token, heldUntil, results, allLocked });
});

// DELETE /api/seats/lock — release held seats for a user token
router.delete('/lock', (req, res) => {
  const db = getDb();
  const { sessionId, seatIds, userToken } = req.body;

  if (!sessionId || !userToken) {
    return res.status(400).json({ error: 'sessionId and userToken required' });
  }

  if (seatIds && Array.isArray(seatIds) && seatIds.length > 0) {
    const placeholders = seatIds.map(() => '?').join(',');
    db.prepare(`
      UPDATE seats SET status='vacant', held_by=NULL, held_until=NULL
      WHERE session_id=? AND held_by=? AND id IN (${placeholders}) AND status='held'
    `).run(sessionId, userToken, ...seatIds);
  } else {
    db.prepare(`
      UPDATE seats SET status='vacant', held_by=NULL, held_until=NULL
      WHERE session_id=? AND held_by=? AND status='held'
    `).run(sessionId, userToken);
  }

  const wss = req.app.get('wss');
  if (wss) broadcastSeatUpdate(wss, sessionId);

  res.json({ success: true });
});

// Helper: broadcast full seat list to all subscribed WebSocket clients
function broadcastSeatUpdate(wss, sessionId) {
  const db = getDb();
  const seats = db.prepare(`
    SELECT s.id, s.table_id, s.seat_position, s.status, s.held_by, s.held_until,
           rt.table_number, rt.section
    FROM seats s JOIN room_tables rt ON rt.id = s.table_id
    WHERE s.session_id = ?
    ORDER BY rt.table_number, s.seat_position
  `).all(sessionId);

  const msg = JSON.stringify({ type: 'seat_update', sessionId: parseInt(sessionId), seats });

  wss.clients.forEach(client => {
    if (client.readyState === 1 && client.subscribedSession == sessionId) {
      client.send(msg);
    }
  });
}

module.exports = router;
module.exports.broadcastSeatUpdate = broadcastSeatUpdate;
