const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { v4: uuidv4 } = require('uuid');
const { broadcastSeatUpdate } = require('./seats');

const CONVENIENCE_FEE = 3.00;

// POST /api/bookings — confirm a booking (converts held seats → sold)
router.post('/', (req, res) => {
  const db = getDb();
  // Accept `email` or `customerEmail`
  const { sessionId, userToken, attendees, email, customerEmail } = req.body;
  const custEmail = email || customerEmail || null;

  if (!sessionId || !userToken || !attendees || !Array.isArray(attendees)) {
    return res.status(400).json({ error: 'sessionId, userToken, and attendees are required' });
  }

  // Validate all held seats belong to this token
  for (const a of attendees) {
    const seat = db.prepare(
      `SELECT * FROM seats WHERE id=? AND session_id=? AND held_by=? AND status='held'`
    ).get(a.seatId, sessionId, userToken);

    if (!seat) {
      return res.status(409).json({
        error: `Seat ${a.seatId} is no longer available. Please select seats again.`,
      });
    }
  }

  // Get required package
  const reqPkg = db.prepare(`SELECT * FROM packages WHERE type='required' AND is_active=1 LIMIT 1`).get();
  if (!reqPkg) return res.status(500).json({ error: 'No required package configured' });

  db.exec('BEGIN');
  try {
    let totalAmount = 0;

    // Calculate total
    for (const a of attendees) {
      totalAmount += reqPkg.price;
      if (a.optionals) {
        for (const opt of a.optionals) {
          const pkg = db.prepare(`SELECT * FROM packages WHERE id=?`).get(opt.packageId);
          if (pkg) totalAmount += pkg.price * opt.quantity;
        }
      }
    }

    const grandTotal = totalAmount + CONVENIENCE_FEE;
    const refNumber  = 'BNG-' + uuidv4().substring(0, 8).toUpperCase();

    // Create booking record
    const bookingResult = db.prepare(`
      INSERT INTO bookings
        (reference_number, session_id, total_amount, convenience_fee, grand_total, payment_status, customer_email)
      VALUES (?,?,?,?,?,'completed',?)
    `).run(refNumber, sessionId, totalAmount, CONVENIENCE_FEE, grandTotal, custEmail);

    const bookingId = bookingResult.lastInsertRowid;

    // Create booking items and mark seats as sold
    for (const a of attendees) {
      let subtotal = reqPkg.price;
      if (a.optionals) {
        for (const opt of a.optionals) {
          const pkg = db.prepare(`SELECT * FROM packages WHERE id=?`).get(opt.packageId);
          if (pkg) subtotal += pkg.price * opt.quantity;
        }
      }

      const itemResult = db.prepare(`
        INSERT INTO booking_items
          (booking_id, attendee_first_name, attendee_last_name, seat_id, required_package_id, subtotal)
        VALUES (?,?,?,?,?,?)
      `).run(bookingId, a.firstName, a.lastName, a.seatId, reqPkg.id, subtotal);

      const itemId = itemResult.lastInsertRowid;

      // Add optional items
      if (a.optionals) {
        for (const opt of a.optionals) {
          const pkg = db.prepare(`SELECT * FROM packages WHERE id=?`).get(opt.packageId);
          if (pkg) {
            db.prepare(`
              INSERT INTO optional_items (booking_item_id, package_id, quantity, price)
              VALUES (?,?,?,?)
            `).run(itemId, opt.packageId, opt.quantity, pkg.price * opt.quantity);
          }
        }
      }

      // Mark seat as sold
      db.prepare(`
        UPDATE seats SET status='sold', held_by=NULL, held_until=NULL WHERE id=?
      `).run(a.seatId);
    }

    db.exec('COMMIT');

    // Broadcast updated seat map
    const wss = req.app.get('wss');
    if (wss) broadcastSeatUpdate(wss, sessionId);

    // Return full booking details wrapped in { booking: ... }
    const booking = getBookingDetails(db, refNumber);
    res.status(201).json({ booking });

  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Failed to create booking. Please try again.' });
  }
});

// GET /api/bookings/:reference — fetch booking confirmation details
router.get('/:reference', (req, res) => {
  const db = getDb();
  const booking = getBookingDetails(db, req.params.reference);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json({ booking });
});

function getBookingDetails(db, reference) {
  const booking = db.prepare(`
    SELECT b.*, s.date AS session_date, s.time AS session_time, s.doors_open
    FROM bookings b
    JOIN sessions s ON s.id = b.session_id
    WHERE b.reference_number = ?
  `).get(reference);

  if (!booking) return null;

  const items = db.prepare(`
    SELECT
      bi.id,
      bi.attendee_first_name AS firstName,
      bi.attendee_last_name  AS lastName,
      bi.subtotal            AS lineTotal,
      s.seat_position,
      rt.table_number,
      p.name                 AS packageName,
      p.price                AS packagePrice
    FROM booking_items bi
    JOIN seats s        ON s.id  = bi.seat_id
    JOIN room_tables rt ON rt.id = s.table_id
    JOIN packages p     ON p.id  = bi.required_package_id
    WHERE bi.booking_id = ?
  `).all(booking.id);

  for (const item of items) {
    item.seat = { table_number: item.table_number, seat_position: item.seat_position };
    item.optionals = db.prepare(`
      SELECT oi.*, p.name AS package_name
      FROM optional_items oi
      JOIN packages p ON p.id = oi.package_id
      WHERE oi.booking_item_id = ?
    `).all(item.id);
  }

  // Normalise field names for frontend
  return {
    reference:   booking.reference_number,
    totalAmount: booking.grand_total,
    items,
    session: {
      date:       booking.session_date,
      time:       booking.session_time,
      doors_open: booking.doors_open,
    },
    email: booking.customer_email,
    createdAt: booking.created_at,
  };
}

module.exports = router;
