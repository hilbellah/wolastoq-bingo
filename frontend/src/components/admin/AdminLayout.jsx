import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/admin',                label: 'Dashboard',      icon: '📊', end: true },
  { to: '/admin/bookings',       label: 'Bookings',       icon: '🎟️' },
  { to: '/admin/sessions',       label: 'Sessions',       icon: '📅' },
  { to: '/admin/packages',       label: 'Packages',       icon: '📦' },
  { to: '/admin/announcements',  label: 'Announcements',  icon: '📢' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('adminToken');
    if (!t) {
      navigate('/admin/login');
    } else {
      setToken(t);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  if (!token) return null;

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-60 bg-navy text-white flex flex-col transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        {/* Sidebar header */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎰</span>
            <div>
              <p className="font-extrabold text-sm leading-tight">SMEC Bingo</p>
              <p className="text-xs text-white/50">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                 ${isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/10 space-y-3">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            <span>🔗</span> View Booking Page
          </a>
          <button
            onClick={handleLogout}
            className="w-full text-left flex items-center gap-2 text-xs text-white/50 hover:text-red-300 transition-colors"
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4 sticky top-0 z-20">
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-slate-700">St. Mary's Entertainment Centre</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-slate-400">Admin</span>
            <div className="w-7 h-7 rounded-full bg-navy text-white flex items-center justify-center text-xs font-bold">A</div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet context={{ token }} />
        </main>
      </div>
    </div>
  );
}
