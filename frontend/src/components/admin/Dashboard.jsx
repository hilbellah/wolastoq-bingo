import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { adminGetDashboard } from '../../api';

function StatCard({ label, value, sub, color = 'navy' }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-extrabold text-${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function SessionRow({ session }) {
  const dateObj = new Date(session.date + 'T12:00:00');
  const dateStr = dateObj.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
  const pct = session.total_seats > 0
    ? Math.round((session.sold_seats / session.total_seats) * 100)
    : 0;

  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
      <div className="w-20 text-sm font-semibold text-slate-700 flex-shrink-0">{dateStr}</div>
      <div className="flex-1">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{session.time}</span>
          <span>{session.sold_seats}/{session.total_seats} seats</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className="bg-navy h-2 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0
        ${pct === 100 ? 'bg-red-100 text-red-700' : pct >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
        {pct === 100 ? 'SOLD OUT' : `${pct}%`}
      </span>
      <Link
        to={`/admin/bookings?sessionId=${session.id}`}
        className="text-xs text-navy hover:underline flex-shrink-0"
      >
        View →
      </Link>
    </div>
  );
}

export default function Dashboard() {
  const { token } = useOutletContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminGetDashboard(token)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
        ⚠️ {error}
      </div>
    );
  }

  const today = data?.today || {};
  const upcoming = data?.upcomingSessions || [];

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-extrabold text-navy">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Today stats */}
      {today.sessionId ? (
        <>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Today's Session — {today.time}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Bookings" value={today.bookingCount ?? 0} sub="total reservations" />
              <StatCard label="Seats Sold" value={today.soldSeats ?? 0} sub={`of ${today.totalSeats ?? 0} total`} />
              <StatCard label="Held / Pending" value={today.heldSeats ?? 0} sub="active holds" color="amber-600" />
              <StatCard
                label="Revenue"
                value={`$${(today.revenue ?? 0).toFixed(2)}`}
                sub="inc. convenience fees"
                color="green-700"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              to={`/admin/bookings?sessionId=${today.sessionId}`}
              className="btn-primary text-sm"
            >
              View Today's Bookings →
            </Link>
          </div>
        </>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-500">
          <p className="text-2xl mb-2">📅</p>
          <p className="font-semibold">No session scheduled for today</p>
          <Link to="/admin/sessions" className="text-sm text-navy hover:underline mt-1 inline-block">
            Manage sessions →
          </Link>
        </div>
      )}

      {/* Upcoming sessions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-navy">Upcoming Sessions</h2>
          <Link to="/admin/sessions" className="text-xs text-navy hover:underline">Manage →</Link>
        </div>
        {upcoming.length > 0 ? (
          <div>
            {upcoming.map(s => <SessionRow key={s.id} session={s} />)}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">No upcoming sessions.</p>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { to: '/admin/bookings', icon: '🎟️', label: 'All Bookings', desc: 'Search and export' },
          { to: '/admin/sessions', icon: '📅', label: 'Manage Sessions', desc: 'Add / edit / toggle' },
          { to: '/admin/packages', icon: '📦', label: 'Packages & Pricing', desc: 'Update ticket prices' },
        ].map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:border-navy/40 hover:shadow-sm transition-all"
          >
            <p className="text-2xl mb-2">{item.icon}</p>
            <p className="font-semibold text-navy text-sm">{item.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
