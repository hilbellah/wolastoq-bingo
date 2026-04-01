/**
 * TableLayout — Physical chair arrangement around a rectangular table.
 *
 * Matches SMEC reference email screenshot:
 *
 *   [5]  ┌──────────────┐  [6]
 *   [3]  │  TABLE  N    │  [4]
 *   [1]  └──────────────┘  [2]
 *
 * Left side  = ODD  positions, descending from top  (5 → 3 → 1)
 * Right side = EVEN positions, descending from top  (6 → 4 → 2)
 *
 * For 7-seat tables: Left = [7,5,3,1], Right = [6,4,2]
 * For 4-seat tables: Left = [3,1],     Right = [4,2]
 * For 5-seat tables: Left = [5,3,1],   Right = [4,2]
 */

const CHAIR_STYLE = {
  vacant:   'bg-white border-green-400 text-slate-700 hover:bg-green-50 cursor-pointer',
  mine:     'bg-green-500 border-green-600 text-white cursor-pointer shadow-md scale-105',
  held:     'bg-amber-400 border-amber-500 text-white cursor-not-allowed',
  occupied: 'bg-slate-300 border-slate-400 text-slate-500 cursor-not-allowed',
};

const CHAIR_LABEL = {
  vacant: 'Available',
  mine:   'Your seat',
  held:   'On hold',
  occupied: 'Occupied',
};

function getChairStatus(seat, selectedIds, userToken) {
  if (!seat) return 'vacant';
  if (seat.status === 'sold') return 'occupied';
  if (seat.status === 'held') {
    return (seat.held_by && seat.held_by === userToken) ? 'mine' : 'held';
  }
  if (selectedIds.includes(seat.id)) return 'mine';
  return 'vacant';
}

function Chair({ seat, position, selectedIds, userToken, onSeatToggle }) {
  const status = getChairStatus(seat, selectedIds, userToken);
  const clickable = status === 'vacant' || status === 'mine';

  return (
    <button
      disabled={!clickable}
      onClick={() => clickable && seat && onSeatToggle(seat)}
      title={`Chair ${position} — ${CHAIR_LABEL[status]}`}
      className={`w-11 h-11 rounded-xl border-2 font-extrabold text-sm
                  flex items-center justify-center transition-all duration-100 select-none
                  ${CHAIR_STYLE[status]}`}
    >
      {position}
    </button>
  );
}

export default function TableLayout({ tableNum, seats, selectedIds, userToken, onSeatToggle }) {
  if (!seats || seats.length === 0) return null;

  const capacity = seats.length;

  // Build position → seat lookup
  const seatByPos = {};
  for (const s of seats) seatByPos[s.seat_position] = s;

  // Left side: odd positions, highest first
  const leftPositions = [];
  for (let p = capacity % 2 !== 0 ? capacity : capacity - 1; p >= 1; p -= 2) {
    leftPositions.push(p);
  }

  // Right side: even positions, highest first
  const rightPositions = [];
  for (let p = capacity % 2 === 0 ? capacity : capacity - 1; p >= 2; p -= 2) {
    rightPositions.push(p);
  }

  const maxRows = Math.max(leftPositions.length, rightPositions.length);

  const vacantCount = seats.filter(s => s.status === 'vacant' && !selectedIds.includes(s.id)).length;
  const mineCount   = seats.filter(s => selectedIds.includes(s.id)).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-extrabold text-navy text-sm">Table {tableNum}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {mineCount > 0
              ? `${mineCount} chair${mineCount > 1 ? 's' : ''} chosen — click to deselect`
              : vacantCount > 0
              ? `${vacantCount} chair${vacantCount > 1 ? 's' : ''} available — click to select`
              : 'Table fully booked'}
          </p>
        </div>
        {/* Legend */}
        <div className="flex gap-3 text-[10px] font-semibold">
          {[
            ['bg-white border-green-400', 'Vacant'],
            ['bg-green-500 border-green-600', 'Selected'],
            ['bg-amber-400 border-amber-500', 'On Hold'],
            ['bg-slate-300 border-slate-400', 'Occupied'],
          ].map(([cls, label]) => (
            <span key={label} className="flex items-center gap-1">
              <span className={`w-4 h-4 rounded border-2 flex-shrink-0 ${cls}`} />
              <span className="text-slate-500">{label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Chair diagram */}
      <div className="flex items-center justify-center gap-4 py-2">
        {/* Left chairs (odd positions) */}
        <div className="flex flex-col gap-2.5 items-end">
          {Array.from({ length: maxRows }, (_, i) => {
            const pos = leftPositions[i];
            if (pos === undefined) return <div key={i} className="w-11 h-11" />;
            return (
              <Chair
                key={pos}
                seat={seatByPos[pos]}
                position={pos}
                selectedIds={selectedIds}
                userToken={userToken}
                onSeatToggle={onSeatToggle}
              />
            );
          })}
        </div>

        {/* Table rectangle */}
        <div className="bg-slate-100 border-2 border-slate-400 rounded-xl flex flex-col items-center
                        justify-center px-8 py-3 text-center min-h-[80px] shadow-inner">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">TABLE</p>
          <p className="text-3xl font-extrabold text-slate-600 leading-tight">{tableNum}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">LAYOUT</p>
        </div>

        {/* Right chairs (even positions) */}
        <div className="flex flex-col gap-2.5 items-start">
          {Array.from({ length: maxRows }, (_, i) => {
            const pos = rightPositions[i];
            if (pos === undefined) return <div key={i} className="w-11 h-11" />;
            return (
              <Chair
                key={pos}
                seat={seatByPos[pos]}
                position={pos}
                selectedIds={selectedIds}
                userToken={userToken}
                onSeatToggle={onSeatToggle}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
