import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Loading from '../../components/Loading';

const NAV_ITEMS = [
  { to: '/admin/courses',   icon: '📚', label: 'หลักสูตร',   shortLabel: 'หลักสูตร' },
  { to: '/admin/results',   icon: '📋', label: 'ผลสอบ',      shortLabel: 'ผลสอบ' },
  { to: '/admin/settings',  icon: '⚙️', label: 'ตั้งค่า',    shortLabel: 'ตั้งค่า' },
];

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

export default function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const isEmbedded = window.self !== window.top;
  const [sideOpen, setSideOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user && !isEmbedded) {
      window.location.replace('#/admin/login');
    }
  }, [user, loading]);

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  if (loading) return <Loading text="กำลังตรวจสอบสิทธิ์..." />;
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-slate-100">

      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-52 bg-white border-r border-slate-200 shrink-0 sticky top-0 h-screen z-20">
        {/* Logo */}
        <div className="px-4 py-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-blue-700 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0">B</div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 leading-tight">BMS Admin</div>
              <div className="text-xs text-slate-500 truncate">{user.username}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-100 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <span>🚪</span> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* ── Mobile Overlay Sidebar ───────────────────────────────────────── */}
      {sideOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSideOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-blue-700 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0">B</div>
                <div>
                  <div className="text-sm font-bold text-slate-900">BMS Admin</div>
                  <div className="text-xs text-slate-500">{user.username}</div>
                </div>
              </div>
              <button
                onClick={() => setSideOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
              {NAV_ITEMS.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSideOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium no-underline transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                    }`
                  }
                >
                  <span className="text-xl leading-none">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Logout */}
            <div className="p-3 border-t border-slate-100 shrink-0">
              <button
                onClick={() => { setSideOpen(false); handleLogout(); }}
                className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <span>🚪</span> ออกจากระบบ
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main Area ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile Top Header */}
        <header className="md:hidden bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 sticky top-0 z-30"
          style={{ height: '52px' }}>
          <button
            onClick={() => setSideOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            <MenuIcon />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-blue-700 text-white w-6 h-6 rounded-md flex items-center justify-center text-xs font-black shrink-0">B</div>
            <span className="text-sm font-bold text-slate-900">BMS Admin</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 text-sm"
            title="ออกจากระบบ"
          >
            🚪
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-5 min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
