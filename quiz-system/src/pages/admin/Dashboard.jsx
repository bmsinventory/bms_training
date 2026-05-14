import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { InlineLoader } from '../../components/Loading';
import { getDashboardStats, getAllAttempts } from '../../lib/supabase';
import { fmtDateTime } from '../../lib/utils';

export default function Dashboard() {
  const [stats, setStats]     = useState(null);
  const [recent, setRecent]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardStats(), getAllAttempts()])
      .then(([s, all]) => {
        setStats(s);
        setRecent(all.filter(a => a.status !== 'started').slice(0, 10));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <InlineLoader text="กำลังโหลด..." />;

  const passRate = stats.total > 0 ? Math.round((stats.pass / stats.total) * 100) : 0;

  return (
    <div style={{ fontFamily: "'Anuphan','Sarabun',sans-serif", color: '#0f172a' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 2, marginBottom: 0 }}>ภาพรวมระบบแบบทดสอบ</p>
        </div>
        <Link
          to="/admin/results"
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', textDecoration: 'none' }}
        >
          ดูผลสอบทั้งหมด →
        </Link>
      </div>

      {/* 4-column stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
        <StatCard label="ผู้สอบทั้งหมด" value={stats.total}     topColor="#2563eb" valueColor="#2563eb" icon="📝" />
        <StatCard label="ผ่าน"           value={stats.pass}      topColor="#059669" valueColor="#059669" icon="✅" />
        <StatCard label="ไม่ผ่าน"        value={stats.fail}      topColor="#dc2626" valueColor="#dc2626" icon="❌" />
        <StatCard label="ใบรับรอง"       value={stats.certs}     topColor="#d97706" valueColor="#d97706" icon="🏆" />
      </div>

      {/* Secondary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 16 }}>
        {/* Pass rate with progress bar */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#2563eb', lineHeight: 1.1 }}>{passRate}%</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>อัตราผ่าน</div>
          <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginTop: 10 }}>
            <div style={{ height: '100%', width: `${passRate}%`, background: '#2563eb', borderRadius: 3, transition: 'width .4s' }} />
          </div>
        </div>

        {/* Average score */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#4f46e5', lineHeight: 1.1 }}>{stats.avgPercent}%</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>คะแนนเฉลี่ย</div>
        </div>

        {/* Courses */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#0d9488', lineHeight: 1.1 }}>{stats.courses}</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>หลักสูตรที่เปิด</div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 16 }}>
        <QuickActionCard to="/admin/courses"  icon="📚" title="จัดการหลักสูตร" sub="เพิ่ม/แก้ไข/ลบหลักสูตร"    color="#2563eb" />
        <QuickActionCard to="/admin/results"  icon="📋" title="ดูผลสอบ"        sub="ค้นหา กรอง Export"          color="#059669" />
        <QuickActionCard to="/admin/settings" icon="⚙️" title="ตั้งค่าระบบ"   sub="Email, ใบรับรอง, ทั่วไป"   color="#d97706" />
      </div>

      {/* Recent attempts */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18 }}>
        {/* Card header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, marginBottom: 14, borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 8 }}>
            📋 ผลสอบล่าสุด
          </span>
          <Link to="/admin/results" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>ดูทั้งหมด →</Link>
        </div>

        {recent.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b', fontSize: 14 }}>ยังไม่มีผลสอบ</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '9px 12px', fontSize: 12, fontWeight: 600, color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>ชื่อ</th>
                  <th style={{ textAlign: 'left', padding: '9px 12px', fontSize: 12, fontWeight: 600, color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>หลักสูตร</th>
                  <th style={{ textAlign: 'right', padding: '9px 12px', fontSize: 12, fontWeight: 600, color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>คะแนน</th>
                  <th style={{ textAlign: 'left', padding: '9px 12px', fontSize: 12, fontWeight: 600, color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>ผล</th>
                  <th style={{ textAlign: 'left', padding: '9px 12px', fontSize: 12, fontWeight: 600, color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>วันที่</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(a => (
                  <RecentRow key={a.id} a={a} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- sub-components ---------- */

function StatCard({ label, value, topColor, valueColor, icon }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18, borderTop: `3px solid ${topColor}` }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: valueColor, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function QuickActionCard({ to, icon, title, sub, color }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={to}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        background: hovered ? '#eff6ff' : '#fff',
        borderRadius: 12, border: '1px solid #e2e8f0',
        padding: 16, textDecoration: 'none',
        transition: 'background .15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ fontSize: 26, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}18`, borderRadius: 10, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{title}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{sub}</div>
      </div>
    </Link>
  );
}

function RecentRow({ a }) {
  const [hovered, setHovered] = useState(false);
  const tdBase = { padding: '9px 12px', fontSize: 13, borderBottom: '1px solid #f1f5f9', color: '#0f172a', verticalAlign: 'middle', background: hovered ? '#f8fafc' : 'transparent' };
  const isPass = a.status === 'PASS';
  return (
    <tr onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <td style={{ ...tdBase, fontWeight: 500 }}>{a.full_name}</td>
      <td style={{ ...tdBase, color: '#64748b', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.courses?.name}</td>
      <td style={{ ...tdBase, textAlign: 'right' }}>{a.score}/{a.total}</td>
      <td style={tdBase}>
        <span style={isPass
          ? { display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#ecfdf5', color: '#065f46' }
          : { display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#fef2f2', color: '#991b1b' }
        }>
          {a.status}
        </span>
      </td>
      <td style={{ ...tdBase, color: '#64748b', fontSize: 12 }}>{fmtDateTime(a.completed_at)}</td>
    </tr>
  );
}
