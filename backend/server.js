require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');
const { getDb } = require('./db');
const { autoSeed } = require('./autoSeed');

const app = express();
const server = http.createServer(app);

// ─── WebSocket Server ───────────────────────────────────────────────────────
const wss = new WebSocket.Server({ server });
app.set('wss', wss);

wss.on('connection', (ws) => {
  ws.subscribedSession = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'subscribe' && msg.sessionId) {
        ws.subscribedSession = msg.sessionId;
        ws.send(JSON.stringify({ type: 'subscribed', sessionId: msg.sessionId }));
      }
    } catch (e) { /* ignore malformed messages */ }
  });

  ws.on('error', () => {});
});

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/sessions',      require('./routes/sessions'));
app.use('/api/seats',         require('./routes/seats'));
app.use('/api/bookings',      require('./routes/bookings'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/packages', (req, res) => {
  const db = getDb();
  const packages = db.prepare('SELECT * FROM packages WHERE is_active=1 ORDER BY sort_order, type').all();
  res.json({ packages });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Background Job: release expired seat holds every 60 seconds ────────────
const HOLD_MINUTES = parseInt(process.env.SESSION_HOLD_MINUTES || '30');

setInterval(() => {
  const db = getDb();
  const now = new Date().toISOString();

  const expiredSeats = db.prepare(`
    SELECT DISTINCT session_id FROM seats
    WHERE status='held' AND held_until < ?
  `).all(now);

  if (expiredSeats.length === 0) return;

  db.prepare(`
    UPDATE seats SET status='vacant', held_by=NULL, held_until=NULL
    WHERE status='held' AND held_until < ?
  `).run(now);

  // Broadcast updates for affected sessions
  const { broadcastSeatUpdate } = require('./routes/seats');
  for (const { session_id } of expiredSeats) {
    broadcastSeatUpdate(wss, session_id);
  }
}, 30 * 1000); // every 30 seconds

// ─── Serve Frontend (production) ─────────────────────────────────────────────
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  // Pre-warm the database AND auto-seed if it's empty (ephemeral filesystem
  // on DigitalOcean App Platform wipes bingo.db on every deploy)
  try {
    autoSeed();
  } catch (e) {
    console.error('⚠️  Auto-seed error:', e.message);
  }

  console.log(`\n🎰  Wolastoq Bingo Backend running on http://localhost:${PORT}`);
  console.log(`🔌  WebSocket ready`);
  console.log(`⏱️   Seat hold duration: ${HOLD_MINUTES} minutes`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /api/sessions`);
  console.log(`  GET  /api/seats/:sessionId`);
  console.log(`  POST /api/seats/lock`);
  console.log(`  POST /api/bookings`);
  console.log(`  POST /api/admin/login`);
  console.log(`  GET  /api/admin/dashboard`);
  console.log(`  GET  /api/admin/bookings`);
  console.log(`  GET  /api/admin/bookings/export\n`);
});
