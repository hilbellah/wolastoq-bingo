import { useState, useEffect } from 'react';

export default function HoldTimer({ expiry, onExpired }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, new Date(expiry) - Date.now());
      setRemaining(diff);
      if (diff === 0) onExpired?.();
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [expiry]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const pct  = Math.min(100, (remaining / (30 * 60 * 1000)) * 100);
  const urgent = remaining < 120000; // < 2 min

  return (
    <div className={`rounded-xl border-2 px-4 py-3 flex items-center gap-4 ${urgent ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
      <div className={`text-2xl font-black tabular-nums ${urgent ? 'text-red-600' : 'text-amber-700'}`}>
        {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${urgent ? 'text-red-700' : 'text-amber-800'}`}>
          {urgent ? '⚠️ Your seats expire soon!' : '🔒 Seats reserved for you'}
        </p>
        <div className="w-full bg-amber-200/60 rounded-full h-1.5 mt-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-1000 ${urgent ? 'bg-red-500' : 'bg-amber-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-amber-700 hidden sm:block">Complete your booking before the timer runs out.</p>
    </div>
  );
}
