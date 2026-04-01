/**
 * SeatMap — SMEC Hall Floor Map
 *
 * Physical layout (matches the posted floor plan image):
 *
 *                     [CALLER / STAGE]
 *
 *  LEFT UPPER (5×3)    FLOOR STAGE       FAR-RIGHT (3×7)
 *  6  12  18  24  30  ┌───────────┐  │  61  68  75
 *  5  11  17  23  29  │ Floor     │  │  60  67  74
 *  4  10  16  22  28  │ Stage     │  │  59  66  73
 *                     └───────────┘  │  58  65  72
 *  LEFT LOWER (7×3)       RC (2×4) │     57  64  71
 *  3   9  15  21  27  33  39  │  45  51  │  56  63  70
 *  2   8  14  20  26  32  38  │  44  50  │  55  62  69
 *  1   7  13  19  25  31  37  │  43  49
 *                              │  42  48
 *
 * Tables present : 1–33, 37–39, 42–45, 48–51, 55–75  (65 tables × 6 seats = 390)
 * NOT in floor plan: 34–36, 40–41, 46–47, 52–54
 *
 * Cell types
 *   number    → table button
 *   null      → empty spacer (w-9 × h-9)
 *   'wide'    → aisle/gap (w-8)
 *   'FSTAGE'  → Floor Stage visual cell — consecutive runs are merged into
 *               one wide labelled box by the render loop
 */

import { useMemo } from 'react';

// ─── Grid definition ─────────────────────────────────────────────────────────
const HALL_GRID = [
  // Row 0 — closest to caller (upper-left + far-right top row)
  [  6, 12, 18, 24, 30, 'FSTAGE','FSTAGE','FSTAGE','FSTAGE','FSTAGE', 'wide', 61, 68, 75 ],
  // Row 1
  [  5, 11, 17, 23, 29, 'FSTAGE','FSTAGE','FSTAGE','FSTAGE','FSTAGE', 'wide', 60, 67, 74 ],
  // Row 2
  [  4, 10, 16, 22, 28, 'FSTAGE','FSTAGE','FSTAGE','FSTAGE','FSTAGE', 'wide', 59, 66, 73 ],
  // Row 3 — stage ends; far-right lower begins
  [null,null,null,null,null, null, null, null, null, null, 'wide', 58, 65, 72 ],
  // Row 4 — lower main floor + right-centre
  [  3,  9, 15, 21, 27, 33, 39, 'wide', 45, 51, 'wide', 57, 64, 71 ],
  // Row 5
  [  2,  8, 14, 20, 26, 32, 38, 'wide', 44, 50, 'wide', 56, 63, 70 ],
  // Row 6
  [  1,  7, 13, 19, 25, 31, 37, 'wide', 43, 49, 'wide', 55, 62, 69 ],
  // Row 7 — right-centre bottom only
  [null,null,null,null,null, null,null, 'wide', 42, 48, null, null, null, null ],
];

// Cell sizes (must match Tailwind classes below)
const CELL_PX = 36; // w-9
const GAP_PX  =  4; // gap-1

