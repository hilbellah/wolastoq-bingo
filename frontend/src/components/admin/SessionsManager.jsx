import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { adminGetSessions, adminCreateSession, adminUpdateSession, adminBulkSchedule } from '../../api';

const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_FULL   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function BulkScheduleForm({ token, onDone }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    startDate: today,
    endDate: '',
    days: [2, 4, 5, 6, 0], // Tue, Thu, Fri, Sat, Sun — matches default schedule
    time: '18:30',
    doors_open: '17:00',
    replaceExisting: false,
  });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleDay = (d) => setForm(f => ({
    ...f,
    days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d],
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.endDate) { setError('End date is required'); return; }
    if (!form.days.length) { setError('Select at least one day'); return; }
    setSaving(true); setError(''); setResult(null);
    try {
      const res = await adminBulkSchedule(token, form);
      setResult(res.message || `Created ${res.created} sessions`);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="input-label">Start Date *</label>
          <input type="date" className="input-field" value={form.startDate}
            onChange={e => set('startDate', e.target.value)} />
        </div>
        <div>
          <label className="input-label">End Date *</label>
          <input type="date" className="input-field" value={form.endDate}
            onChange={e => set('endDate', e.target.value)} />
        </div>
        <div>
          <label className="input-label">Game Time</label>
          <input type="time" className="input-field" value={form.time}
            onChange={e => set('time', e.target.value)} />
        </div>
        <div>
          <label className="input-label">Doors Open</label>
          <input type="time" className="input-field" value={form.doors_open}
            onChange={e => set('doors_open', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="input-label">Days of the Week</label>
        <div className="flex gap-2 flex-wrap mt-1">
          {DAY_LABELS.map((label, idx) => (
            <button key={idx} type="button"
              onClick={() => toggleDay(idx)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors
                ${form.days.includes(idx)
                  ? 'bg-orange border-orange text-white'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-orange/40'}`}>
              {label}
            </button>
          ))}
        </div>
        {form.days.length > 0 && (
          <p className="text-xs text-slate-400 mt-1">
            {form.days.sort((a,b)=>a-b).map(d => DAY_FULL[d]).join(', ')}
          </p>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.replaceExisting}
          onChange={e => set('replaceExisting', e.target.checked)}
          className="rounded border-slate-300 text-orange" />
        <span className="text-sm text-slate-600">Replace existing sessions on conflicting dates</span>
      </label>

      {error  && <p className="text-red-500 text-sm">⚠️ {error}</p>}
      {result && <p className="text-green-600 text-sm font-semibold">✅ {result}</p>}

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Generating…' : 'Generate Sessions'}
        </button>
      </div>
    </form>
  );
}

const BLANK = { date: '', time: '18:30', doors_open: '17:00', notes: '', is_active: true };

function SessionForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date) { setError('Date is required'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="input-label">Date *</label>
          <input type="date" className="input-field" value={form.date}
            onChange={e => set('date', e.target.value)} />
        </div>
        <div>
          <label className="input-label">Game Time</label>
          <input type="time" className="input-field" value={form.time}
            onChange={e => set('time', e.target.value)} />
        </div>
        <div>
          <label className="input-label">Doors Open</label>
          <input type="time" className="input-field" value={form.doors_open}
            onChange={e => set('doors_open', e.target.value)} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active}
              onChange={e => set('is_active', e.target.checked)}
              className="rounded border-slate-300 text-navy" />
            <span className="text-sm font-medium text-slate-700">Active (accepting bookings)</span>
          </label>
        </div>
      </div>
      <div>
        <label className="input-label">Notes (optional)</label>
        <textarea className="input-field resize-none" rows={2}
          placeholder="Special notes for this session…"
          value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
      </div>
      {error && <p className="text-red-500 text-sm">⚠️ {error}</p>}
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save Session'}
        </button>
        <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
      </div>
    </form>
  );
}

export default function SessionsManager() {
  const { token } = useOutletContext();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = () => {
    setLoading(true);
    adminGetSessions(token)
      .then(data => setSessions(data.sessions || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const handleCreate = async (form) => {
    await adminCreateSession(token, form);
    setCreating(false);
    load();
  };

  const handleUpdate = async (id, form) => {
    await adminUpdateSession(token, id, form);
    setEditingId(null);
    load();
  };

  const handleToggle = async (session) => {
    await adminUpdateSession(token, session.id, { is_active: !session.is_active });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-navy">Sessions</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage bingo night dates &amp; times</p>
        </div>
        <div className="flex gap-2">
          {!bulkOpen && !creating && (
            <button onClick={() => setBulkOpen(true)} className="btn-outline text-sm">
              📅 Bulk Schedule
            </button>
          )}
          {!creating && !bulkOpen && (
            <button onClick={() => setCreating(true)} className="btn-primary text-sm">
              + Add One
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>
      )}

      {/* Bulk Schedule form */}
      {bulkOpen && (
        <div className="bg-white rounded-xl border-2 border-orange/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-navy">Bulk Schedule</h3>
              <p className="text-xs text-slate-400 mt-0.5">Generate sessions for a date range on selected days</p>
            </div>
            <button onClick={() => setBulkOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
          </div>
          <BulkScheduleForm token={token} onDone={() => { setBulkOpen(false); load(); }} />
        </div>
      )}

      {/* Create single session form */}
      {creating && (
        <div className="bg-white rounded-xl border-2 border-orange/30 p-5">
          <h3 className="font-bold text-navy mb-4">New Session</h3>
          <SessionForm onSave={handleCreate} onCancel={() => setCreating(false)} />
        </div>
      )}

      {/* Sessions list */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-navy" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
          <p className="text-3xl mb-2">📅</p>
          <p className="font-semibold">No sessions yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => {
            const dateObj = new Date(session.date + 'T12:00:00');
            const isPast = dateObj < new Date();
            const dateStr = dateObj.toLocaleDateString('en-CA', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            const pct = session.total_seats > 0
              ? Math.round(((session.sold_seats || 0) / session.total_seats) * 100)
              : 0;

            return (
              <div key={session.id} className={`bg-white rounded-xl border p-4 ${isPast ? 'border-slate-100 opacity-60' : 'border-slate-200'}`}>
                {editingId === session.id ? (
                  <>
                    <h3 className="font-bold text-navy mb-4">Edit Session</h3>
                    <SessionForm
                      initial={{ ...session, is_active: Boolean(session.is_active) }}
                      onSave={form => handleUpdate(session.id, form)}
                      onCancel={() => setEditingId(null)}
                    />
                  </>
                ) : (
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800">{dateStr}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                          ${isPast ? 'bg-slate-100 text-slate-400' :
                            session.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {isPast ? 'Past' : session.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Doors {session.doors_open} · Game {session.time}
                      </p>
                      {session.notes && (
                        <p className="text-xs text-slate-400 mt-1 italic">{session.notes}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                          <div className="bg-navy h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">
                          {session.sold_seats || 0}/{session.total_seats || 0} sold
                        </span>
                      </div>
                    </div>
                    {!isPast && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleToggle(session)}
                          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors
                            ${session.is_active
                              ? 'border-red-200 text-red-600 hover:bg-red-50'
                              : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                        >
                          {session.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => setEditingId(session.id)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
