import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { InlineLoader } from '../../components/Loading';
import { getDashboardStats, getAllAttempts } from '../../lib/supabase';
import { fmtDateTime } from '../../lib/utils';

function StatCard({ label, value, topColor, valueColor, icon }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4" style={{ borderTop: `3px solid ${topColor}` }}>
      <div className="text-2xl mb-1.5">{icon}</div>
      <div className="text-3xl font-black leading-none" style={{ color: valueColor }}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function QuickActionCard({ to, icon, title, sub, color }) {
  return (
    <Link to={to}
      className="flex items-center gap-3.5 bg-white rounded-xl border border-slate-200 p-4 no-underline hover:bg-blue-50 transition-colors">
      <div className="text-2xl w-11 h-11 flex items-center justify-center rounded-xl shrink-0"
        style={{ background: `${color}18` }}>
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
      </div>
    </Link>
  );
}

function RecentRow({ a }) {
  const isPass = a.status === 'PASS';
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-3 py-2.5 text-sm font-medium border-b border-slate-100 text-wrap" data-label="ชื่อ">{a.full_name}</td>
      <td className="px-3 py-2.5 text-sm text-slate-500 border-b border-slate-100 max-w-[140px] truncate" data-label="หลักสูตร">{a.courses?.name}</td>
      <td className="px-3 py-2.5 text-sm text-right border-b border-slate-100" data-label="คะแนน">{a.score}/{a.total}</td>
      <td className="px-3 py-2.5 border-b border-slate-100" data-label="ผล">
        <span className={isPass ? 'badge badge-pass' : 'badge badge-fail'}>{a.status}</span>
      </td>
      <td className="px-3 py-2.5 text-xs text-slate-500 border-b border-slate-100 whitespace-nowrap" data-label="วันที่">{fmtDateTime(a.completed_at)}</td>
    </tr>
  );
}

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
    <div className="text-slate-900">

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-900 m-0">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5 mb-0">ภาพรวมระบบแบบทดสอบ</p>
        </div>
        <Link to="/admin/results" className="btn btn-primary btn-sm shrink-0">ดูผลสอบทั้งหมด →</Link>
      </div>

      {/* 4-column stat grid — 2 cols on mobile, 4 on sm+ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5 mb-4">
        <StatCard label="ผู้สอบทั้งหมด" value={stats.total} topColor="#2563eb" valueColor="#2563eb" icon="📝" />
        <StatCard label="ผ่าน"           value={stats.pass}  topColor="#059669" valueColor="#059669" icon="✅" />
        <StatCard label="ไม่ผ่าน"        value={stats.fail}  topColor="#dc2626" valueColor="#dc2626" icon="❌" />
        <StatCard label="ใบรับรอง"       value={stats.certs} topColor="#d97706" valueColor="#d97706" icon="🏆" />
      </div>

      {/* Secondary stats — 1 col on mobile, 3 on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5 mb-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-3xl font-black text-blue-600 leading-none">{passRate}%</div>
          <div className="text-sm text-slate-500 mt-1">อัตราผ่าน</div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2.5">
            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${passRate}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-3xl font-black text-indigo-600 leading-none">{stats.avgPercent}%</div>
          <div className="text-sm text-slate-500 mt-1">คะแนนเฉลี่ย</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-3xl font-black text-teal-600 leading-none">{stats.courses}</div>
          <div className="text-sm text-slate-500 mt-1">หลักสูตรที่เปิด</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
        <QuickActionCard to="/admin/courses"   icon="📚" title="จัดการหลักสูตร" sub="เพิ่ม/แก้ไข/ลบหลักสูตร"  color="#2563eb" />
        <QuickActionCard to="/admin/results"   icon="📋" title="ดูผลสอบ"        sub="ค้นหา กรอง Export"        color="#059669" />
        <QuickActionCard to="/admin/documents" icon="🖨️" title="พิมพ์เอกสาร"   sub="ใบลงชื่อ Stand by / อบรม"  color="#7c3aed" />
        <QuickActionCard to="/admin/settings"  icon="⚙️" title="ตั้งค่าระบบ"   sub="Email, ใบรับรอง, ทั่วไป"  color="#d97706" />
      </div>

      {/* Recent attempts */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-slate-100">
          <span className="text-sm font-semibold text-blue-600 flex items-center gap-2">📋 ผลสอบล่าสุด</span>
          <Link to="/admin/results" className="text-sm text-blue-600 no-underline">ดูทั้งหมด →</Link>
        </div>

        {recent.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">ยังไม่มีผลสอบ</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse table-responsive">
              <thead>
                <tr>
                  {['ชื่อ', 'หลักสูตร', 'คะแนน', 'ผล', 'วันที่'].map((h, i) => (
                    <th key={h} className={`px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 whitespace-nowrap ${i === 2 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map(a => <RecentRow key={a.id} a={a} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
