const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'smec-bingo-secret-key-change-in-production';
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'bingo2024';

// ─── Auth Middleware ────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.admin = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, username });
});

// GET /api/admin/dashboard
router.get('/dashboard', requireAuth, (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  // Find today's session
  const todaySession = db.prepare(
    `SELECT * FROM sessions WHERE date = ? AND is_active = 1 LIMIT 1`
  ).get(today);

  let todayData = {};
  if (todaySession) {
    const soldSeats = db.prepare(
      `SELECT COUNT(*) AS cnt FROM seats WHERE session_id=? AND status='sold'`
    ).get(todaySession.id);
    const heldSeats = db.prepare(
      `SELECT COUNT(*) AS cnt FROM seats WHERE session_id=? AND status='held'`
    ).get(todaySession.id);
    const totalSeats = db.prepare(
      `SELECT COUNT(*) AS cnt FROM seats WHERE session_id=?`
    ).get(todaySession.id);
    const bookingCount = db.prepare(
      `SELECT COUNT(*) AS cnt FROM bookings WHERE session_id=?`
    ).get(todaySession.id);
    const revenue = db.prepare(
      `SELECT COALESCE(SUM(grand_total),0) AS total FROM bookings WHERE session_id=?`
    ).get(todaySession.id);

    todayData = {
      sessionId:    todaySession.id,
      time:         todaySession.time,
      doors_open:   todaySession.doors_open,
      bookingCount: bookingCount.cnt,
      soldSeats:    soldSeats.cnt,
      heldSeats:    heldSeats.cnt,
      totalSeats:   totalSeats.cnt,
      revenue:      revenue.total,
    };
  }

  const upcomingSessions = db.prepare(`
    SELECT
      s.id, s.date, s.time, s.is_active,
      COUNT(CASE WHEN se.status='sold'   THEN 1 END) AS sold_seats,
      COUNT(CASE WHEN se.status='held'   THEN 1 END) AS held_seats,
      COUNT(se.id) AS total_seats,
      COUNT(DISTINCT b.id) AS booking_count,
      COALESCE(SUM(b.grand_total),0) AS total_revenue
    FROM sessions s
    LEFT JOIN seats se ON se.session_id = s.id
    LEFT JOIN bookings b ON b.session_id = s.id
    WHERE s.date >= ?
    GROUP BY s.id
    ORDER BY s.date
    LIMIT 8
  `).all(today);

  res.json({ today: todayData, upcomingSessions });
});

// GET /api/admin/sessions — wrapped in { sessions: [...] }
router.get('/sessions', requireAuth, (req, res) => {
  const db = getDb();
  const sessions = db.prepare(`
    SELECT
      s.*,
      COUNT(CASE WHEN se.status='vacant' THEN 1 END) AS available_seats,
      COUNT(CASE WHEN se.status='sold'   THEN 1 END) AS sold_seats,
      COUNT(CASE WHEN se.status='held'   THEN 1 END) AS held_seats,
      COUNT(se.id) AS total_seats,
      COUNT(DISTINCT b.id) AS booking_count,
      COALESCE(SUM(b.grand_total),0) AS total_revenue
    FROM sessions s
    LEFT JOIN seats se ON se.session_id = s.id
    LEFT JOIN bookings b ON b.session_id = s.id
    GROUP BY s.id
    ORDER BY s.date DESC
  `).all();
  res.json({ sessions });
});

