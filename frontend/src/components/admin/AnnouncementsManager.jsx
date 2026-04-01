import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  adminGetAnnouncements, adminCreateAnnouncement,
  adminUpdateAnnouncement, adminDeleteAnnouncement,
} from '../../api';

const TYPE_STYLES = {
  info:    { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700',   icon: 'ℹ️' },
  warning: { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700',  icon: '⚠️' },
  special: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700', icon: '🎉' },
};

const BLANK = { title: '', message: '', type: 'info', is_active: true, starts_at: '', ends_at: '' };

function AnnouncementForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.message.trim()) { setError('Message is required'); return; }
    setSaving(true); setError('');
    try { await onSave(form); }
    catch (err) { setError(err.message); setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="input-label">Title *</label>
        <input className="input-field" placeholder="e.g. Easter Sunday Special Bingo!"
          value={form.title} onChange={e => set('title', e.target.value)} />
      </div>
      <div>
        <label className="input-label">Message *</label>
        <textarea className="input-field resize-none" rows={3}
          placeholder="e.g. Join us for a special holiday game with extra prizes. Doors open at 3:00 PM."
          value={form.message} onChange={e => set('message', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="input-label">Type</label>
          <select className="input-field" value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="info">ℹ️ Info — general notice</option>
            <option value="warning">⚠️ Warning — schedule change / cancellation</option>
            <option value="special">🎉 Special — event / promotion</option>
          </select>
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active}
              onChange={e => set('is_active', e.target.checked)}
              className="rounded border-slate-300 text-orange" />
            <span className="text-sm font-medium text-slate-700">Visible to customers</span>
          </label>
        </div>
        <div>
          <label className="input-label">Show from (optional)</label>
          <input type="datetime-local" className="input-field"
            value={form.starts_at} onChange={e => set('starts_at', e.target.value)} />
        </div>
        <div>
          <label className="input-label">Hide after (optional)</label>
          <input type="datetime-local" className="input-field"
            value={form.ends_at} onChange={e => set('ends_at', e.target.value)} />
        </div>
      </div>
      {error && <p className="text-red-500 text-sm">⚠️ {error}</p>}
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save Announcement'}
        </button>
        <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
      </div>
    </form>
  );
}

export default function AnnouncementsManager() {
  const { token } = useOutletContext();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = () => {
    setLoading(true);
    adminGetAnnouncements(token)
      .then(d => setItems(d.announcements || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const handleCreate = async (form) => {
    await adminCreateAnnouncement(token, form);
    setCreating(false);
    load();
  };

  const handleUpdate = async (id, form) => {
    await adminUpdateAnnouncement(token, id, form);
    setEditingId(null);
    load();
  };

  const handleToggle = async (item) => {
    await adminUpdateAnnouncement(token, item.id, { is_active: !item.is_active });
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    await adminDeleteAnnouncement(token, id);
    load();
  };

  const now = new Date();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-navy">Announcements</h1>
          <p className="text-sm text-slate-500 mt-0.5">Banners shown to customers on the booking page</p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="btn-primary text-sm">
            + New Announcement
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>
      )}

      {/* Create form */}
      {creating && (
        <div className="bg-white rounded-xl border-2 border-orange/30 p-5">
          <h3 className="font-bold text-navy mb-4">New Announcement</h3>
          <AnnouncementForm onSave={handleCreate} onCancel={() => setCreating(false)} />
        </div>
      )}

      {/* Preview note */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 flex items-start gap-2">
        <span>💡</span>
        <span>Active announcements appear as a banner strip between the header and the booking section, visible to all customers.</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
          <p className="text-3xl mb-2">📢</p>
          <p className="font-semibold">No announcements yet</p>
          <p className="text-sm mt-1">Create one to show a message on the booking page.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const style   = TYPE_STYLES[item.type] || TYPE_STYLES.info;
            const isExpired = item.ends_at && new Date(item.ends_at) < now;
            const notStarted = item.starts_at && new Date(item.starts_at) > now;
            const liveStatus = !item.is_active ? 'Off'
              : isExpired ? 'Expired'
              : notStarted ? 'Scheduled'
              : 'Live';

            return (
              <div key={item.id} className={`bg-white rounded-xl border p-4 ${item.is_active && !isExpired && !notStarted ? 'border-slate-200' : 'border-slate-100 opacity-70'}`}>
                {editingId === item.id ? (
                  <>
                    <h3 className="font-bold text-navy mb-4">Edit Announcement</h3>
                    <AnnouncementForm
                      initial={{ ...item, is_active: Boolean(item.is_active) }}
                      onSave={form => handleUpdate(item.id, form)}
                      onCancel={() => setEditingId(null)}
                    />
                  </>
                ) : (
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${style.bg} ${style.border} border flex items-center justify-center text-xl`}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-slate-800">{item.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${style.badge}`}>{item.type}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                          ${liveStatus === 'Live'      ? 'bg-green-100 text-green-700' :
                            liveStatus === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                            liveStatus === 'Expired'   ? 'bg-slate-100 text-slate-400' :
                                                         'bg-red-100 text-red-500'}`}>
                          {liveStatus}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{item.message}</p>
                      {(item.starts_at || item.ends_at) && (
                        <p className="text-xs text-slate-400 mt-1">
                          {item.starts_at && `From ${new Date(item.starts_at).toLocaleString('en-CA', { dateStyle:'medium', timeStyle:'short' })}`}
                          {item.starts_at && item.ends_at && ' · '}
                          {item.ends_at && `Until ${new Date(item.ends_at).toLocaleString('en-CA', { dateStyle:'medium', timeStyle:'short' })}`}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleToggle(item)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors
                          ${item.is_active
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                        {item.is_active ? 'Turn Off' : 'Turn On'}
                      </button>
                      <button onClick={() => setEditingId(item.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(item.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50">
                        Delete
                      </button>
                    </div>
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
