import { Link, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/',        label: 'ทำแบบทดสอบ', icon: '📝' },
  { to: '/history', label: 'ค้นหาผลสอบ', icon: '🔍' },
];

export default function Navbar({ siteName = 'BMS Quiz' }) {
  const { pathname } = useLocation();
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2 font-bold text-blue-700 text-base no-underline">
          <span className="bg-blue-700 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0">
            B
          </span>
          {siteName}
        </Link>
        <div className="flex items-center gap-1">
          {NAV_LINKS.map(l => {
            const active = pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium no-underline transition-colors ${
                  active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-gray-100'
                }`}
              >
                {l.icon} {l.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
