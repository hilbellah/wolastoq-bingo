const CONVENIENCE_FEE = 3.00;

export default function OrderSummary({ session, attendees, selectedSeats, requiredPkg, optionalPkgs = [] }) {
  if (!session || !attendees.length) return null;

  const dateObj = session ? new Date(session.date + 'T12:00:00') : null;
  const dateStr = dateObj?.toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Calculate per-person totals properly using real package data
  const getOptPkg = (pkgId) => optionalPkgs.find(p => p.id === pkgId);
  const personTotal = (a) => {
    const req = requiredPkg?.price || 0;
    const opts = (a.optionals || []).reduce((sum, o) => {
      const pkg = getOptPkg(o.packageId);
      return sum + (pkg ? pkg.price * o.quantity : 0);
    }, 0);
    return req + opts;
  };

  const subtotal = attendees.reduce((sum, a) => sum + personTotal(a), 0);

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-6">
      <h3 className="font-bold text-navy text-base mb-3">Booking Summary</h3>

      {/* Session info */}
      <div className="flex justify-between text-sm mb-3 pb-3 border-b border-slate-200">
        <div>
          <p className="font-semibold text-slate-700">{dateStr}</p>
          <p className="text-slate-400 text-xs">Bingo Night — {session.time} | Doors open {session.doors_open}</p>
        </div>
      </div>

      {/* Per-attendee breakdown */}
      {attendees.map((a, i) => {
        const seat = selectedSeats[i];
        const reqCost = requiredPkg?.price || 0;

        return (
          <div key={i} className="mb-3 pb-3 border-b border-slate-100 last:border-0">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-slate-700">
                {a.firstName} {a.lastName}
                {seat && <span className="text-xs text-slate-400 ml-2 font-normal">Table {seat.table_number}, Seat {seat.seat_position}</span>}
              </span>
              <span className="text-sm font-bold text-navy">${personTotal(a).toFixed(2)}</span>
            </div>
            <div className="mt-1 space-y-1 pl-2">
              {/* Required package */}
              <div className="flex justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="text-green-500">✓</span> {requiredPkg?.name}
                </span>
                <span>${reqCost.toFixed(2)}</span>
              </div>
              {/* Optional add-ons */}
              {(a.optionals || []).filter(o => o.quantity > 0).map(opt => {
                const pkg = getOptPkg(opt.packageId);
                const optCost = (pkg?.price || 0) * opt.quantity;
                return (
                  <div key={opt.packageId} className="flex justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="text-blue-400">+</span> {pkg?.name || 'Add-on'} ×{opt.quantity}
                    </span>
                    <span>${optCost.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Totals */}
      <div className="space-y-1.5 pt-2">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Subtotal ({attendees.length} {attendees.length === 1 ? 'person' : 'people'})</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>Convenience Fee</span>
          <span>${CONVENIENCE_FEE.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-extrabold text-navy text-lg border-t border-slate-200 pt-2 mt-2">
          <span>Grand Total</span>
          <span>${(subtotal + CONVENIENCE_FEE).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
