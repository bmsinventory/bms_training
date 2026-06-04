import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { InlineLoader } from '../../components/Loading';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { getAllAttempts, getCourses, getLocations, supabase } from '../../lib/supabase';
import { fmtDateTime, exportToExcel } from '../../lib/utils';

function StatCard({ label, value, topColor, valueColor, icon, sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4" style={{ borderTop: `3px solid ${topColor}` }}>
      <div className="text-xl mb-1.5">{icon}</div>
      <div className="font-bold leading-none" style={{ color: valueColor, fontSize: '22px' }}>{value}</div>
      <div className="text-slate-500 mt-1" style={{ fontSize: '11px' }}>{label}</div>
      {sub && <div className="mt-0.5 font-semibold" style={{ color: valueColor, fontSize: '11px' }}>{sub}</div>}
    </div>
  );
}

function ClearBySiteModal({ open, locations, onClose, onDone, toast }) {
  const [site, setSite]       = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preloading, setPreloading] = useState(false);

  useEffect(() => {
    if (!open) { setSite(''); setPreview(null); }
  }, [open]);

  async function handleSiteChange(code) {
    setSite(code);
    setPreview(null);
    if (!code) return;
    setPreloading(true);
    try {
      const locRow = locations.find(l => l.code === code);
      const locId  = locRow?.id ?? null;
      if (!locId) { setPreview({ count: 0, locId: null }); return; }
      const { count } = await supabase.from('quiz_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', locId)
        .neq('status', 'started');
      setPreview({ count: count || 0, locId });
    } catch { toast.error('โหลดข้อมูลไม่สำเร็จ'); }
    finally { setPreloading(false); }
  }

  async function handleClear() {
    if (!preview?.count || !preview.locId) return;
    setLoading(true);
    try {
      const { data } = await supabase.from('quiz_attempts')
        .select('id').eq('location_id', preview.locId).neq('status', 'started');
      const allIds = (data || []).map(a => a.id);
      if (allIds.length) {
        const { error: e1 } = await supabase.from('quiz_answers').delete().in('attempt_id', allIds);
        if (e1) throw new Error('ลบ quiz_answers ไม่สำเร็จ: ' + e1.message);
        const { error: e2 } = await supabase.from('certificates').delete().in('attempt_id', allIds);
        if (e2) throw new Error('ลบ certificates ไม่สำเร็จ: ' + e2.message);
        const { error: e3, count } = await supabase.from('quiz_attempts').delete({ count: 'exact' }).in('id', allIds);
        if (e3) throw new Error('ลบ quiz_attempts ไม่สำเร็จ: ' + e3.message);
        if (count === 0) throw new Error('ไม่มีสิทธิ์ลบข้อมูล — กรุณาตรวจสอบ RLS policy ใน Supabase (quiz_attempts)');
      }
      const loc = locations.find(l => l.code === site);
      toast.success(`ลบข้อมูลสาขา "${loc?.name || site}" สำเร็จ ${allIds.length} รายการ`);
      onDone();
    } catch (e) {
      toast.error('ลบไม่สำเร็จ: ' + e.message);
    } finally { setLoading(false); }
  }

  if (!open) return null;
  const loc = locations.find(l => l.code === site);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-[92%] shadow-2xl">
        <div className="text-base font-bold text-slate-900 mb-1">🗑️ เคียร์ผลสอบตามสาขา</div>
        <div className="text-xs text-slate-500 mb-4">ลบผลสอบทั้งหมดที่เชื่อมกับสาขาที่เลือก</div>
        <select className="form-input mb-3.5"
          value={site} onChange={e => handleSiteChange(e.target.value)}>
          <option value="">— เลือกสาขา —</option>
          {locations.map(l => <option key={l.code} value={l.code}>{l.name} ({l.code})</option>)}
        </select>
        {preloading && <div className="text-sm text-slate-500 text-center py-2">⏳ กำลังตรวจสอบ...</div>}
        {preview && !preloading && (
          <div className={`rounded-xl px-3.5 py-3 mb-4 text-sm border ${preview.count ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className={`font-semibold mb-1 ${preview.count ? 'text-red-800' : 'text-emerald-700'}`}>
              {preview.count ? `⚠️ พบ ${preview.count} รายการที่จะถูกลบ` : '✅ ไม่มีผลสอบในสาขานี้'}
            </div>
            {preview.count > 0 && (
              <div className="text-red-900 text-xs">
                สาขา: <strong>{loc?.name || site}</strong> · ข้อมูลที่ลบจะไม่สามารถกู้คืนได้
              </div>
            )}
          </div>
        )}
        <div className="flex gap-2.5 justify-end">
          <button onClick={onClose} disabled={loading} className="btn btn-secondary btn-sm">ยกเลิก</button>
          <button onClick={handleClear}
            disabled={loading || !preview?.count}
            className="btn btn-danger btn-sm disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? '⏳ กำลังลบ...' : `🗑️ ลบ ${preview?.count || 0} รายการ`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Results() {
  const toast = useToast();
  const [attempts,  setAttempts]  = useState([]);
  const [courses,   setCourses]   = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState({ courseId:'', status:'', search:'', from:'', to:'', locationId:'' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revoking,     setRevoking]     = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [all, cs, locs] = await Promise.all([getAllAttempts(filter), getCourses(), getLocations()]);
      setAttempts(all.filter(a => a.status !== 'started'));
      setCourses(cs);
      setLocations(locs);
    } catch { toast.error('โหลดข้อมูลไม่สำเร็จ'); }
    finally   { setLoading(false); }
  }

  useEffect(() => { load(); }, [JSON.stringify(filter)]);

  function setF(k, v) { setFilter(p => ({ ...p, [k]: v })); }

  function handleExport() {
    const rows = attempts.map(a => ({
      ชื่อ: a.full_name, อีเมล: a.email, แผนก: a.department || '',
      ตำแหน่ง: a.position || '', หลักสูตร: a.courses?.name || '',
      สาขา: a.location?.name || '',
      คะแนน: a.score, คะแนนเต็ม: a.total, เปอร์เซ็นต์: a.percent,
      ผลสอบ: a.status, CertID: a.certificates?.[0]?.cert_id || '',
      วันที่สอบ: fmtDateTime(a.completed_at),
    }));
    exportToExcel(rows, `quiz-results-${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success('ส่งออก Excel สำเร็จ');
  }

  async function handleRevokeCertConfirm() {
    if (!revokeTarget) return;
    const certId = revokeTarget.certificates?.[0]?.cert_id;
    if (!certId) return;
    setRevoking(true);
    try {
      await supabase.from('certificates').update({ is_revoked: true }).eq('cert_id', certId);
      toast.success('ยกเลิกใบรับรองสำเร็จ');
      setRevokeTarget(null);
      load();
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด: ' + e.message);
    } finally { setRevoking(false); }
  }

  async function handleDeleteAttempt() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error: e1 } = await supabase.from('quiz_answers').delete().eq('attempt_id', deleteTarget.id);
      if (e1) throw new Error('ลบ quiz_answers ไม่สำเร็จ: ' + e1.message);
      const { error: e2 } = await supabase.from('certificates').delete().eq('attempt_id', deleteTarget.id);
      if (e2) throw new Error('ลบ certificates ไม่สำเร็จ: ' + e2.message);
      const { error: e3, count } = await supabase.from('quiz_attempts').delete({ count: 'exact' }).eq('id', deleteTarget.id);
      if (e3) throw new Error('ลบ quiz_attempts ไม่สำเร็จ: ' + e3.message);
      if (count === 0) throw new Error('ไม่มีสิทธิ์ลบข้อมูล — กรุณาตรวจสอบ RLS policy ใน Supabase (quiz_attempts)');
      toast.success(`ลบผลสอบของ ${deleteTarget.full_name} สำเร็จ`);
      setAttempts(prev => prev.filter(a => a.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      toast.error('ลบไม่สำเร็จ: ' + e.message);
    } finally { setDeleting(false); }
  }

  const hasFilter = filter.search || filter.courseId || filter.status || filter.from || filter.to || filter.locationId;
  const passCount  = attempts.filter(a => a.status === 'PASS').length;
  const failCount  = attempts.filter(a => a.status === 'FAIL').length;
  const passRate   = attempts.length ? Math.round(passCount / attempts.length * 100) : 0;
  const avgPercent = attempts.length
    ? (attempts.reduce((s, a) => s + (a.percent || 0), 0) / attempts.length).toFixed(1)
    : 0;

  return (
    <div className="text-slate-900">
      <ConfirmDialog
        open={!!deleteTarget}
        title="ลบผลสอบ"
        desc={deleteTarget ? `ลบผลสอบของ "${deleteTarget.full_name}" (${deleteTarget.courses?.name || ''}) — ข้อมูลจะหายถาวร` : ''}
        loading={deleting}
        okLabel="ยืนยันลบ"
        onOk={handleDeleteAttempt}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        open={!!revokeTarget}
        title="ยกเลิกใบรับรอง"
        desc={revokeTarget ? `ยกเลิกใบรับรอง ${revokeTarget.certificates?.[0]?.cert_id} ของ "${revokeTarget.full_name}"?` : ''}
        loading={revoking}
        okLabel="ยืนยันยกเลิก"
        onOk={handleRevokeCertConfirm}
        onCancel={() => setRevokeTarget(null)}
      />
      <ClearBySiteModal
        open={showClearModal}
        locations={locations}
        toast={toast}
        onClose={() => setShowClearModal(false)}
        onDone={() => { setShowClearModal(false); load(); }}
      />

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-5">
        <div>
          <h1 className="font-bold text-slate-900 m-0" style={{ fontSize: '17px' }}>ผลสอบทั้งหมด</h1>
          <p className="text-slate-500 mt-0.5 mb-0" style={{ fontSize: '13px' }}>ค้นหา กรอง และจัดการผลสอบ</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowClearModal(true)} className="btn btn-danger btn-sm">🗑️ เคียร์ตามสาขา</button>
          <button onClick={handleExport} className="btn btn-secondary btn-sm">⬇️ Export</button>
        </div>
      </div>

      {/* Stat cards — 2 cols on mobile, 4 on sm+ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5 mb-4">
        <StatCard label="ผลสอบทั้งหมด" value={attempts.length} topColor="#2563eb" valueColor="#2563eb" icon="📋" />
        <StatCard label="ผ่าน"          value={passCount}       topColor="#059669" valueColor="#059669" icon="✅" sub={`อัตรา ${passRate}%`} />
        <StatCard label="ไม่ผ่าน"       value={failCount}       topColor="#dc2626" valueColor="#dc2626" icon="❌" />
        <StatCard label="คะแนนเฉลี่ย"   value={`${avgPercent}%`} topColor="#d97706" valueColor="#d97706" icon="📊" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 mb-4">
        <div className="font-semibold text-blue-600 flex items-center gap-2 mb-3" style={{ fontSize: '13px' }}>
          🔍 ค้นหาและกรอง
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <input className="form-input" placeholder="ค้นหาชื่อ / อีเมล..."
            value={filter.search} onChange={e => setF('search', e.target.value)} />
          <select className="form-input" value={filter.courseId} onChange={e => setF('courseId', e.target.value)}>
            <option value="">ทุกหลักสูตร</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="form-input" value={filter.locationId} onChange={e => setF('locationId', e.target.value)}>
            <option value="">🌐 ทุกสาขา</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.code ? `${l.code} : ${l.name}` : l.name}</option>)}
          </select>
          <select className="form-input" value={filter.status} onChange={e => setF('status', e.target.value)}>
            <option value="">ทุกผลลัพธ์</option>
            <option value="PASS">✅ PASS</option>
            <option value="FAIL">❌ FAIL</option>
          </select>
          <input type="date" className="form-input" value={filter.from} onChange={e => setF('from', e.target.value)} title="จากวันที่" />
          <input type="date" className="form-input" value={filter.to}   onChange={e => setF('to',   e.target.value)} title="ถึงวันที่" />
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="font-semibold text-blue-600 flex items-center gap-2" style={{ fontSize: '13px' }}>
            <span>📋</span> รายการผลสอบ
            <span className="font-normal text-slate-400" style={{ fontSize: '12px' }}>{attempts.length} รายการ</span>
          </div>
          {hasFilter && (
            <button onClick={() => setFilter({ courseId:'', status:'', search:'', from:'', to:'', locationId:'' })}
              className="btn btn-ghost btn-sm text-xs">
              ล้างตัวกรอง ✕
            </button>
          )}
        </div>

        {loading ? <InlineLoader /> : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse table-responsive">
              <thead>
                <tr>
                  {['#', 'ชื่อ-สกุล', 'หลักสูตร', 'คะแนน', 'ผล', 'สาขา', 'Cert ID', 'วันที่สอบ', 'จัดการ'].map((h, i) => (
                    <th key={h} className={`px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 whitespace-nowrap ${[3,4].includes(i) ? 'text-center' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attempts.map((a, i) => {
                  const cert = a.certificates?.[0];
                  return (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 border-b border-slate-100 text-slate-400" style={{ fontSize: '12px' }} data-label="#">{i + 1}</td>
                      <td className="px-3 py-2 border-b border-slate-100" data-label="ชื่อ-สกุล">
                        <div className="font-semibold text-slate-800 text-wrap" style={{ fontSize: '13px' }}>{a.full_name}</div>
                        <div className="text-slate-400" style={{ fontSize: '11px' }}>{a.email}</div>
                        {a.department && <div className="text-slate-400" style={{ fontSize: '11px' }}>{a.department}</div>}
                      </td>
                      <td className="px-3 py-2 border-b border-slate-100" data-label="หลักสูตร">
                        <div className="text-slate-500 text-wrap" style={{ fontSize: '12px', maxWidth: '160px' }}>{a.courses?.name}</div>
                      </td>
                      <td className="px-3 py-2 border-b border-slate-100 text-center" data-label="คะแนน">
                        <div className="font-bold font-mono text-slate-800" style={{ fontSize: '13px' }}>{a.score}/{a.total}</div>
                        <div className="text-slate-400" style={{ fontSize: '11px' }}>{Math.round(a.percent)}%</div>
                      </td>
                      <td className="px-3 py-2 border-b border-slate-100 text-center" data-label="ผล">
                        <span className={a.status === 'PASS' ? 'badge badge-pass' : 'badge badge-fail'}>{a.status}</span>
                      </td>
                      <td className="px-3 py-2 border-b border-slate-100" data-label="สาขา">
                        <div className="text-slate-500 text-wrap" style={{ fontSize: '12px', maxWidth: '110px' }}>
                          {a.location?.name ?? <span className="text-slate-300">—</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 border-b border-slate-100" data-label="Cert ID">
                        {cert
                          ? <span className="font-mono text-slate-500" style={{ fontSize: '11px' }}>{cert.cert_id}</span>
                          : <span className="text-slate-200">—</span>}
                      </td>
                      <td className="px-3 py-2 border-b border-slate-100 text-slate-500 whitespace-nowrap" style={{ fontSize: '12px' }} data-label="วันที่สอบ">
                        {fmtDateTime(a.completed_at)}
                      </td>
                      <td className="px-3 py-2.5 border-b border-slate-100" data-label="จัดการ">
                        <div className="flex gap-1.5 flex-wrap">
                          <Link to={`/result/${a.id}`} target="_blank" className="btn btn-sm btn-ghost no-underline" title="ดูผลสอบ">👁 ดู</Link>
                          {cert && !cert.is_revoked && (
                            <button onClick={() => setRevokeTarget(a)} className="btn btn-sm btn-danger" title="ยกเลิกใบรับรอง">🚫</button>
                          )}
                          {cert?.is_revoked && (
                            <span className="text-xs text-red-600 px-2 py-1">ยกเลิกแล้ว</span>
                          )}
                          <button onClick={() => setDeleteTarget(a)} className="btn btn-sm btn-danger" title="ลบผลสอบ">🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {attempts.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <div className="text-3xl mb-2.5">📋</div>
                <p style={{ fontSize: '13px' }}>ไม่พบผลสอบที่ตรงกับเงื่อนไข</p>
                {hasFilter && (
                  <button onClick={() => setFilter({ courseId:'', status:'', search:'', from:'', to:'', locationId:'' })}
                    className="mt-3 btn btn-ghost btn-sm">
                    ล้างตัวกรอง
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
