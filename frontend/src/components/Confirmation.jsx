export default function Confirmation({ booking }) {
  if (!booking) return null;

  const handlePrint = () => window.print();

  return (
    <div className="max-w-xl mx-auto">
      {/* Success Banner */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-extrabold text-navy mb-1">Booking Confirmed!</h2>
        <p className="text-slate-500 text-sm">Your seats have been reserved. See you at Bingo Night!</p>
      </div>

      {/* Reference card */}
      <div className="bg-navy text-white rounded-2xl p-5 mb-5 text-center">
        <p className="text-xs uppercase tracking-widest text-navy-light/70 mb-1">Booking Reference</p>
        <p className="text-3xl font-black tracking-wider">{booking.reference}</p>
        <p className="text-xs text-white/60 mt-2">Show this at the door or bring your confirmation email</p>
      </div>

      {/* Event details */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-4">
        <h3 className="font-bold text-navy text-sm uppercase tracking-wide mb-3">Event Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Event</span>
            <span className="font-semibold text-slate-700">Bingo Night — St. Mary's Entertainment Centre</span>
          </div>
          {booking.session && (
            <>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold text-slate-700">
                  {new Date(booking.session.date + 'T12:00:00').toLocaleDateString('en-CA', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Game Time</span>
                <span className="font-semibold text-slate-700">{booking.session.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Doors Open</span>
                <span className="font-semibold text-slate-700">{booking.session.doors_open}</span>
              </div>
            </>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Venue</span>
            <span className="font-semibold text-slate-700">385 Wilsey Rd, Fredericton, NB</span>
          </div>
        </div>
      </div>

      {/* Seats & attendees */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-4">
        <h3 className="font-bold text-navy text-sm uppercase tracking-wide mb-3">Your Seats</h3>
        <div className="space-y-3">
          {(booking.items || []).map((item, i) => (
            <div key={i} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0">
              <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-700 text-sm">{item.firstName} {item.lastName}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {item.seat ? `Table ${item.seat.table_number}, Seat ${item.seat.seat_position}` : 'Seat assigned at door'}
                </p>
                <p className="text-xs text-slate-400 mt-1">{item.packageName}</p>
              </div>
              <span className="text-sm font-semibold text-navy">${(item.lineTotal || 0).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-3 pt-3 border-t border-slate-200 space-y-1">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span>${((booking.totalAmount || 0) - 3).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>Convenience Fee</span>
            <span>$3.00</span>
          </div>
          <div className="flex justify-between font-extrabold text-navy text-base border-t border-slate-200 pt-2 mt-1">
            <span>Total Paid</span>
            <span>${(booking.totalAmount || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Contact/receipt */}
      {booking.email && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-700 flex gap-2">
          <span>📧</span>
          <span>A confirmation receipt has been sent to <strong>{booking.email}</strong></span>
        </div>
      )}

      {/* Venue info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-xs text-amber-800">
        <p className="font-bold mb-1">📍 Getting Here</p>
        <p>St. Mary's Entertainment Centre — 385 Wilsey Rd, Fredericton, NB E3B 5N6</p>
        <p className="mt-1">Please arrive by doors open time to collect your bingo books. <strong>No refunds</strong> — seats may be transferred.</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handlePrint}
          className="flex-1 btn-outline flex items-center justify-center gap-2"
        >
          🖨️ Print Ticket
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="flex-1 btn-primary"
        >
          Book Another Session
        </button>
      </div>
    </div>
  );
}
