/**
 * autoSeed.js — seeds the database on first boot if it is empty.
 *
 * Called from server.js at startup. Safe to call every time the server
 * starts: if sessions already exist the function returns immediately
 * without touching any data, so existing bookings are never lost.
 *
 * DigitalOcean App Platform has ephemeral storage, so bingo.db is wiped
 * on every deploy. This keeps the app usable right after each redeploy
 * without needing a manual `npm run seed` step.
 */

const { getDb } = require('./db');

function getUpcomingSessions(count = 7) {
  const sessions = [];
  const validDays = [2, 4, 5, 6, 0]; // Tue, Thu, Fri, Sat, Sun
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (sessions.length < count) {
    d.setDate(d.getDate() + 1);
    if (validDays.includes(d.getDay())) {
      sessions.push({
        date:       d.toISOString().split('T')[0],
        time:       '4:30 PM',
        doors_open: '4:00 PM',
        is_active:  1,
      });
    }
  }
  return sessions;
}

function autoSeed() {
  const db = getDb();

  const { sessionCount } = db.prepare('SELECT COUNT(*) AS sessionCount FROM sessions').get();
  const { pkgCount }     = db.prepare('SELECT COUNT(*) AS pkgCount FROM packages').get();

  // ── Always ensure ALL packages exist ──────────────────────────────────────
  // Full list from reference site. Re-seed if count is less than expected.
  const ALL_PACKAGES = [
    { name: '12up / Toonie',            price: 18.00, type: 'required', sort: 1,
      desc: '12-up Admission Book + Toonie Ball — required for every player' },
    { name: '3 Special Books (1 Free)', price: 14.00, type: 'optional', sort: 2,
      desc: 'Purchase 2 Special Books and get 1 Free' },
    { name: 'Single Special Book',      price:  7.00, type: 'optional', sort: 3,
      desc: 'Single Special Book' },
    { name: '6 up Admission Book',      price:  5.00, type: 'optional', sort: 4,
      desc: '6-up Admission Book' },
    { name: '3 up Admission Book',      price:  3.00, type: 'optional', sort: 5,
      desc: '3-up Admission Book' },
    { name: 'Letter "W"',               price:  2.00, type: 'optional', sort: 6,
      desc: 'Letter W special game' },
    { name: 'Mega Jackpot',             price:  2.00, type: 'optional', sort: 7,
      desc: 'Mega Jackpot game' },
    { name: 'Winner Take All',          price:  1.00, type: 'optional', sort: 8,
      desc: 'Winner Take All game' },
    { name: 'MP Book',                  price:  5.00, type: 'optional', sort: 9,
      desc: 'MP Book' },
  ];

  if (pkgCount < ALL_PACKAGES.length) {
    console.log(`📦  Only ${pkgCount}/${ALL_PACKAGES.length} packages found — re-seeding packages…`);
    db.prepare('DELETE FROM packages').run();
    const insertPkg = db.prepare(`
      INSERT INTO packages (name, price, type, description, is_active, sort_order)
      VALUES (?,?,?,?,1,?)
    `);
    for (const p of ALL_PACKAGES) insertPkg.run(p.name, p.price, p.type, p.desc, p.sort);
    console.log(`📦  ${ALL_PACKAGES.length} packages inserted`);
  }

  // Check if we already have sessions — if yes, nothing more to do
  if (sessionCount > 0) {
    console.log(`✅  DB already seeded (${sessionCount} sessions), skipping session auto-seed`);
    return;
  }

  console.log('🌱  Empty database detected — running auto-seed…');

  // ── Room tables ────────────────────────────────────────────────────────────
  // SMEC hall: 65 tables × 6 chairs = 390 seats
  // Present in floor plan: 1–33, 37–39, 42–45, 48–51, 55–75
  // Not in floor plan (aisles/stage): 34–36, 40–41, 46–47, 52–54
  const SKIP_TABLES = new Set([34, 35, 36, 40, 41, 46, 47, 52, 53, 54]);
  const insertTable = db.prepare(`
    INSERT INTO room_tables (table_number, capacity, section) VALUES (?,?,?)
  `);
  for (let n = 1; n <= 75; n++) {
    if (SKIP_TABLES.has(n)) continue;
    let section;
    if      (n <= 39) section = 'Main Floor';
    else if (n <= 51) section = 'Centre';
    else              section = 'Side Hall';
    insertTable.run(n, 6, section);
  }

  // ── Sessions + seats ───────────────────────────────────────────────────────
  const allTables    = db.prepare('SELECT * FROM room_tables').all();
  const insertSession = db.prepare(`
    INSERT INTO sessions (date, time, doors_open, cutoff_time, is_active)
    VALUES (?,?,?,?,?)
  `);
  const insertSeat = db.prepare(`
    INSERT INTO seats (session_id, table_id, seat_position, status)
    VALUES (?,?,'vacant')
  `);
  // Override the positional bind — seat_position is arg 3
  const insertSeatFull = db.prepare(`
    INSERT INTO seats (session_id, table_id, seat_position, status)
    VALUES (?,?,?,'vacant')
  `);

  const sessions = getUpcomingSessions(60);

  db.exec('BEGIN');
  try {
    for (const s of sessions) {
      const { lastInsertRowid: sessionId } =
        insertSession.run(s.date, s.time, s.doors_open, s.time, s.is_active);
      for (const table of allTables) {
        for (let pos = 1; pos <= table.capacity; pos++) {
          insertSeatFull.run(sessionId, table.id, pos);
        }
      }
      console.log(`  📅  ${s.date} @ ${s.time} — ${allTables.length * 6} seats`);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('❌  Auto-seed failed:', err.message);
    return;
  }

  const totalSeats = allTables.reduce((a, t) => a + t.capacity, 0);
  console.log(`✅  Auto-seed complete: ${sessions.length} sessions × ${totalSeats} seats`);
}

module.exports = { autoSeed };
