require('dotenv').config();
const { getDb } = require('./db');

const db = getDb();

// ─── Clear existing data ───────────────────────────────────────────────────
db.exec(`
  DELETE FROM optional_items;
  DELETE FROM booking_items;
  DELETE FROM bookings;
  DELETE FROM seats;
  DELETE FROM sessions;
  DELETE FROM room_tables;
  DELETE FROM packages;
  DELETE FROM sqlite_sequence WHERE name IN ('optional_items','booking_items','bookings','seats','sessions','room_tables','packages');
`);
console.log('🗑️  Cleared existing data');

// ─── Packages ──────────────────────────────────────────────────────────────
const reqPkg = db.prepare(`
  INSERT INTO packages (name, price, type, description, is_active, sort_order) VALUES (?,?,?,?,1,?)
`).run('12up / Toonie', 18.00, 'required', '12-up Admission Book + Toonie Ball — required for every player', 1);

const optPkg = db.prepare(`
  INSERT INTO packages (name, price, type, description, is_active, sort_order) VALUES (?,?,?,?,1,?)
`).run('3 Special Books (1 Free)', 14.00, 'optional', 'Purchase 2 Special Books and get 1 Free', 1);

console.log('📦  Packages created');

// ─── Room Tables ───────────────────────────────────────────────────────────
// SMEC hall: each NUMBER in the floor map IS a table. 73 tables (1-75, skip 41 & 47).
// Every table has 6 chairs = 438 total seats.
const tableData = [];
for (let n = 1; n <= 75; n++) {
  if (n === 41 || n === 47) continue; // physical aisles, not tables
  let section;
  if      (n <= 24) section = 'Section A';
  else if (n <= 40) section = 'Section B';
  else if (n <= 46) section = 'Aisle';
  else              section = 'Section C';
  tableData.push({ table_number: n, capacity: 6, section });
}

const insertTable = db.prepare(`
  INSERT INTO room_tables (table_number, capacity, section) VALUES (?,?,?)
`);
for (const t of tableData) {
  insertTable.run(t.table_number, t.capacity, t.section);
}
console.log('🪑  Room tables created');

// ─── Sessions ──────────────────────────────────────────────────────────────
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

const allTables = db.prepare('SELECT * FROM room_tables').all();
const insertSession = db.prepare(`
  INSERT INTO sessions (date, time, doors_open, cutoff_time, is_active)
  VALUES (?,?,?,?,?)
`);
const insertSeat = db.prepare(`
  INSERT INTO seats (session_id, table_id, seat_position, status) VALUES (?,?,?,'vacant')
`);

const sessions = getUpcomingSessions(7);
const sessionIds = [];

db.exec('BEGIN');
try {
  for (const s of sessions) {
    const result = insertSession.run(s.date, s.time, s.doors_open, s.time, s.is_active);
    const sessionId = result.lastInsertRowid;
    for (const table of allTables) {
      for (let pos = 1; pos <= table.capacity; pos++) {
        insertSeat.run(sessionId, table.id, pos);
      }
    }
    sessionIds.push(sessionId);
    console.log(`📅  Session: ${s.date} @ ${s.time} (id=${sessionId})`);
  }
  db.exec('COMMIT');
} catch (err) {
  db.exec('ROLLBACK');
  console.error('Failed to create sessions:', err);
  process.exit(1);
}

// ─── Sample Bookings ───────────────────────────────────────────────────────
const firstSessionId = sessionIds[0];
const sampleSeats = db.prepare(`
  SELECT s.id FROM seats s
  WHERE s.session_id = ? AND s.status = 'vacant'
  LIMIT 5
`).all(firstSessionId);

const insertBooking = db.prepare(`
  INSERT INTO bookings (reference_number, session_id, total_amount, convenience_fee, grand_total, payment_status)
  VALUES (?,?,?,3.00,?,?)
`);
const insertItem = db.prepare(`
  INSERT INTO booking_items (booking_id, attendee_first_name, attendee_last_name, seat_id, required_package_id, subtotal)
  VALUES (?,?,?,?,?,?)
`);
const insertOptional = db.prepare(`
  INSERT INTO optional_items (booking_item_id, package_id, quantity, price) VALUES (?,?,?,?)
`);

db.exec('BEGIN');
try {
  // Booking 1: party of 3
  const total1 = (18 * 3) + (14 * 2);
  const ref1   = 'BNG-SAMPLE1';
  const b1     = insertBooking.run(ref1, firstSessionId, total1, total1 + 3.00, 'completed');
  const names1 = [['Linda','Savoie'],['Paul','Chiasson'],['Marie','Leblanc']];
  for (let i = 0; i < 3; i++) {
    const subtotal = 18 + (i < 2 ? 14 : 0);
    const item = insertItem.run(b1.lastInsertRowid, names1[i][0], names1[i][1], sampleSeats[i].id, reqPkg.lastInsertRowid, subtotal);
    if (i < 2) insertOptional.run(item.lastInsertRowid, optPkg.lastInsertRowid, 1, 14);
    db.prepare(`UPDATE seats SET status='sold' WHERE id=?`).run(sampleSeats[i].id);
  }
  console.log(`🎟️  Sample booking: ${ref1} (party of 3)`);

  // Booking 2: party of 2
  const total2 = 18 * 2;
  const ref2   = 'BNG-SAMPLE2';
  const b2     = insertBooking.run(ref2, firstSessionId, total2, total2 + 3.00, 'completed');
  const names2 = [['Robert','Gallant'],['Susan','Bourque']];
  for (let i = 0; i < 2; i++) {
    insertItem.run(b2.lastInsertRowid, names2[i][0], names2[i][1], sampleSeats[3 + i].id, reqPkg.lastInsertRowid, 18);
    db.prepare(`UPDATE seats SET status='sold' WHERE id=?`).run(sampleSeats[3 + i].id);
  }
  console.log(`🎟️  Sample booking: ${ref2} (party of 2)`);

  db.exec('COMMIT');
} catch (err) {
  db.exec('ROLLBACK');
  console.error('Failed to create sample bookings:', err);
  process.exit(1);
}

const totalSeats = allTables.reduce((a, t) => a + t.capacity, 0);
console.log('\n✅  Database seeded successfully!');
console.log(`   → ${sessions.length} sessions, ${totalSeats} seats each`);
console.log(`   → 2 packages (1 required, 1 optional)`);
console.log(`   → 2 sample bookings in session #1`);
console.log('\nNext: npm run dev');
