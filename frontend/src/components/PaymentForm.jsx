import { useState } from 'react';

export default function PaymentForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    cardName: '', cardNumber: '', expiry: '', cvv: '', email: '', postal: '',
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  const formatCard = (v) => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const formatExpiry = (v) => {
    const n = v.replace(/\D/g,'').slice(0,4);
    return n.length > 2 ? n.slice(0,2) + '/' + n.slice(2) : n;
  };

  const validate = () => {
    const e = {};
    if (!form.cardName.trim()) e.cardName = 'Card holder name required';
    if (form.cardNumber.replace(/\s/g,'').length < 16) e.cardNumber = 'Valid card number required';
    if (form.expiry.length < 5) e.expiry = 'Valid expiry required';
    if (form.cvv.length < 3) e.cvv = 'CVV required';
    if (!form.email.includes('@')) e.email = 'Valid email required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSubmit({ ...form, email: form.email });
  };

  return (
    <div>
      {/* Mock payment notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-xs text-blue-700 mb-4 flex items-center gap-2">
        <span>🔒</span>
        <span><strong>Secure Payment</strong> — Your card details are encrypted and processed securely.</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="input-label">Card Holder Name</label>
          <input className={`input-field ${errors.cardName ? 'border-red-400' : ''}`}
            placeholder="Name on card" value={form.cardName}
            onChange={e => set('cardName', e.target.value)} />
          {errors.cardName && <p className="text-red-500 text-xs mt-1">{errors.cardName}</p>}
        </div>

        <div>
          <label className="input-label">Card Number</label>
          <input className={`input-field font-mono ${errors.cardNumber ? 'border-red-400' : ''}`}
            placeholder="0000 0000 0000 0000" value={form.cardNumber}
            onChange={e => set('cardNumber', formatCard(e.target.value))} />
          {errors.cardNumber && <p className="text-red-500 text-xs mt-1">{errors.cardNumber}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">Expiry Date</label>
            <input className={`input-field font-mono ${errors.expiry ? 'border-red-400' : ''}`}
              placeholder="MM/YY" value={form.expiry}
              onChange={e => set('expiry', formatExpiry(e.target.value))} />
            {errors.expiry && <p className="text-red-500 text-xs mt-1">{errors.expiry}</p>}
          </div>
          <div>
            <label className="input-label">Security Code (CVV)</label>
            <input className={`input-field font-mono ${errors.cvv ? 'border-red-400' : ''}`}
              placeholder="123" maxLength={4} value={form.cvv}
              onChange={e => set('cvv', e.target.value.replace(/\D/g,'').slice(0,4))} />
            {errors.cvv && <p className="text-red-500 text-xs mt-1">{errors.cvv}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">Email (for receipt)</label>
            <input type="email" className={`input-field ${errors.email ? 'border-red-400' : ''}`}
              placeholder="your@email.com" value={form.email}
              onChange={e => set('email', e.target.value)} />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="input-label">Postal Code</label>
            <input className="input-field" placeholder="E3A 5V9" value={form.postal}
              onChange={e => set('postal', e.target.value.toUpperCase())} />
          </div>
        </div>

        {/* Payment logos */}
        <div className="flex gap-2 items-center py-1">
          {['VISA','MC','AMEX','DISC'].map(b => (
            <span key={b} className="text-xs bg-slate-100 text-slate-500 font-bold px-2 py-1 rounded">{b}</span>
          ))}
          <span className="text-xs text-slate-400 ml-auto">🔒 SSL Encrypted</span>
        </div>

        <button type="submit" disabled={loading} className="btn-gold w-full text-lg">
          {loading ? 'Processing…' : '🎰  Complete Booking & Pay'}
        </button>
      </form>
    </div>
  );
}