// POST /api/admin/sessions
router.post('/sessions', requireAuth, (req, res) => {
  const db = getDb();
  const { date, time, doors_open, notes, is_active } = req.body;
  if (!date || !time) {
    return res.status(400).json({ error: 'date and time are required' });
  }

  db.exec('BEGIN');
  try {
    const sessionResult = db.prepare(`
      INSERT INTO sessions (date, time, doors_open, cutoff_time, is_active, notes)
      VALUES (?,?,?,?,?,?)
    `).run(
      date,
      time,
      doors_open || '17:00',
      time,  // default cutoff = game time
      is_active === false ? 0 : 1,
      notes || null
    );

    const sessionId = sessionResult.lastInsertRowid;

    // Create seats for all tables
    const tables = db.prepare('SELECT * FROM room_tables').all();
    for (const t of tables) {
      for (let pos = 1; pos <= t.capacity; pos++) {
        db.prepare(
          `INSERT INTO seats (session_id, table_id, seat_position, status) VALUES (?,?,?,'vacant')`
        ).run(sessionId, t.id, pos);
      }
    }

    db.exec('COMMIT');
    res.status(201).json({ id: sessionId, message: 'Session created' });
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// PUT /api/admin/sessions/:id
router.put('/sessions/:id', requireAuth, (req, res) => {
  const db = getDb();
  const { is_active, date, time, doors_open, notes } = req.body;
  db.prepare(`
    UPDATE sessions SET
      is_active  = COALESCE(?, is_active),
      date       = COALESCE(?, date),
      time       = COALESCE(?, time),
      doors_open = COALESCE(?, doors_open),
      notes      = COALESCE(?, notes)
    WHERE id = ?
  `).run(
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    date       ?? null,
    time       ?? null,
    doors_open ?? null,
    notes      ?? null,
    req.params.id
  );
  res.json({ success: true });
});

// GET /api/admin/bookings/export — CSV export (must be before /bookings route)
router.get('/bookings/export', requireAuth, (req, res) => {
  const db = getDb();
  const { sessionId, search } = req.query;

  let query = `
    SELECT
      b.reference_number        AS "Booking Ref",
      b.created_at              AS "Booked At",
      s.date                    AS "Session Date",
      s.time                    AS "Session Time",
      bi.attendee_first_name    AS "First Name",
      bi.attendee_last_name     AS "Last Name",
      rt.table_number           AS "Table",
      se.seat_position          AS "Seat",
      p.name                    AS "Package",
      p.price                   AS "Package Price",
      GROUP_CONCAT(op.name || ' x' || oi.quantity, ' | ') AS "Add-ons",
      bi.subtotal               AS "Subtotal",
      b.grand_total             AS "Grand Total",
      b.customer_email          AS "Email",
      b.payment_status          AS "Status"
    FROM bookings b
    JOIN sessions s       ON s.id  = b.session_id
    JOIN booking_items bi ON bi.booking_id = b.id
    JOIN seats se         ON se.id = bi.seat_id
    JOIN room_tables rt   ON rt.id = se.table_id
    JOIN packages p       ON p.id  = bi.required_package_id
    LEFT JOIN optional_items oi ON oi.booking_item_id = bi.id
    LEFT JOIN packages op ON op.id = oi.package_id
  `;

  const conditions = [];
  const params = [];
  if (sessionId) { conditions.push('b.session_id = ?'); params.push(sessionId); }
  if (search)    {
    conditions.push(`(bi.attendee_first_name LIKE ? OR bi.attendee_last_name LIKE ? OR b.reference_number LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' GROUP BY bi.id ORDER BY b.created_at DESC, rt.table_number, se.seat_position';

  const rows = db.prepare(query).all(...params);
  if (!rows.length) return res.status(404).json({ error: 'No bookings found' });

  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ];

  const filename = `bookings-${sessionId || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvLines.join('\n'));
});

// GET /api/admin/bookings — wrapped in { bookings: [...] }
router.get('/bookings', requireAuth, (req, res) => {
  const db = getDb();
  const { sessionId, search } = req.query;

  let query = `
    SELECT
      b.id,
      b.reference_number    AS reference,
      b.created_at,
      b.grand_total         AS total_amount,
      b.payment_status,
      b.customer_email      AS email,
      s.date                AS session_date,
      s.time                AS session_time,
      bi.attendee_first_name AS first_name,
      bi.attendee_last_name  AS last_name,
      rt.table_number,
      se.seat_position,
      p.name AS package_name
    FROM bookings b
    JOIN sessions s       ON s.id  = b.session_id
    JOIN booking_items bi ON bi.booking_id = b.id
    JOIN seats se         ON se.id = bi.seat_id
    JOIN room_tables rt   ON rt.id = se.table_id
    JOIN packages p       ON p.id  = bi.required_package_id
  `;

  const conditions = [];
  const params = [];
  if (sessionId) { conditions.push('b.session_id = ?'); params.push(sessionId); }
  if (search) {
    conditions.push(`(bi.attendee_first_name LIKE ? OR bi.attendee_last_name LIKE ? OR b.reference_number LIKE ? OR b.customer_email LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY b.created_at DESC, rt.table_number, se.seat_position';

  const rows = db.prepare(query).all(...params);

  // Group booking items under their parent booking
  const bookingMap = new Map();
  for (const row of rows) {
    if (!bookingMap.has(row.id)) {
      bookingMap.set(row.id, {
        id:           row.id,
        reference:    row.reference,
        created_at:   row.created_at,
        total_amount: row.total_amount,
        payment_status: row.payment_status,
        email:        row.email,
        session_date: row.session_date,
        session_time: row.session_time,
        first_name:   row.first_name,
        last_name:    row.last_name,
        items: [],
      });
    }
    bookingMap.get(row.id).items.push({
      firstName:     row.first_name,
      lastName:      row.last_name,
      seat_table:    row.table_number,
      seat_position: row.seat_position,
      package_name:  row.package_name,
    });
  }

  res.json({ bookings: Array.from(bookingMap.values()) });
});

// GET /api/admin/packages — wrapped in { packages: [...] }
router.get('/packages', requireAuth, (req, res) => {
  const db = getDb();
  res.json({ packages: db.prepare('SELECT * FROM packages ORDER BY type, sort_order, id').all() });
});

// POST /api/admin/packages
router.post('/packages', requireAuth, (req, res) => {
  const db = getDb();
  const { name, price, type, description, is_active, sort_order } = req.body;
  if (!name || price === undefined || !type) {
    return res.status(400).json({ error: 'name, price, type required' });
  }
  const result = db.prepare(`
    INSERT INTO packages (name, price, type, description, is_active, sort_order)
    VALUES (?,?,?,?,?,?)
  `).run(name, price, type, description || null, is_active !== false ? 1 : 0, sort_order || 99);
  res.status(201).json({ id: result.lastInsertRowid });
});

// PUT /api/admin/packages/:id
router.put('/packages/:id', requireAuth, (req, res) => {
  const db = getDb();
  const { name, price, description, is_active, sort_order } = req.body;
  db.prepare(`
    UPDATE packages SET
      name        = COALESCE(?, name),
      price       = COALESCE(?, price),
      description = COALESCE(?, description),
      is_active   = COALESCE(?, is_active),
      sort_order  = COALESCE(?, sort_order)
    WHERE id = ?
  `).run(
    name ?? null, price ?? null, description ?? null,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    sort_order ?? null,
    req.params.id
  );
  res.json({ success: true });
});

module.exports = router;
