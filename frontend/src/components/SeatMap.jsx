/**
 * SeatMap — SMEC Hall Floor Map
 *
 * Each number shown is a TABLE NUMBER (1–75, skipping 41 & 47).
 * 73 tables × 6 chairs each = 438 total chairs.
 *
 * Grid layout (matches physical floor plan):
 *
 *         CALLER
 *  [6][12][18][24]   [30][36][ ]       [ ]    [54][61][68][75]
 *  [5][11][17][23]   [29][35][ ]       [ ]    [53][60][67][74]
 *  [4][10][16][22]   [28][34][40]     [46]    [52][59][66][73]
 *  [gap row]                          [45]    [51][58][65][72]
 *  [3][ 9][15][21]   [27][33][39]     [44]    [50][57][64][71]
 *  [2][ 8][14][20]   [26][32][38]     [43]    [49][56][63][70]
 *  [1][ 7][13][19]   [25][31][37]     [42]    [48][55][62][69]
 *
 * Clicking a table → onTableSelect(tableNum)
 * Table color = availability: VACANT / PARTIAL / OCCUPIED / SELECTED
 */

import { useMemo } from 'react';

// Each row is an array of cells:
//   number  → table button showing that table number
//   null    → empty spacer (same size as a button, keeps columns aligned)
//   'gap'   → narrow column gap between sections
//   'wide'  → wide column gap between sections
const HALL_GRID = [
  // Row 0 — top (nearest caller)
  [ 6, 12, 18, 24, 'gap', 30, 36, null,  'wide', null, 'wide', 54, 61, 68, 75 ],
  [ 5, 11, 17, 23, 'gap', 29, 35, null,  'wide', null, 'wide', 53, 60, 67, 74 ],
  [ 4, 10, 16, 22, 'gap', 28, 34,  40,  'wide',  46,  'wide', 52, 59, 66, 73 ],
  // Row 3 — gap row for Sections A & B (but aisle + Section C continue)
  [ null, null, null, null, 'gap', null, null, null, 'wide', 45, 'wide', 51, 58, 65, 72 ],
  [ 3,  9, 15, 21, 'gap', 27, 33, 39,  'wide', 44,  'wide', 50, 57, 64, 71 ],
  [ 2,  8, 14, 20, 'gap', 26, 32, 38,  'wide', 43,  'wide', 49, 56, 63, 70 ],
  // Row 6 — bottom (farthest from caller)
  [ 1,  7, 13, 19, 'gap', 25, 31, 37,  'wide', 42,  'wide', 48, 55, 62, 69 ],
];

export default function SeatMap({ allSeats, activeTable, onTableSelect, selectedSeats, loading }) {
  const selectedIds = (selectedSeats || []).map(s => s.id);

  // Per-table availability stats
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
    if (ts.mine)             return { cls: 'bg-blue-100 border-blue-500 text-blue-800',   canClick: true };
    if (ts.available === 0)  return { cls: 'bg-slate-200 border-slate-300 text-slate-400 opacity-60', canClick: false };
    if (ts.available < ts.total) return { cls: 'bg-orange-100 border-orange-400 text-orange-800', canClick: true };
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
        {/* Caller bar */}
        <div className="flex justify-center mb-4">
          <div className="bg-navy text-white text-xs font-black px-6 py-1.5 rounded-full tracking-widest uppercase">
            📢 CALLER
          </div>
        </div>

        {/* Grid */}
        <div className="flex flex-col gap-1 w-max mx-auto">
          {HALL_GRID.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-1 items-center">
              {row.map((cell, colIdx) => {
                // Spacers
                if (cell === 'gap')  return <div key={colIdx} className="w-3 flex-shrink-0" />;
                if (cell === 'wide') return <div key={colIdx} className="w-6 flex-shrink-0" />;
                if (cell === null)   return <div key={colIdx} className="w-9 h-9 flex-shrink-0" />;

                // Table button
                const tableNum = cell;
                const isActive = activeTable === tableNum;
                const { cls, canClick } = getStyle(tableNum);

                return (
                  <button
                    key={colIdx}
                    onClick={() => canClick && onTableSelect(tableNum)}
                    disabled={!canClick}
                    title={`Table ${tableNum}${tableStatus[tableNum] ? ` — ${tableStatus[tableNum].available} of ${tableStatus[tableNum].total} chairs open` : ''}`}
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
          ))}
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
