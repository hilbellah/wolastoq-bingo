import { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { adminGetBookings, adminGetSessions, adminExportBookings } from '../../api';

function BookingRow({ booking }) {
  const [expanded, setExpanded] = useState(false);
  const dateStr = new Date(booking.created_at).toLocaleString('en-CA', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <>
      <tr
        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <td className="px-4 py-3 font-mono text-xs font-bold text-navy">{booking.reference}</td>
        <td className="px-4 py-3 text-sm text-slate-700">
          {booking.first_name} {booking.last_name}
        </td>
        <td className="px-4 py-3 text-sm text-slate-500 hidden md:table-cell">{booking.email}</td>
        <td className="px-4 py-3 text-sm text-slate-700">
          {booking.session_date ? new Date(booking.session_date + 'T12:00:00').toLocaleDateString('en-CA', {
            month: 'short', day: 'numeric'
          }) : '—'} {booking.session_time ? `@ ${booking.session_time}` : ''}
        </td>
        <td className="px-4 py-3 text-sm font-bold text-navy">${(booking.total_amount || 0).toFixed(2)}</td>
        <td className="px-4 py-3 text-xs text-slate-400 hidden lg:table-cell">{dateStr}</td>
        <td className="px-4 py-3 text-xs text-slate-400">{expanded ? '▲' : '▼'}</td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50 border-b border-slate-200">
          <td colSpan={7} className="px-4 py-3">
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-700 mb-2">Booking Items:</p>
              {(booking.items || []).map((item, i) => (
                <div key={i} className="flex gap-4 pl-2">
                  <span className="font-medium">{item.firstName} {item.lastName}</span>
                  <span className="text-slate-400">
                    {item.seat_table ? `Table ${item.seat_table}, Seat ${item.seat_position}` : 'No seat'}
                  </span>
                  <span>{item.package_name}</span>
                  <span className="text-navy font-semibold">${(item.line_total || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function BookingsReport() {
  const { token } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const [bookings, setBookings] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sessionId, setSessionId] = useState(searchParams.get('sessionId') || '');
  const [exporting, setExporting] = useState(false);

  const fetchBookings = () => {
    setLoading(true);
    setError('');
    adminGetBookings(token, { sessionId, search })
      .then(data => setBookings(data.bookings || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    adminGetSessions(token)
      .then(data => setSessions(data.sessions || []))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    fetchBookings();
  }, [token, sessionId, search]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await adminExportBookings(token, { sessionId, search });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookings-${sessionId || 'all'}-${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-navy">Bookings</h1>
          <p className="text-sm text-slate-500 mt-0.5">{bookings.length} result{bookings.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || bookings.length === 0}
          className="btn-outline text-sm flex items-center gap-2"
        >
          {exporting ? '⏳ Exporting…' : '📥 Export CSV'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <label className="input-label">Search</label>
          <input
            type="text"
            className="input-field"
            placeholder="Name, email, or reference…"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setSearchParams(p => { e.target.value ? p.set('search', e.target.value) : p.delete('search'); return p; });
            }}
          />
        </div>
        <div className="flex-1 min-w-48">
          <label className="input-label">Session</label>
          <select
            className="input-field"
            value={sessionId}
            onChange={e => {
              setSessionId(e.target.value);
              setSearchParams(p => { e.target.value ? p.set('sessionId', e.target.value) : p.delete('sessionId'); return p; });
            }}
          >
            <option value="">All Sessions</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                {new Date(s.date + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} @ {s.time}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3 hidden md:table-cell">Email</th>
                <th className="px-4 py-3">Session</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3 hidden lg:table-cell">Booked At</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-navy mb-2" />
                    <p>Loading…</p>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                bookings.map(b => <BookingRow key={b.id} booking={b} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
