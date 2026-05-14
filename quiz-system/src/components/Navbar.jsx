import { Link, useLocation } from 'react-router-dom';

const navLinks = [
  { to: '/',        label: 'ทำแบบทดสอบ',     icon: '📝' },
  { to: '/history', label: 'ค้นหาผลสอบ',      icon: '🔍' },
  { to: '/verify',  label: 'ตรวจสอบใบรับรอง', icon: '🛡️' },
];

export default function Navbar({ siteName = 'BMS Quiz' }) {
  const { pathname } = useLocation();

  return (
    <nav style={{
      position:'sticky', top:0, zIndex:50, background:'#fff',
      borderBottom:'1px solid #e2e8f0', boxShadow:'0 1px 3px rgba(0,0,0,.06)',
      fontFamily:"'Anuphan','Sarabun',sans-serif",
    }}>
      <div style={{
        maxWidth:1024, margin:'0 auto', padding:'0 16px',
        display:'flex', alignItems:'center', justifyContent:'space-between', height:56,
      }}>
        {/* Brand */}
        <Link to="/" style={{
          display:'flex', alignItems:'center', gap:8,
          fontWeight:700, color:'#1d4ed8', fontSize:16, textDecoration:'none',
        }}>
          <span style={{
            background:'#1d4ed8', color:'#fff', width:32, height:32,
            borderRadius:8, display:'inline-flex', alignItems:'center',
            justifyContent:'center', fontSize:14, fontWeight:900,
          }}>B</span>
          {siteName}
        </Link>

        {/* Nav links */}
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          {navLinks.map(l => {
            const active = pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                style={{
                  padding:'6px 12px', borderRadius:8, fontSize:13, fontWeight:500,
                  textDecoration:'none', transition:'background .15s',
                  background: active ? '#eff6ff' : 'transparent',
                  color: active ? '#1d4ed8' : '#475569',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f1f5f9'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
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
