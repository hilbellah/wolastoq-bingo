import { useState, useEffect, useRef, useCallback } from 'react';
import Header from './Header';
import SeatMap from './SeatMap';
import TableLayout from './TableLayout';
import AttendeeForms from './AttendeeForms';
import HoldTimer from './HoldTimer';
import OrderSummary from './OrderSummary';
import PaymentForm from './PaymentForm';
import Confirmation from './Confirmation';
import {
  getSessions, getSeats, getPackages,
  lockSeats, releaseSeats, createBooking,
  createSeatSocket,
} from '../api';

const makeAttendee = () => ({ firstName: '', lastName: '', optionals: [] });

// ── Right-side booking panel ──────────────────────────────────────────────────
function BookingPanel({
  session, packages,
  attendees, setAttendees,
  selectedSeats,
  holdExpiry, onHoldExpired,
  onPay, payLoading, booking, error,
}) {
  // Steps: names | payment | confirm
  // Party size is driven by how many chairs the user clicked — no manual selector.
  const [step, setStep] = useState('names');

  const requiredPkg  = packages.find(p => p.type === 'required');
  const optionalPkgs = packages.filter(p => p.type === 'optional');
  const count = selectedSeats.length;

  useEffect(() => { if (booking) setStep('confirm'); }, [booking]);
  useEffect(() => { if (!booking) setStep('names'); }, [session?.id]);

  // Auto-grow / shrink attendee rows to match selected seat count
  useEffect(() => {
    setAttendees(prev => {
      if (prev.length === count) return prev;
      const next = prev.slice(0, count);
      while (next.length < count) next.push(makeAttendee());
      return next;
    });
  }, [count]);

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 px-4 text-slate-400">
        <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <p className="font-semibold text-slate-500">Select a bingo night</p>
        <p className="text-sm mt-1">Choose a date above to see available seats</p>
      </div>
    );
  }

  const dateStr = new Date(session.date + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Session info */}
      <div className="bg-orange text-white rounded-xl p-4">
        <p className="font-extrabold text-sm">{dateStr}</p>
        <p className="text-xs text-white/60 mt-0.5">
          Doors {session.doors_open} · Game {session.time} · 385 Wilsey Rd, Fredericton
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex gap-2">
          <span>⚠️</span><span>{error}</span>
        </div>
      )}

      {/* Hold timer */}
      {holdExpiry && count > 0 && step !== 'confirm' && (
        <HoldTimer expiry={holdExpiry} onExpired={onHoldExpired} />
      )}

      {/* Step tabs (not on confirm) */}
      {step !== 'confirm' && (
        <div className="flex border-b border-slate-100 text-xs font-semibold">
          {[['names','1. Details'], ['payment','2. Payment']].map(([s, label], i) => {
            const currentIdx = ['names','payment'].indexOf(step);
            return (
              <button key={s}
                disabled={i > currentIdx}
                onClick={() => i < currentIdx && setStep(s)}
                className={`flex-1 py-2 border-b-2 transition-colors
                  ${step === s ? 'border-orange text-orange' :
                    i < currentIdx ? 'border-transparent text-slate-400 hover:text-slate-600 cursor-pointer' :
                    'border-transparent text-slate-300 cursor-default'}`}>
                {i < currentIdx ? '✓ ' : ''}{label.replace(/^\d\. /, '')}
              </button>
            );
          })}
        </div>
      )}

      {/* ── No seats yet — prompt user ── */}
      {step === 'names' && count === 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 text-center">
          <p className="font-semibold mb-1">Click a table on the map →</p>
          <p className="text-xs">Then click chairs to add people to your booking. Each chair = one person.</p>
        </div>
      )}

      {/* ── Seats selected — show count + forms ── */}
      {step === 'names' && count > 0 && (
        <>
          {/* Selected seat chips */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              {count} chair{count > 1 ? 's' : ''} selected
            </p>
            {selectedSeats.map((seat, i) => (
              <div key={seat.id}
                className="flex items-center gap-2 text-xs font-semibold text-blue-700
                           bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center
                                 justify-center text-[10px] font-black flex-shrink-0">{i + 1}</span>
                Table {seat.table_number}, Chair {seat.seat_position}
                <span className="ml-auto text-[10px] text-blue-400">Person {i + 1}</span>
              </div>
            ))}
          </div>

          <AttendeeForms
            attendees={attendees}
            requiredPkg={requiredPkg}
            optionalPkgs={optionalPkgs}
            onComplete={updated => { setAttendees(updated); setStep('payment'); }}
          />
        </>
      )}

      {/* ── STEP: PAYMENT ── */}
      {step === 'payment' && (
        <div className="space-y-4">
          <OrderSummary
            session={session}
            attendees={attendees}
            selectedSeats={selectedSeats}
            requiredPkg={requiredPkg}
            optionalPkgs={optionalPkgs}
          />
          <PaymentForm onSubmit={onPay} loading={payLoading} />
        </div>
      )}

      {/* ── CONFIRMATION ── */}
      {step === 'confirm' && <Confirmation booking={booking} />}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BookingPage() {
  const [sessions, setSessions]               = useState([]);
  const [packages, setPackages]               = useState([]);
  const [allSeats, setAllSeats]               = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [activeTable, setActiveTable]         = useState(null);
  const [attendees, setAttendees]             = useState([]);
  const [selectedSeats, setSelectedSeats]     = useState([]);
  const [userToken, setUserToken]             = useState(null);
  const [holdExpiry, setHoldExpiry]           = useState(null);
  const [booking, setBooking]                 = useState(null);
  const [seatLoading, setSeatLoading]         = useState(false);
  const [payLoading, setPayLoading]           = useState(false);
  const [error, setError]                     = useState('');
  const [expandedMonths, setExpandedMonths]   = useState(null); // null = init pending
  const wsRef = useRef(null);
  const tableSectionRef = useRef(null);

  useEffect(() => {
    getSessions().then(d => setSessions(d.sessions || [])).catch(() => {});
    getPackages().then(d => setPackages(d.packages || [])).catch(() => {});
  }, []);

  // Release holds on tab close
  useEffect(() => {
    const release = () => {
      if (userToken && selectedSeats.length > 0 && selectedSession) {
        navigator.sendBeacon('/api/seats/release',
          new Blob([JSON.stringify({ userToken, sessionId: selectedSession.id })],
          { type: 'application/json' }));
      }
    };
    window.addEventListener('beforeunload', release);
    return () => window.removeEventListener('beforeunload', release);
  }, [userToken, selectedSeats, selectedSession]);

  const selectSession = useCallback((session) => {
    setSelectedSession(session);
    setAllSeats([]);
    setSelectedSeats([]);
    setBooking(null);
    setAttendees([]);
    setUserToken(null);
    setHoldExpiry(null);
    setActiveTable(null);
    setError('');

    if (wsRef.current) wsRef.current.close();

    setSeatLoading(true);
    getSeats(session.id)
      .then(d => setAllSeats(d.seats || []))
      .catch(() => setError('Could not load seats. Please try again.'))
      .finally(() => setSeatLoading(false));

    const ws = createSeatSocket((msg) => {
      if (msg.type === 'seat_update' && msg.sessionId === session.id) {
        setAllSeats(msg.seats || []);
      }
    });
    ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', sessionId: session.id }));
    wsRef.current = ws;
  }, []);

  // Clicking a table in the hall map → open its chair layout
  const handleTableSelect = useCallback((tableNum) => {
    setActiveTable(prev => prev === tableNum ? null : tableNum);
    setError('');
    // Scroll to the table layout section
    setTimeout(() => {
      tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }, []);

  // Clicking a chair in TableLayout — lock/unlock seat
  // Party size is auto-derived from how many chairs are selected; no manual limit.
  const handleSeatToggle = async (seat) => {
    if (!selectedSession) return;
    setError('');
    const isSelected = selectedSeats.some(s => s.id === seat.id);

    if (isSelected) {
      // Deselect — remove this chair
      const next = selectedSeats.filter(s => s.id !== seat.id);
      setSelectedSeats(next);
      if (next.length === 0 && userToken) {
        try { await releaseSeats({ userToken, sessionId: selectedSession.id }); } catch {}
        setUserToken(null); setHoldExpiry(null);
      } else if (next.length > 0 && userToken) {
        try {
          const res = await lockSeats({
            sessionId: selectedSession.id,
            seatIds: next.map(s => s.id),
            userToken,
          });
          setHoldExpiry(res.heldUntil);
        } catch {}
      }
    } else {
      // Select — add this chair (no upper limit; each chair = one person)
      const next = [...selectedSeats, seat];
      setSeatLoading(true);
      try {
        const res = await lockSeats({
          sessionId: selectedSession.id,
          seatIds: next.map(s => s.id),
          userToken: userToken || undefined,
        });
        setSelectedSeats(next);
        setUserToken(res.userToken);
        setHoldExpiry(res.heldUntil);
      } catch (err) {
        setError(err.message || 'That chair just got taken. Try another.');
      } finally {
        setSeatLoading(false);
      }
    }
  };

  const handleHoldExpired = () => {
    setSelectedSeats([]); setUserToken(null); setHoldExpiry(null);
    setError('⏰ Your hold expired. Please select your chairs again.');
    if (selectedSession) getSeats(selectedSession.id).then(d => setAllSeats(d.seats || [])).catch(() => {});
  };

  const handlePay = async (paymentData) => {
    setPayLoading(true); setError('');
    try {
      const reqPkg  = packages.find(p => p.type === 'required');
      const optPkgs = packages.filter(p => p.type === 'optional');
      const res = await createBooking({
        sessionId: selectedSession.id,
        userToken,
        email: paymentData.email,
        attendees: attendees.map((a, i) => ({
          firstName: a.firstName,
          lastName:  a.lastName,
          seatId:    selectedSeats[i]?.id,
          packageId: reqPkg?.id,
          optionals: (a.optionals || []).map(o => {
            const p = optPkgs.find(p => p.id === o.packageId);
            return { packageId: o.packageId, quantity: o.quantity, price: p?.price || 0 };
          }),
        })),
      });
      setBooking({ ...res.booking, session: selectedSession, email: paymentData.email });
    } catch (err) {
      setError(err.message || 'Booking failed. Please try again.');
    } finally {
      setPayLoading(false);
    }
  };

  // Active table's seats
  const activeTableSeats = activeTable
    ? allSeats.filter(s => s.table_number === activeTable)
              .sort((a, b) => a.seat_position - b.seat_position)
    : [];

  return (
    <div className="min-h-screen bg-slate-100">
      <Header />

      <main className="max-w-[1400px] mx-auto px-4 py-6">

        {/* ── DATE PICKER ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-orange">Select a Bingo Night</h2>
              <p className="text-xs text-slate-400 mt-0.5">Pick a date — the seat map updates instantly</p>
            </div>
            {sessions.length > 0 && (
              <span className="text-xs text-slate-400 font-medium">{sessions.length} upcoming nights</span>
            )}
          </div>

          {sessions.length === 0 ? (
            <p className="text-sm text-slate-400 animate-pulse py-2">Loading sessions…</p>
          ) : (() => {
            // Group sessions by "Month Year"
            const groups = [];
            let lastKey = null;
            for (const s of sessions) {
              const d = new Date(s.date + 'T12:00:00');
              const key = d.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
              if (key !== lastKey) { groups.push({ key, sessions: [] }); lastKey = key; }
              groups[groups.length - 1].sessions.push(s);
            }

            // Init: first month open, rest closed (run once after groups are built)
            const firstKey = groups[0]?.key;
            const expanded = expandedMonths ?? new Set([firstKey]);
            if (expandedMonths === null && firstKey) {
              // Defer to avoid setState-during-render
              setTimeout(() => setExpandedMonths(new Set([firstKey])), 0);
            }

            // Auto-expand the month containing the selected session
            if (selectedSession) {
              const sd = new Date(selectedSession.date + 'T12:00:00');
              const selKey = sd.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
              if (!expanded.has(selKey)) expanded.add(selKey);
            }

            const toggleMonth = (key) => {
              setExpandedMonths(prev => {
                const next = new Set(prev ?? [firstKey]);
                next.has(key) ? next.delete(key) : next.add(key);
                return next;
              });
            };

            return (
              <div className="space-y-2">
                {groups.map((group, gi) => {
                  const isOpen = expanded.has(group.key);
                  const hasSelected = group.sessions.some(s => s.id === selectedSession?.id);
                  return (
                    <div key={group.key} className="border border-slate-100 rounded-xl overflow-hidden">
                      {/* Month header — clickable to expand/collapse */}
                      <button
                        onClick={() => toggleMonth(group.key)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            {group.key}
                          </span>
                          {hasSelected && (
                            <span className="text-[10px] font-bold text-orange bg-orange/10 px-2 py-0.5 rounded-full">
                              selected
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">{group.sessions.length} nights</span>
                          <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Date cards — only shown when expanded */}
                      {isOpen && (
                        <div className="px-3 pb-3 pt-1">
                          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                            {group.sessions.map(session => {
                              const d = new Date(session.date + 'T12:00:00');
                              const isSelected = selectedSession?.id === session.id;
                              const isFull     = (session.available_seats || 0) === 0;
                              const sold       = (session.total_seats || 0) - (session.available_seats || 0);
                              const pct        = session.total_seats > 0
                                ? Math.round(sold / session.total_seats * 100) : 0;
                              return (
                                <button key={session.id} disabled={isFull} onClick={() => selectSession(session)}
                                  className={`rounded-xl border-2 px-3 py-2 text-left transition-all flex-shrink-0 w-[100px]
                                    ${isSelected
                                      ? 'bg-orange border-orange text-white shadow-md'
                                      : isFull
                                      ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
                                      : 'bg-white border-slate-200 hover:border-orange/40 hover:shadow-sm cursor-pointer'}`}>
                                  <p className={`text-[10px] font-bold uppercase tracking-wide
                                    ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>
                                    {d.toLocaleDateString('en-CA', { weekday: 'short' })}
                                  </p>
                                  <p className={`text-xl font-extrabold leading-tight ${isSelected ? 'text-white' : 'text-orange'}`}>
                                    {d.getDate()} <span className="text-sm font-semibold">
                                      {d.toLocaleDateString('en-CA', { month: 'short' })}
                                    </span>
                                  </p>
                                  <p className={`text-[11px] font-medium mt-0.5
                                    ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>{session.time}</p>
                                  <div className={`w-full rounded-full h-1 mt-1.5 ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>
                                    <div className={`h-1 rounded-full ${isSelected ? 'bg-gold' : pct >= 80 ? 'bg-red-400' : 'bg-orange/40'}`}
                                      style={{ width: `${pct}%` }} />
                                  </div>
                                  <p className={`text-[10px] font-semibold mt-0.5
                                    ${isSelected ? 'text-white/60' : isFull ? 'text-red-500'
                                    : (session.available_seats || 0) <= 10 ? 'text-amber-600' : 'text-green-600'}`}>
                                    {isFull ? 'SOLD OUT' : `${session.available_seats} open`}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* ── TWO-COLUMN LAYOUT ── */}
        <div className="flex gap-5 items-start flex-col xl:flex-row">

          {/* LEFT: Hall map + Table Layout */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Hall Map */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-base font-extrabold text-orange">
                  {selectedSession
                    ? `Seat Map — ${new Date(selectedSession.date + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}`
                    : 'Seat Map'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedSession
                    ? 'Click any table to see its chairs. Then pick your seat.'
                    : 'Select a date above to see the live seat map.'}
                </p>
              </div>

              {selectedSession ? (
                <SeatMap
                  allSeats={allSeats}
                  activeTable={activeTable}
                  onTableSelect={handleTableSelect}
                  selectedSeats={selectedSeats}
                  loading={seatLoading}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-200 select-none">
                  <svg className="w-20 h-20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                      d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/>
                  </svg>
                  <p className="text-slate-300 font-semibold text-sm">Choose a date to see the seat map</p>
                </div>
              )}
            </div>

            {/* Table Layout — shown when a table is selected */}
            {activeTable && activeTableSeats.length > 0 && (
              <div ref={tableSectionRef}
                className="bg-white rounded-2xl border-2 border-orange/20 p-5 shadow-sm">
                <TableLayout
                  tableNum={activeTable}
                  seats={activeTableSeats}
                  selectedIds={selectedSeats.map(s => s.id)}
                  userToken={userToken}
                  onSeatToggle={handleSeatToggle}
                />
              </div>
            )}

          </div>

          {/* RIGHT: Booking Panel (sticky) */}
          <div className="w-full xl:w-[380px] xl:sticky xl:top-4 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-base font-extrabold text-orange mb-4">
                {booking ? '🎉 Booking Confirmed!' : 'Your Booking'}
              </h2>
              <BookingPanel
                session={selectedSession}
                packages={packages}
                attendees={attendees}
                setAttendees={setAttendees}
                selectedSeats={selectedSeats}
                holdExpiry={holdExpiry}
                onHoldExpired={handleHoldExpired}
                onPay={handlePay}
                payLoading={payLoading}
                booking={booking}
                error={error}
              />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
