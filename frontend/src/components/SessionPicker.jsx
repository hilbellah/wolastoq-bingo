const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return {
    day:   DAYS[date.getDay()],
    month: MONTHS[date.getMonth()],
    date:  d,
  };
}

export default function SessionPicker({ sessions, selected, onSelect, readOnly }) {
  if (!sessions.length) {
    return <p className="text-sm text-slate-400 py-4 text-center">Loading available sessions…</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {sessions.map(s => {
        const { day, month, date } = formatDate(s.date);
        const isSelected = selected?.id === s.id;
        const isFull = s.seats_available === 0;

        return (
          <button
            key={s.id}
            onClick={() => !readOnly && !isFull && onSelect(s)}
            disabled={isFull || readOnly}
            className={`
              relative flex flex-col items-center py-4 px-3 rounded-xl border-2 font-medium
              transition-all duration-200 group
              ${isSelected
                ? 'border-navy bg-navy text-white shadow-md scale-105'
                : isFull
                  ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-navy hover:shadow-md hover:-translate-y-0.5'
              }
            `}
          >
            <span className={`text-xs font-bold uppercase tracking-widest ${isSelected ? 'text-gold' : 'text-slate-400'}`}>{day}</span>
            <span className="text-3xl font-black leading-none my-1">{date}</span>
            <span className={`text-xs font-semibold ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>{month}</span>
            <span className={`text-xs mt-1 ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>{s.time}</span>
            {isFull && <span className="absolute top-2 right-2 text-xs bg-red-100 text-red-500 rounded px-1 font-bold">FULL</span>}
            {!isFull && !isSelected && (
              <span className="text-xs mt-1.5 text-green-600 font-semibold">{s.seats_available} open</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