// Collapse a raw row into render-tokens; consecutive 'FSTAGE' → one merged token.
function collapseRow(row) {
  const tokens = [];
  let run = 0;
  for (const cell of row) {
    if (cell === 'FSTAGE') {
      run++;
    } else {
      if (run > 0) { tokens.push({ type: 'fstage', count: run }); run = 0; }
      tokens.push(cell);
    }
  }
  if (run > 0) tokens.push({ type: 'fstage', count: run });
  return tokens;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function SeatMap({ allSeats, activeTable, onTableSelect, selectedSeats, loading }) {
  const selectedIds = (selectedSeats || []).map(s => s.id);

  // Per-table availability
  const tableStatus = useMemo(() => {
    const st = {};
    for (const seat of allSeats) {
      const tn = seat.table_number;
      if (!st[tn]) st[tn] = { total: 0, available: 0, mine: false };
      st[tn].total++;
      if (seat.status === 'vacant') st[tn].available++;
      if (selectedIds.includes(seat.id)) st[tn].mine = true;
    }
    return st;
  }, [allSeats, selectedIds]);

  const getStyle = (tableNum) => {
    const ts = tableStatus[tableNum];
    if (!ts) return { cls: 'bg-white border-slate-200 text-slate-400', canClick: false };
    if (ts.mine)
      return { cls: 'bg-blue-100 border-blue-500 text-blue-800', canClick: true };
    if (ts.available === 0)
      return { cls: 'bg-slate-200 border-slate-300 text-slate-400 opacity-60', canClick: false };
    if (ts.available < ts.total)
      return { cls: 'bg-orange-100 border-orange-400 text-orange-800', canClick: true };
    return { cls: 'bg-white border-slate-300 text-slate-700', canClick: true };
  };

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1.5 mb-3 text-[11px] font-semibold">
        {[
          ['bg-white border-slate-300', 'VACANT'],
          ['bg-orange-100 border-orange-400', 'PARTIAL'],
          ['bg-slate-200 border-slate-300', 'OCCUPIED'],
          ['bg-blue-100 border-blue-500', 'SELECTED'],
        ].map(([cls, label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`inline-block w-6 h-5 rounded border-2 ${cls}`} />
            <span className="text-slate-500">{label}</span>
          </span>
        ))}
      </div>

      {loading && (
        <p className="text-xs text-center text-slate-400 animate-pulse mb-2">Refreshing availability…</p>
      )}

      {/* Hall */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 overflow-x-auto">
        {/* Caller / Stage bar */}
        <div className="flex justify-center mb-4">
          <div className="bg-navy text-white text-xs font-black px-6 py-1.5 rounded-full tracking-widest uppercase">
            📢 CALLER / STAGE
          </div>
        </div>

        {/* Grid — each row is an independent flex line */}
        <div className="flex flex-col gap-1 w-max mx-auto">
          {HALL_GRID.map((rawRow, rowIdx) => {
            const tokens = collapseRow(rawRow);
            return (
              <div key={rowIdx} className="flex gap-1 items-center">
                {tokens.map((token, tIdx) => {
                  // ── Merged Floor Stage block ──────────────────────────────
                  if (token && typeof token === 'object' && token.type === 'fstage') {
                    const w = token.count * CELL_PX + (token.count - 1) * GAP_PX;
                    const isMiddle = rowIdx === 1; // label only on middle row
                    return (
                      <div
                        key={tIdx}
                        style={{ width: w, height: CELL_PX }}
                        className={`flex-shrink-0 rounded-lg border-2 border-dashed border-slate-400
                                   flex items-center justify-center
                                   ${isMiddle ? 'bg-slate-200' : 'bg-slate-100'}`}
                      >
                        {isMiddle && (
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                            Floor Stage
                          </span>
                        )}
                      </div>
                    );
                  }

                  // ── Spacers ───────────────────────────────────────────────
                  if (token === 'wide') return <div key={tIdx} className="w-8 flex-shrink-0" />;
                  if (token === null)   return <div key={tIdx} className="w-9 h-9 flex-shrink-0" />;

                  // ── Table button ──────────────────────────────────────────
                  const tableNum = token;
                  const isActive = activeTable === tableNum;
                  const { cls, canClick } = getStyle(tableNum);
                  const ts = tableStatus[tableNum];

                  return (
                    <button
                      key={tIdx}
                      onClick={() => canClick && onTableSelect(tableNum)}
                      disabled={!canClick}
                      title={`Table ${tableNum}${ts ? ` — ${ts.available}/${ts.total} open` : ''}`}
                      className={`w-9 h-9 flex-shrink-0 rounded border-2 text-[11px] font-bold
                                  flex items-center justify-center select-none transition-all duration-100
                                  ${cls}
                                  ${isActive ? 'ring-2 ring-navy ring-offset-1 shadow scale-110 z-10' : ''}
                                  ${canClick ? 'cursor-pointer hover:ring-1 hover:ring-navy/40' : 'cursor-not-allowed'}`}
                    >
                      {tableNum}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected chairs summary */}
      {selectedSeats?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedSeats.map((seat, i) => (
            <span key={seat.id}
              className="flex items-center gap-1.5 bg-blue-50 border border-blue-200
                         rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-700">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center
                               justify-center text-[10px] font-black">{i + 1}</span>
              Table {seat.table_number}, Chair {seat.seat_position}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
