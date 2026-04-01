# Wolastoq Bingo — Online Seat Reservation System

Online ticketing and seat booking system for St. Mary's Entertainment Centre (SMEC), Fredericton, NB.

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express + better-sqlite3 + WebSockets
- **Database**: SQLite (single `.db` file, no external DB required)

---

## Quick Start

### 1. Install dependencies

```bash
npm install           # installs concurrently at root
npm run install:all   # installs backend + frontend packages
```

### 2. Configure environment

```bash
cp .env.example backend/.env
# Edit backend/.env if needed (change JWT_SECRET for production)
```

### 3. Seed the database

```bash
npm run seed
```

This creates upcoming bingo sessions, 12 tables (73 seats), and 2 ticket packages.

### 4. Start development servers

```bash
npm run dev
```

This runs the backend on **http://localhost:3001** and the frontend on **http://localhost:5173** concurrently.

---

## URLs

| URL | Description |
|-----|-------------|
| http://localhost:5173/ | Customer booking page |
| http://localhost:5173/admin/login | Admin login |
| http://localhost:5173/admin | Admin dashboard |

---

## Admin Login

Default credentials (change in `backend/.env`):

- **Username**: `admin`
- **Password**: `bingo2024`

---

## Project Structure

```
wolastoq-bingo/
├── backend/
│   ├── db.js              # SQLite schema + connection
│   ├── seed.js            # Database seeder
│   ├── server.js          # Express + WebSocket server
│   ├── routes/
│   │   ├── sessions.js    # GET /api/sessions
│   │   ├── seats.js       # GET/POST/DELETE /api/seats
│   │   ├── bookings.js    # POST/GET /api/bookings
│   │   └── admin.js       # /api/admin/* (JWT protected)
│   ├── package.json
│   └── .env               # (create from .env.example)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js         # All API + WebSocket calls
│   │   ├── roomLayout.js  # Table/seat layout definitions
│   │   ├── index.css      # Tailwind + custom styles
│   │   └── components/
│   │       ├── BookingPage.jsx      # Main booking page
│   │       ├── Header.jsx
│   │       ├── SessionPicker.jsx
│   │       ├── PartySizePicker.jsx
│   │       ├── AttendeeForms.jsx
│   │       ├── SeatMap.jsx          # Always-visible seat map
│   │       ├── HoldTimer.jsx
│   │       ├── OrderSummary.jsx
│   │       ├── PaymentForm.jsx
│   │       ├── Confirmation.jsx
│   │       └── admin/
│   │           ├── AdminLogin.jsx
│   │           ├── AdminLayout.jsx
│   │           ├── Dashboard.jsx
│   │           ├── BookingsReport.jsx
│   │           ├── SessionsManager.jsx
│   │           └── PackagesManager.jsx
│   └── package.json
│
├── package.json       # Root: concurrently dev script
├── .env.example
└── README.md
```

---

## Features

### Customer Booking
- Single scrolling page — no confusing multi-step wizards
- Live seat map with real-time availability (WebSocket)
- 10-minute seat hold timer with visual countdown
- Per-attendee ticket packages + optional add-ons
- Order summary with convenience fee breakdown
- Confirmation page with printable receipt

### Admin Panel
- Dashboard with today's stats and upcoming session fill rates
- Bookings report — search by name/email/reference, filter by session, CSV export
- Sessions manager — add, edit, activate/deactivate bingo nights
- Packages manager — manage ticket types and pricing

---

## Packages / Pricing (default)

| Package | Type | Price |
|---------|------|-------|
| 12up / Toonie Package | Required | $18.00 |
| 3 Special Books (1 Free) | Optional | $14.00 |

Convenience fee: **$3.00** per booking.

---

## Payment

Payment processing is not yet integrated. The `PaymentForm` component collects card details for UI demonstration only. Stripe or another processor will be connected in a future phase.
