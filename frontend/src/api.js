const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// Sessions
export const getSessions        = ()       => request('/sessions');
export const getSession         = (id)     => request(`/sessions/${id}`);

// Seats
export const getSeats           = (sid)    => request(`/seats/${sid}`);
export const lockSeats          = (body)   => request('/seats/lock', { method: 'POST', body });
export const releaseSeats       = (body)   => request('/seats/lock', { method: 'DELETE', body });

// Bookings
export const createBooking      = (body)   => request('/bookings', { method: 'POST', body });
export const getBooking         = (ref)    => request(`/bookings/${ref}`);

// Packages
export const getPackages        = ()       => request('/packages');

// Admin
export const adminLogin         = (username, password) => request('/admin/login', { method: 'POST', body: { username, password } });
export const adminGetDashboard  = (token)  => request('/admin/dashboard',     { headers: { Authorization: `Bearer ${token}` } });
export const adminGetSessions   = (token)  => request('/admin/sessions',      { headers: { Authorization: `Bearer ${token}` } });
export const adminGetBookings   = (token, params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();
  return request(`/admin/bookings${qs ? '?' + qs : ''}`, { headers: { Authorization: `Bearer ${token}` } });
};
export const adminGetPackages   = (token)  => request('/admin/packages',      { headers: { Authorization: `Bearer ${token}` } });
export const adminCreateSession = (token, body) => request('/admin/sessions', { method: 'POST',  body, headers: { Authorization: `Bearer ${token}` } });
export const adminUpdateSession = (token, id, body) => request(`/admin/sessions/${id}`, { method: 'PUT', body, headers: { Authorization: `Bearer ${token}` } });
export const adminCreatePackage = (token, body) => request('/admin/packages', { method: 'POST',  body, headers: { Authorization: `Bearer ${token}` } });
export const adminUpdatePackage = (token, id, body) => request(`/admin/packages/${id}`, { method: 'PUT', body, headers: { Authorization: `Bearer ${token}` } });

export const adminExportBookings = async (token, params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();
  const res = await fetch(`${BASE}/admin/bookings/export${qs ? '?' + qs : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
};

// WebSocket factory
export function createSeatSocket(onMessage) {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${protocol}://${location.host}`);
  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)); } catch {}
  };
  ws.onerror = () => {};
  return ws;
}
