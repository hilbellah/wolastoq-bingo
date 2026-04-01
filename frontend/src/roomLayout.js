/**
 * Physical room layout for SMEC Bingo Hall
 * Based on the existing stmec.bingonb.net seat map
 *
 * The room has:
 *  - A CALLER station at the top center
 *  - LEFT section: 2 clusters of 2 tables each (T1-T4)
 *  - CENTER-LEFT section: 2 tables + 1 small table (T5-T7)
 *  - AISLE table: 1 small table (T8)
 *  - RIGHT section: 4 tables in a row (T9-T12)
 */

export const ROOM_LAYOUT = [
  // ── LEFT SECTION ─────────────────────────────────────────────
  {
    id: 1, label: '1', capacity: 6, section: 'left',
    gridCol: 1, gridRow: 1,   // position in the visual grid
  },
  {
    id: 2, label: '2', capacity: 6, section: 'left',
    gridCol: 2, gridRow: 1,
  },
  {
    id: 3, label: '3', capacity: 6, section: 'left',
    gridCol: 1, gridRow: 2,
  },
  {
    id: 4, label: '4', capacity: 6, section: 'left',
    gridCol: 2, gridRow: 2,
  },

  // ── CENTER-LEFT SECTION ────────────────────────────────────────
  {
    id: 5, label: '5', capacity: 6, section: 'center-left',
    gridCol: 4, gridRow: 1,
  },
  {
    id: 6, label: '6', capacity: 6, section: 'center-left',
    gridCol: 5, gridRow: 1,
  },
  {
    id: 7, label: '7', capacity: 4, section: 'center-left',
    gridCol: 5, gridRow: 2,
  },

  // ── AISLE ──────────────────────────────────────────────────────
  {
    id: 8, label: '8', capacity: 5, section: 'aisle',
    gridCol: 7, gridRow: 1,
  },

  // ── RIGHT SECTION ─────────────────────────────────────────────
  {
    id: 9,  label: '9',  capacity: 7, section: 'right',
    gridCol: 9,  gridRow: 1,
  },
  {
    id: 10, label: '10', capacity: 7, section: 'right',
    gridCol: 10, gridRow: 1,
  },
  {
    id: 11, label: '11', capacity: 7, section: 'right',
    gridCol: 11, gridRow: 1,
  },
  {
    id: 12, label: '12', capacity: 7, section: 'right',
    gridCol: 12, gridRow: 1,
  },
];

// Seat positions around a table (for the detail view)
// Position 1-6 arranged: top-left, top-right on one side, then bottom
export function getSeatPositions(capacity) {
  // Returns [x%, y%] offsets for each seat around the table visual
  const layouts = {
    4: [
      { label: '1', side: 'left',   offset: 0 },
      { label: '2', side: 'left',   offset: 1 },
      { label: '3', side: 'right',  offset: 0 },
      { label: '4', side: 'right',  offset: 1 },
    ],
    5: [
      { label: '1', side: 'left',   offset: 0 },
      { label: '2', side: 'left',   offset: 1 },
      { label: '3', side: 'top',    offset: 0 },
      { label: '4', side: 'right',  offset: 0 },
      { label: '5', side: 'right',  offset: 1 },
    ],
    6: [
      { label: '1', side: 'left',   offset: 0 },
      { label: '2', side: 'left',   offset: 1 },
      { label: '3', side: 'left',   offset: 2 },
      { label: '4', side: 'right',  offset: 0 },
      { label: '5', side: 'right',  offset: 1 },
      { label: '6', side: 'right',  offset: 2 },
    ],
    7: [
      { label: '1', side: 'left',   offset: 0 },
      { label: '2', side: 'left',   offset: 1 },
      { label: '3', side: 'left',   offset: 2 },
      { label: '4', side: 'top',    offset: 0 },
      { label: '5', side: 'right',  offset: 0 },
      { label: '6', side: 'right',  offset: 1 },
      { label: '7', side: 'right',  offset: 2 },
    ],
  };
  return layouts[capacity] || layouts[6];
}
