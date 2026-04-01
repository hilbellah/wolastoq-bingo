import { useState, useEffect } from 'react';

/**
 * AttendeeForms — table-style booking form matching reference site.
 *
 * Layout per person row:
 *   First Name | Last Name | Required (badge) | Optional Item (select) | Qty | Add
 *
 * Added optional items appear below the table as a per-person chip list.
 * A running TOTAL is shown at the bottom before the Continue button.
 */

export default function AttendeeForms({ attendees, requiredPkg, optionalPkgs, onComplete, readOnly }) {
  const [local, setLocal]       = useState(attendees);
  const [errors, setErrors]     = useState({});
  // pendingOpt[i] = { pkgId, qty } — what's staged in the dropdown but not yet "Added"
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
    // reset qty back to 1
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
    <div className="space-y-4">
      {/* Instruction banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
        <strong>INSTRUCTION:</strong> Booking cuts off at 12:30 PM.
        {optionalPkgs.length > 0 && (
          <> To add Optional Items, select the item, set a Quantity, then click <strong>Add Item</strong>.</>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              <th className="px-3 py-2.5 text-left w-[140px]">First Name</th>
              <th className="px-3 py-2.5 text-left w-[140px]">Last Name</th>
              <th className="px-3 py-2.5 text-left">Required</th>
              {!readOnly && optionalPkgs.length > 0 && <>
                <th className="px-3 py-2.5 text-left">Optional Item</th>
                <th className="px-3 py-2.5 text-center w-16">Qty</th>
                <th className="px-3 py-2.5 text-center w-20">Add Item</th>
              </>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {local.map((attendee, i) => (
              <>
                {/* ── Main row ── */}
                <tr key={`row-${i}`} className="bg-white hover:bg-slate-50/50 transition-colors">
                  {/* First Name */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      placeholder="First name"
                      value={attendee.firstName}
                      onChange={e => updateField(i, 'firstName', e.target.value)}
                      readOnly={readOnly}
                      className={`w-full text-sm px-2.5 py-1.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-orange/40 transition-colors
                        ${errors[`${i}-firstName`] ? 'border-red-400' : 'border-slate-200 focus:border-orange/60'}`}
                    />
                    {errors[`${i}-firstName`] && (
                      <p className="text-red-500 text-[10px] mt-0.5">{errors[`${i}-firstName`]}</p>
                    )}
                  </td>

                  {/* Last Name */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      placeholder="Last name"
                      value={attendee.lastName}
                      onChange={e => updateField(i, 'lastName', e.target.value)}
                      readOnly={readOnly}
                      className={`w-full text-sm px-2.5 py-1.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-orange/40 transition-colors
                        ${errors[`${i}-lastName`] ? 'border-red-400' : 'border-slate-200 focus:border-orange/60'}`}
                    />
                    {errors[`${i}-lastName`] && (
                      <p className="text-red-500 text-[10px] mt-0.5">{errors[`${i}-lastName`]}</p>
                    )}
                  </td>

                  {/* Required package */}
                  <td className="px-3 py-2">
                    {requiredPkg ? (
                      <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-green-800 whitespace-nowrap">
                        <span className="text-green-500 font-bold">✓</span>
                        <span>${requiredPkg.price.toFixed(2)} – {requiredPkg.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">—</span>
                    )}
                  </td>

                  {/* Optional item selector (edit mode only) */}
                  {!readOnly && optionalPkgs.length > 0 && (
                    <>
                      <td className="px-3 py-2">
                        <select
                          value={pendingOpt[i]?.pkgId ?? ''}
                          onChange={e => setPending(i, 'pkgId', Number(e.target.value))}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange/40 focus:border-orange/60 min-w-[160px]"
                        >
                          {optionalPkgs.map(p => (
                            <option key={p.id} value={p.id}>
                              ${p.price.toFixed(2)} – {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          value={pendingOpt[i]?.qty ?? 1}
                          onChange={e => setPending(i, 'qty', Math.max(1, Number(e.target.value)))}
                          className="w-full text-xs text-center px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange/40"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => addOptional(i)}
                          className="bg-navy text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-navy-dark transition-colors whitespace-nowrap"
                        >
                          + Add
                        </button>
                      </td>
                    </>
                  )}
                </tr>

                {/* ── Added optionals row (spans full width) ── */}
                {(attendee.optionals || []).length > 0 && (
                  <tr key={`opts-${i}`} className="bg-blue-50/40">
                    <td colSpan={readOnly || optionalPkgs.length === 0 ? 3 : 6} className="px-3 py-1.5">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mr-1">Add-ons:</span>
                        {attendee.optionals.map(opt => {
                          const pkg = optionalPkgs.find(p => p.id === opt.packageId);
                          if (!pkg) return null;
                          return (
                            <span key={opt.packageId}
                              className="inline-flex items-center gap-1 bg-blue-100 border border-blue-200 rounded-full px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                              {pkg.name} ×{opt.quantity}
                              <span className="text-blue-500 font-bold">${(pkg.price * opt.quantity).toFixed(2)}</span>
                              {!readOnly && (
                                <button
                                  type="button"
                                  onClick={() => removeOptional(i, opt.packageId)}
                                  className="ml-0.5 text-blue-400 hover:text-red-500 font-bold text-xs leading-none transition-colors"
                                >×</button>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

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
