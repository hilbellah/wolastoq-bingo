import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { adminGetPackages, adminCreatePackage, adminUpdatePackage } from '../../api';

const BLANK = { name: '', description: '', price: '', type: 'optional', is_active: true, sort_order: 99 };

function PackageForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Package name is required'); return; }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) {
      setError('Valid price is required'); return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ ...form, price: Number(form.price) });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="input-label">Package Name *</label>
          <input className="input-field" placeholder="e.g. 12up / Toonie Package"
            value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className="input-label">Price ($) *</label>
          <input type="number" step="0.01" min="0" className="input-field"
            placeholder="18.00" value={form.price}
            onChange={e => set('price', e.target.value)} />
        </div>
        <div>
          <label className="input-label">Type</label>
          <select className="input-field" value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="required">Required (every attendee must have)</option>
            <option value="optional">Optional (add-on)</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="input-label">Description (shown to customers)</label>
          <input className="input-field" placeholder="Brief description of what's included"
            value={form.description || ''} onChange={e => set('description', e.target.value)} />
        </div>
        <div>
          <label className="input-label">Sort Order</label>
          <input type="number" className="input-field" value={form.sort_order || 99}
            onChange={e => set('sort_order', Number(e.target.value))} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active}
              onChange={e => set('is_active', e.target.checked)}
              className="rounded border-slate-300 text-navy" />
            <span className="text-sm font-medium text-slate-700">Active</span>
          </label>
        </div>
      </div>
      {error && <p className="text-red-500 text-sm">⚠️ {error}</p>}
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save Package'}
        </button>
        <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
      </div>
    </form>
  );
}

export default function PackagesManager() {
  const { token } = useOutletContext();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = () => {
    setLoading(true);
    adminGetPackages(token)
      .then(data => setPackages(data.packages || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const required = packages.filter(p => p.type === 'required');
  const optional = packages.filter(p => p.type === 'optional');

  const handleCreate = async (form) => {
    await adminCreatePackage(token, form);
    setCreating(false);
    load();
  };

  const handleUpdate = async (id, form) => {
    await adminUpdatePackage(token, id, form);
    setEditingId(null);
    load();
  };

  const handleToggle = async (pkg) => {
    await adminUpdatePackage(token, pkg.id, { is_active: !pkg.is_active });
    load();
  };

  const PackageCard = ({ pkg }) => (
    <div className={`bg-white rounded-xl border p-4 ${!pkg.is_active ? 'opacity-50' : 'border-slate-200'}`}>
      {editingId === pkg.id ? (
        <>
          <h4 className="font-bold text-navy mb-3">Edit Package</h4>
          <PackageForm
            initial={{ ...pkg, is_active: Boolean(pkg.is_active) }}
            onSave={form => handleUpdate(pkg.id, form)}
            onCancel={() => setEditingId(null)}
          />
        </>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-slate-800">{pkg.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                ${pkg.type === 'required' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                {pkg.type}
              </span>
              {!pkg.is_active && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Inactive</span>
              )}
            </div>
            {pkg.description && (
              <p className="text-xs text-slate-500 mt-0.5">{pkg.description}</p>
            )}
            <p className="text-xl font-extrabold text-navy mt-1">${Number(pkg.price).toFixed(2)}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => handleToggle(pkg)}
              className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors
                ${pkg.is_active
                  ? 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  : 'border-green-200 text-green-600 hover:bg-green-50'}`}
            >
              {pkg.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={() => setEditingId(pkg.id)}
              className="text-xs px-2.5 py-1 rounded-lg border border-navy/20 text-navy hover:bg-navy/5"
            >
              Edit
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-navy">Packages & Pricing</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage ticket packages and pricing</p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="btn-primary text-sm">
            + Add Package
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>
      )}

      {creating && (
        <div className="bg-white rounded-xl border-2 border-navy/30 p-5">
          <h3 className="font-bold text-navy mb-4">New Package</h3>
          <PackageForm onSave={handleCreate} onCancel={() => setCreating(false)} />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-navy" />
        </div>
      ) : (
        <>
          {/* Required packages */}
          <div>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
              Required Packages
            </h2>
            <p className="text-xs text-slate-400 mb-3">Every attendee must select exactly one required package.</p>
            {required.length > 0 ? (
              <div className="space-y-3">
                {required.map(p => <PackageCard key={p.id} pkg={p} />)}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No required packages. Add one above.</p>
            )}
          </div>

          {/* Optional packages */}
          <div>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
              Optional Add-ons
            </h2>
            <p className="text-xs text-slate-400 mb-3">Customers can add these to their booking per person.</p>
            {optional.length > 0 ? (
              <div className="space-y-3">
                {optional.map(p => <PackageCard key={p.id} pkg={p} />)}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No optional packages yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
