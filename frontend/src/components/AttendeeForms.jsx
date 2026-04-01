import { useState, useEffect } from 'react';

export default function AttendeeForms({ attendees, requiredPkg, optionalPkgs, onComplete, readOnly }) {
  const [local, setLocal] = useState(attendees);
  const [errors, setErrors] = useState({});

  useEffect(() => setLocal(attendees), [attendees]);

  const update = (i, field, val) => {
    setLocal(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: val } : a));
    setErrors(prev => ({ ...prev, [`${i}-${field}`]: '' }));
  };

  const setOptQty = (i, pkgId, qty) => {
    setLocal(prev => prev.map((a, idx) => {
      if (idx !== i) return a;
      const optionals = qty > 0
        ? [...a.optionals.filter(o => o.packageId !== pkgId), { packageId: pkgId, quantity: qty }]
        : a.optionals.filter(o => o.packageId !== pkgId);
      return { ...a, optionals };
    }));
  };

  const getOptQty = (a, pkgId) => a.optionals?.find(o => o.packageId === pkgId)?.quantity || 0;

  const calcSubtotal = (a) => {
    let total = requiredPkg?.price || 0;
    for (const opt of (a.optionals || [])) {
      const pkg = optionalPkgs.find(p => p.id === opt.packageId);
      if (pkg) total += pkg.price * opt.quantity;
    }
    return total;
  };

  const validate = () => {
    const errs = {};
    local.forEach((a, i) => {
      if (!a.firstName.trim()) errs[`${i}-firstName`] = 'First name required';
      if (!a.lastName.trim())  errs[`${i}-lastName`]  = 'Last name required';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleContinue = () => {
    if (validate()) onComplete(local);
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
        <strong>Required:</strong> Every person must have the <strong>{requiredPkg?.name}</strong> package (${requiredPkg?.price.toFixed(2)}). Optional add-ons are available per person.
      </div>

      {local.map((attendee, i) => (
        <div key={i} className="border border-slate-100 rounded-xl overflow-hidden">
          {/* Card Header */}
          <div className="bg-navy/5 px-4 py-2 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-navy text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              {i + 1}
            </div>
            <span className="text-sm font-semibold text-navy">Person {i + 1}</span>
            <span className="ml-auto text-sm font-bold text-navy">
              ${calcSubtotal(attendee).toFixed(2)}
            </span>
          </div>

          {/* Card Body */}
          <div className="p-4 space-y-3">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">First Name *</label>
                <input
                  type="text"
                  className={`input-field ${errors[`${i}-firstName`] ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                  placeholder="First name"
                  value={attendee.firstName}
                  onChange={e => update(i, 'firstName', e.target.value)}
                  readOnly={readOnly}
                />
                {errors[`${i}-firstName`] && <p className="text-red-500 text-xs mt-1">{errors[`${i}-firstName`]}</p>}
              </div>
              <div>
                <label className="input-label">Last Name *</label>
                <input
                  type="text"
                  className={`input-field ${errors[`${i}-lastName`] ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                  placeholder="Last name"
                  value={attendee.lastName}
                  onChange={e => update(i, 'lastName', e.target.value)}
                  readOnly={readOnly}
                />
                {errors[`${i}-lastName`] && <p className="text-red-500 text-xs mt-1">{errors[`${i}-lastName`]}</p>}
              </div>
            </div>

            {/* Required package */}
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <span className="text-green-600 text-lg">✓</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-green-800">Required Package</p>
                <p className="text-sm font-bold text-green-900">{requiredPkg?.name}</p>
              </div>
              <span className="text-sm font-bold text-green-700">${requiredPkg?.price.toFixed(2)}</span>
            </div>

            {/* Optional add-ons */}
            {optionalPkgs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Optional Add-ons</p>
                {optionalPkgs.map(pkg => {
                  const qty = getOptQty(attendee, pkg.id);
                  return (
                    <div key={pkg.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">{pkg.name}</p>
                        <p className="text-xs text-slate-400">${pkg.price.toFixed(2)} each</p>
                      </div>
                      {!readOnly && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setOptQty(i, pkg.id, Math.max(0, qty - 1))}
                            className="w-7 h-7 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-sm flex items-center justify-center"
                          >−</button>
                          <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                          <button
                            onClick={() => setOptQty(i, pkg.id, qty + 1)}
                            className="w-7 h-7 rounded-full border border-navy/30 text-navy hover:bg-navy hover:text-white font-bold text-sm flex items-center justify-center transition-colors"
                          >+</button>
                        </div>
                      )}
                      {readOnly && <span className="text-sm text-slate-500">×{qty}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Running total */}
      <div className="flex justify-between items-center border-t border-slate-100 pt-3">
        <span className="text-sm text-slate-500">Subtotal (excl. convenience fee)</span>
        <span className="text-lg font-extrabold text-navy">
          ${local.reduce((sum, a) => sum + (requiredPkg?.price || 0) + (a.optionals || []).reduce((s, o) => {
            const pkg = optionalPkgs.find(p => p.id === o.packageId);
            return s + (pkg ? pkg.price * o.quantity : 0);
          }, 0), 0).toFixed(2)}
        </span>
      </div>

      {!readOnly && (
        <button onClick={handleContinue} className="btn-primary w-full">
          Continue to Seat Selection →
        </button>
      )}
    </div>
  );
}
