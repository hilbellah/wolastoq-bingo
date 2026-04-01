import { useState, useEffect } from 'react';

/**
 * AttendeeForms — card-per-person layout.
 *
 * Each seat card:
 *   Row 1 : [ First Name input ] [ Last Name input ]
 *   Row 2 : Required package badge
 *   Row 3 : Optional Item select | Qty | + Add  (if optionals exist)
 *   Row 4 : Added optional chips
 */

export default function AttendeeForms({ attendees, requiredPkg, optionalPkgs, onComplete, readOnly }) {
  const [local, setLocal]           = useState(attendees);
  const [errors, setErrors]         = useState({});
  const [pendingOpt, setPendingOpt] = useState(() =>
    attendees.map(() => ({ pkgId: optionalPkgs[0]?.id ?? null, qty: 1 }))
  );

  useEffect(() => {
    setLocal(attendees);
    setPendingOpt(attendees.map(() => ({ pkgId: optionalPkgs[0]?.id ?? null, qty: 1 })));
  }, [attendees]);

  // ── helpers ────────────────────────────────────────────────────────────────
  const updateField = (i, field, val) => {
    setLocal(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: val } : a));
    setErrors(prev => ({ ...prev, [`${i}-${field}`]: '' }));
  };

  const addOptional = (i) => {
    const { pkgId, qty } = pendingOpt[i];
    if (!pkgId || qty <= 0) return;
    setLocal(prev => prev.map((a, idx) => {
      if (idx !== i) return a;
      const existing = a.optionals.find(o => o.packageId === pkgId);
      const optionals = existing
        ? a.optionals.map(o => o.packageId === pkgId ? { ...o, quantity: o.quantity + qty } : o)
        : [...a.optionals, { packageId: pkgId, quantity: qty }];
      return { ...a, optionals };
    }));
    setPendingOpt(prev => prev.map((p, idx) => idx === i ? { ...p, qty: 1 } : p));
  };

  const removeOptional = (i, pkgId) => {
    setLocal(prev => prev.map((a, idx) => {
      if (idx !== i) return a;
      return { ...a, optionals: a.optionals.filter(o => o.packageId !== pkgId) };
    }));
  };

  const setPending = (i, field, val) =>
    setPendingOpt(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));

  const personSubtotal = (a) => {
    const req = requiredPkg?.price || 0;
    return req + (a.optionals || []).reduce((sum, o) => {
      const pkg = optionalPkgs.find(p => p.id === o.packageId);
      return sum + (pkg ? pkg.price * o.quantity : 0);
    }, 0);
  };

  const grandTotal = local.reduce((s, a) => s + personSubtotal(a), 0);

  const validate = () => {
    const errs = {};
    local.forEach((a, i) => {
      if (!a.firstName.trim()) errs[`${i}-firstName`] = 'Required';
      if (!a.lastName.trim())  errs[`${i}-lastName`]  = 'Required';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleContinue = () => { if (validate()) onComplete(local); };

  return (
    <div className="space-y-3">
      {/* Instruction banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
        <strong>INSTRUCTION:</strong> Booking cuts off at 12:30 PM.
        {optionalPkgs.length > 0 && (
          <> To add Optional Items, select the item, set a Quantity, then click <strong>+ Add</strong>.</>
        )}
      </div>

      {/* One card per seat */}
      {local.map((attendee, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {/* Card header */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Seat {i + 1}</span>
          </div>

          <div className="px-4 py-3 space-y-3">
            {/* ── Row 1: Name inputs ── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  placeholder="First name"
                  value={attendee.firstName}
                  onChange={e => updateField(i, 'firstName', e.target.value)}
                  readOnly={readOnly}
                  className={`w-full text-sm px-3 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-orange/40 transition-colors
                    ${errors[`${i}-firstName`] ? 'border-red-400' : 'border-slate-200 focus:border-orange/60'}`}
                />
                {errors[`${i}-firstName`] && (
                  <p className="text-red-500 text-[10px] mt-0.5">{errors[`${i}-firstName`]}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  placeholder="Last name"
                  value={attendee.lastName}
                  onChange={e => updateField(i, 'lastName', e.target.value)}
                  readOnly={readOnly}
                  className={`w-full text-sm px-3 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-orange/40 transition-colors
                    ${errors[`${i}-lastName`] ? 'border-red-400' : 'border-slate-200 focus:border-orange/60'}`}
                />
                {errors[`${i}-lastName`] && (
                  <p className="text-red-500 text-[10px] mt-0.5">{errors[`${i}-lastName`]}</p>
                )}
              </div>
            </div>

            {/* ── Row 2: Required package ── */}
            {requiredPkg && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Required:</span>
                <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-green-800">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>${requiredPkg.price.toFixed(2)} – {requiredPkg.name}</span>
                </div>
              </div>
            )}

            {/* ── Row 3: Optional item selector ── */}
            {!readOnly && optionalPkgs.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide shrink-0">Optional:</span>
                <select
                  value={pendingOpt[i]?.pkgId ?? ''}
                  onChange={e => setPending(i, 'pkgId', Number(e.target.value))}
                  className="flex-1 min-w-[160px] text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange/40 focus:border-orange/60"
                >
                  {optionalPkgs.map(p => (
                    <option key={p.id} value={p.id}>
                      ${p.price.toFixed(2)} – {p.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1.5 shrink-0">
                  <label className="text-[11px] text-slate-400">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={pendingOpt[i]?.qty ?? 1}
                    onChange={e => setPending(i, 'qty', Math.max(1, Number(e.target.value)))}
                    className="w-14 text-xs text-center px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange/40"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => addOptional(i)}
                  className="shrink-0 bg-navy text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  + Add
                </button>
              </div>
            )}

            {/* ── Row 4: Added optional chips ── */}
            {(attendee.optionals || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {attendee.optionals.map(opt => {
                  const pkg = optionalPkgs.find(p => p.id === opt.packageId);
                  if (!pkg) return null;
                  return (
                    <span key={opt.packageId}
                      className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {pkg.name} ×{opt.quantity}
                      <span className="text-blue-500 ml-0.5">${(pkg.price * opt.quantity).toFixed(2)}</span>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => removeOptional(i, opt.packageId)}
                          className="ml-0.5 text-blue-400 hover:text-red-500 font-bold leading-none transition-colors"
                        >×</button>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Total */}
      <div className="flex justify-between items-center pt-2 border-t border-slate-200">
        <span className="text-sm font-semibold text-slate-500">
          TOTAL: <span className="text-[10px] text-slate-400">(excl. convenience fee)</span>
        </span>
        <span className="text-xl font-extrabold text-navy">${grandTotal.toFixed(2)}</span>
      </div>

      {!readOnly && (
        <button onClick={handleContinue} className="btn-primary w-full">
          Continue to Payment →
        </button>
      )}
    </div>
  );
}
