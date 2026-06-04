import { Link, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/',        label: 'ทำแบบทดสอบ', icon: '📝' },
  { to: '/history', label: 'ค้นหาผลสอบ',  icon: '🔍' },
];

export default function Navbar({ siteName = 'BMS Quiz' }) {
  const { pathname } = useLocation();
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 flex items-center justify-between h-14">
        {/* Logo + site name */}
        <Link to="/" className="flex items-center gap-2 font-bold text-blue-700 no-underline min-w-0">
          <span className="bg-blue-700 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0">
            B
          </span>
          <span className="truncate text-sm sm:text-base">{siteName}</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-2">
          {NAV_LINKS.map(l => {
            const active = pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium no-underline transition-colors ${
                  active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-gray-100'
                }`}
              >
                <span>{l.icon}</span>
                <span className="hidden xs:inline sm:inline">{l.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
