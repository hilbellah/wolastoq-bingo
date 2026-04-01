const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, 'bingo.db');
let db;

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA journal_mode=WAL");
    db.exec("PRAGMA foreign_keys=ON");
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      doors_open TEXT DEFAULT '17:00',
      cutoff_time TEXT DEFAULT '18:30',
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS room_tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number INTEGER NOT NULL UNIQUE,
      capacity INTEGER DEFAULT 6,
      section TEXT NOT NULL DEFAULT 'main'
    );

    CREATE TABLE IF NOT EXISTS seats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      table_id INTEGER NOT NULL,
      seat_position INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'vacant',
      held_by TEXT,
      held_until TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (table_id) REFERENCES room_tables(id),
      UNIQUE(session_id, table_id, seat_position)
    );

    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('required','optional')),
      description TEXT,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 99
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_number TEXT NOT NULL UNIQUE,
      session_id INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      convenience_fee REAL DEFAULT 3.00,
      grand_total REAL NOT NULL,
      payment_status TEXT DEFAULT 'completed',
      customer_email TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS booking_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      attendee_first_name TEXT NOT NULL,
      attendee_last_name TEXT NOT NULL,
      seat_id INTEGER NOT NULL,
      required_package_id INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (seat_id) REFERENCES seats(id),
      FOREIGN KEY (required_package_id) REFERENCES packages(id)
    );

    CREATE TABLE IF NOT EXISTS optional_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_item_id INTEGER NOT NULL,
      package_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      price REAL NOT NULL,
      FOREIGN KEY (booking_item_id) REFERENCES booking_items(id) ON DELETE CASCADE,
      FOREIGN KEY (package_id) REFERENCES packages(id)
    );

    CREATE INDEX IF NOT EXISTS idx_seats_session ON seats(session_id);
    CREATE INDEX IF NOT EXISTS idx_seats_status ON seats(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_session ON bookings(session_id);
    CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(booking_id);
  `);
}

module.exports = { getDb };
