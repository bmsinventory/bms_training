import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { InlineLoader } from '../../components/Loading';
import { useToast } from '../../contexts/ToastContext';
import { getAllAttempts, getCourses, getLocations, supabase } from '../../lib/supabase';
import { fmtDateTime, exportToExcel } from '../../lib/utils';

const Stat = ({ label, value, color, sub }) => (
  <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e2e8f0', padding:'10px 16px' }}>
    <div style={{ fontSize:11, color:'#64748b', marginBottom:3 }}>{label}</div>
    <div style={{ fontSize:22, fontWeight:700, color }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{sub}</div>}
  </div>
);

/* ── Confirm dialog ── */
function ConfirmDialog({ open, title, desc, danger, onOk, onCancel, loading }) {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:9999,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:14, padding:'28px 28px 22px', maxWidth:380, width:'90%',
                    boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ fontSize:16, fontWeight:700, color:'#0f172a', marginBottom:8 }}>{title}</div>
        {desc && <div style={{ fontSize:13, color:'#64748b', marginBottom:20, lineHeight:1.6 }}>{desc}</div>}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onCancel} disabled={loading}
            style={{ background:'transparent', border:'1px solid #e2e8f0', borderRadius:8,
                     padding:'7px 16px', fontSize:13, cursor:'pointer', color:'#64748b' }}>
            ยกเลิก
          </button>
          <button onClick={onOk} disabled={loading}
            style={{ background: danger ? '#dc2626' : '#2563eb', color:'#fff', border:'none',
                     borderRadius:8, padding:'7px 18px', fontSize:13, fontWeight:600,
                     cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? '⏳ กำลังลบ...' : 'ยืนยันลบ'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Clear by site modal ── */
function ClearBySiteModal({ open, locations, onClose, onDone, toast }) {
  const [site, setSite]       = useState('');
  const [preview, setPreview] = useState(null); // { count, courseIds }
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
      // Get category IDs for this site
      const { data: cats } = await supabase.from('categories').select('id').eq('site', code);
      const catIds = (cats || []).map(c => c.id);
      if (!catIds.length) { setPreview({ count: 0, courseIds: [] }); return; }

      // Get course IDs via junction table
      const { data: links } = await supabase.from('course_categories').select('course_id').in('category_id', catIds);
      // fallback: old category_id column
      const { data: directCourses } = await supabase.from('courses').select('id').in('category_id', catIds);
      const courseIdSet = new Set([
        ...(links || []).map(l => l.course_id),
        ...(directCourses || []).map(c => c.id),
      ]);
      const courseIds = [...courseIdSet];
      if (!courseIds.length) { setPreview({ count: 0, courseIds: [] }); return; }

      // Count attempts
      const { count } = await supabase.from('quiz_attempts')
        .select('id', { count: 'exact', head: true })
        .in('course_id', courseIds)
        .neq('status', 'started');
      setPreview({ count: count || 0, courseIds });
    } catch { toast.error('โหลดข้อมูลไม่สำเร็จ'); }
    finally { setPreloading(false); }
  }

  async function handleClear() {
    if (!preview?.courseIds?.length) return;
    setLoading(true);
    try {
      // Get attempt IDs for these courses
      const { data: attempts } = await supabase.from('quiz_attempts')
        .select('id').in('course_id', preview.courseIds).neq('status', 'started');
      const attemptIds = (attempts || []).map(a => a.id);
      if (attemptIds.length) {
        const { error: e1 } = await supabase.from('quiz_answers').delete().in('attempt_id', attemptIds);
        if (e1) throw new Error('ลบ quiz_answers ไม่สำเร็จ: ' + e1.message);
        const { error: e2 } = await supabase.from('certificates').delete().in('attempt_id', attemptIds);
        if (e2) throw new Error('ลบ certificates ไม่สำเร็จ: ' + e2.message);
        const { error: e3, count } = await supabase.from('quiz_attempts').delete({ count: 'exact' }).in('id', attemptIds);
        if (e3) throw new Error('ลบ quiz_attempts ไม่สำเร็จ: ' + e3.message);
        if (count === 0) throw new Error('ไม่มีสิทธิ์ลบข้อมูล — กรุณาตรวจสอบ RLS policy ใน Supabase (quiz_attempts)');
      }
      const loc = locations.find(l => l.code === site);
      toast.success(`ลบข้อมูลสาขา "${loc?.name || site}" สำเร็จ ${attemptIds.length} รายการ`);
      onDone();
    } catch (e) {
      toast.error('ลบไม่สำเร็จ: ' + e.message);
    } finally { setLoading(false); }
  }

  if (!open) return null;
  const loc = locations.find(l => l.code === site);
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:9999,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:14, padding:'24px', maxWidth:420, width:'92%',
                    boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ fontSize:15, fontWeight:700, color:'#0f172a', marginBottom:4 }}>🗑️ เคียร์ผลสอบตามสาขา</div>
        <div style={{ fontSize:12, color:'#64748b', marginBottom:18 }}>ลบผลสอบทั้งหมดที่เชื่อมกับหลักสูตรของสาขาที่เลือก</div>

        <select value={site} onChange={e => handleSiteChange(e.target.value)}
          style={{ width:'100%', padding:'8px 11px', border:'1px solid #e2e8f0', borderRadius:8,
                   fontFamily:'inherit', fontSize:13, color:'#0f172a', background:'#fff', marginBottom:14 }}>
          <option value="">— เลือกสาขา —</option>
          {locations.map(l => <option key={l.code} value={l.code}>{l.name} ({l.code})</option>)}
        </select>

        {preloading && <div style={{ fontSize:13, color:'#64748b', textAlign:'center', padding:'8px 0' }}>⏳ กำลังตรวจสอบ...</div>}

        {preview && !preloading && (
          <div style={{ background: preview.count ? '#fef2f2' : '#f0fdf4',
                        border: `1px solid ${preview.count ? '#fecaca' : '#bbf7d0'}`,
                        borderRadius:9, padding:'12px 14px', marginBottom:16, fontSize:13 }}>
            <div style={{ fontWeight:600, color: preview.count ? '#991b1b' : '#065f46', marginBottom:4 }}>
              {preview.count ? `⚠️ พบ ${preview.count} รายการที่จะถูกลบ` : '✅ ไม่มีผลสอบในสาขานี้'}
            </div>
            {preview.count > 0 && (
              <div style={{ color:'#7f1d1d', fontSize:12 }}>
                สาขา: <strong>{loc?.name || site}</strong> · ข้อมูลที่ลบจะไม่สามารถกู้คืนได้
              </div>
            )}
          </div>
        )}

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} disabled={loading}
            style={{ background:'transparent', border:'1px solid #e2e8f0', borderRadius:8,
                     padding:'7px 16px', fontSize:13, cursor:'pointer', color:'#64748b' }}>
            ยกเลิก
          </button>
          <button onClick={handleClear}
            disabled={loading || !preview?.count}
            style={{ background:'#dc2626', color:'#fff', border:'none', borderRadius:8,
                     padding:'7px 18px', fontSize:13, fontWeight:600,
                     cursor: (loading || !preview?.count) ? 'not-allowed' : 'pointer',
                     opacity: (loading || !preview?.count) ? 0.5 : 1 }}>
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
  const [filter,    setFilter]    = useState({ courseId:'', status:'', search:'', from:'', to:'' });

  // Delete single
  const [deleteTarget, setDeleteTarget] = useState(null); // attempt object
  const [deleting,     setDeleting]     = useState(false);

  // Revoke cert confirm
  const [revokeTarget, setRevokeTarget] = useState(null); // attempt object
  const [revoking,     setRevoking]     = useState(false);

  // Clear by site modal
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

      const { error: e3, count } = await supabase
        .from('quiz_attempts').delete({ count: 'exact' }).eq('id', deleteTarget.id);
      if (e3) throw new Error('ลบ quiz_attempts ไม่สำเร็จ: ' + e3.message);
      if (count === 0) throw new Error('ไม่มีสิทธิ์ลบข้อมูล — กรุณาตรวจสอบ RLS policy ใน Supabase (quiz_attempts)');

      toast.success(`ลบผลสอบของ ${deleteTarget.full_name} สำเร็จ`);
      setAttempts(prev => prev.filter(a => a.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      toast.error('ลบไม่สำเร็จ: ' + e.message);
    } finally { setDeleting(false); }
  }

  const passCount  = attempts.filter(a => a.status === 'PASS').length;
  const failCount  = attempts.filter(a => a.status === 'FAIL').length;
  const passRate   = attempts.length ? Math.round(passCount / attempts.length * 100) : 0;
  const avgPercent = attempts.length
    ? (attempts.reduce((s, a) => s + (a.percent || 0), 0) / attempts.length).toFixed(1)
    : 0;

  /* ── styles ── */
  const s = {
    page:     { fontFamily:"'Anuphan','Sarabun',sans-serif", fontSize:14 },
    grid4:    { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 },
    card:     { background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', marginBottom:14, overflow:'hidden' },
    filterWrap:{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', padding:'12px 16px', marginBottom:14 },
    cardHd:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 18px', borderBottom:'1px solid #f1f5f9' },
    cardTitle:{ fontSize:14, fontWeight:600, color:'#2563eb', display:'flex', alignItems:'center', gap:8 },
    th:       { textAlign:'left', padding:'9px 12px', fontSize:12, fontWeight:600, color:'#64748b', background:'#f8fafc', borderBottom:'1px solid #e2e8f0', whiteSpace:'nowrap' },
    td:       { padding:'9px 12px', fontSize:13, borderBottom:'1px solid #f1f5f9', color:'#0f172a', verticalAlign:'middle' },
    badgePass:{ display:'inline-flex', alignItems:'center', padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:600, background:'#ecfdf5', color:'#065f46' },
    badgeFail:{ display:'inline-flex', alignItems:'center', padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:600, background:'#fef2f2', color:'#991b1b' },
    btnGhost: { background:'transparent', color:'#64748b', border:'1px solid #e2e8f0', borderRadius:7, padding:'4px 10px', fontSize:12, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4 },
    btnDanger:{ background:'transparent', color:'#dc2626', border:'1px solid #fecaca', borderRadius:7, padding:'4px 10px', fontSize:12, cursor:'pointer' },
    btnExport:{ background:'transparent', color:'#64748b', border:'1px solid #e2e8f0', borderRadius:8, padding:'6px 14px', fontSize:13, fontWeight:500, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 },
    btnClear: { background:'transparent', color:'#dc2626', border:'1px solid #fecaca', borderRadius:8, padding:'6px 14px', fontSize:13, fontWeight:500, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 },
    input:    { width:'100%', padding:'7px 11px', border:'1px solid #e2e8f0', borderRadius:8, fontFamily:'inherit', fontSize:13, color:'#0f172a', background:'#fff', boxSizing:'border-box' },
  };

  return (
    <div style={s.page}>

      {/* Modals */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="ลบผลสอบ"
        desc={deleteTarget ? `ลบผลสอบของ "${deleteTarget.full_name}" (${deleteTarget.courses?.name || ''}) — ข้อมูลจะหายถาวร` : ''}
        danger
        loading={deleting}
        onOk={handleDeleteAttempt}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        open={!!revokeTarget}
        title="ยกเลิกใบรับรอง"
        desc={revokeTarget ? `ยกเลิกใบรับรอง ${revokeTarget.certificates?.[0]?.cert_id} ของ "${revokeTarget.full_name}"?` : ''}
        danger
        loading={revoking}
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

      {/* Stats */}
      <div style={s.grid4}>
        <Stat label="ผลสอบทั้งหมด"  value={attempts.length} color="#2563eb" />
        <Stat label="ผ่าน"           value={passCount}       color="#059669" sub={`อัตรา ${passRate}%`} />
        <Stat label="ไม่ผ่าน"        value={failCount}       color="#dc2626" />
        <Stat label="คะแนนเฉลี่ย"    value={`${avgPercent}%`} color="#d97706" />
      </div>

      {/* Filters */}
      <div style={s.filterWrap}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 1fr 1fr 1fr', gap:8 }}>
          <input style={s.input} placeholder="🔍 ค้นหาชื่อ / อีเมล..."
            value={filter.search} onChange={e => setF('search', e.target.value)} />
          <select style={s.input} value={filter.courseId} onChange={e => setF('courseId', e.target.value)}>
            <option value="">ทุกหลักสูตร</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select style={s.input} value={filter.status} onChange={e => setF('status', e.target.value)}>
            <option value="">ทุกผลลัพธ์</option>
            <option value="PASS">✅ PASS</option>
            <option value="FAIL">❌ FAIL</option>
          </select>
          <input type="date" style={s.input} value={filter.from} onChange={e => setF('from', e.target.value)} title="จากวันที่" />
          <input type="date" style={s.input} value={filter.to}   onChange={e => setF('to',   e.target.value)} title="ถึงวันที่" />
        </div>
      </div>

      {/* Table card */}
      <div style={s.card}>
        <div style={s.cardHd}>
          <div style={s.cardTitle}>
            <span>📋</span> ผลสอบทั้งหมด
            <span style={{ fontSize:12, fontWeight:400, color:'#94a3b8' }}>{attempts.length} รายการ</span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setShowClearModal(true)} style={s.btnClear}>🗑️ เคียร์ตามสาขา</button>
            <button onClick={handleExport} style={s.btnExport}>⬇️ Export Excel</button>
          </div>
        </div>

        {loading ? <InlineLoader /> : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...s.th, width:36 }}>#</th>
                  <th style={s.th}>ชื่อ-สกุล</th>
                  <th style={s.th}>หลักสูตร</th>
                  <th style={{ ...s.th, textAlign:'center' }}>คะแนน</th>
                  <th style={{ ...s.th, textAlign:'center' }}>ผล</th>
                  <th style={s.th}>Cert ID</th>
                  <th style={s.th}>วันที่สอบ</th>
                  <th style={s.th}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a, i) => {
                  const cert = a.certificates?.[0];
                  return (
                    <tr key={a.id}
                      onMouseEnter={e => e.currentTarget.querySelectorAll('td').forEach(td => td.style.background='#f8fafc')}
                      onMouseLeave={e => e.currentTarget.querySelectorAll('td').forEach(td => td.style.background='')}>
                      <td style={{ ...s.td, color:'#94a3b8', fontSize:12 }}>{i + 1}</td>
                      <td style={s.td}>
                        <div style={{ fontWeight:600 }}>{a.full_name}</div>
                        <div style={{ fontSize:11, color:'#94a3b8' }}>{a.email}</div>
                        {a.department && <div style={{ fontSize:11, color:'#94a3b8' }}>{a.department}</div>}
                      </td>
                      <td style={s.td}>
                        <div style={{ fontSize:12, color:'#475569', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {a.courses?.name}
                        </div>
                      </td>
                      <td style={{ ...s.td, textAlign:'center' }}>
                        <div style={{ fontWeight:700, fontFamily:'monospace' }}>{a.score}/{a.total}</div>
                        <div style={{ fontSize:11, color:'#94a3b8' }}>{Math.round(a.percent)}%</div>
                      </td>
                      <td style={{ ...s.td, textAlign:'center' }}>
                        <span style={a.status === 'PASS' ? s.badgePass : s.badgeFail}>{a.status}</span>
                      </td>
                      <td style={s.td}>
                        {cert
                          ? <span style={{ fontFamily:'monospace', fontSize:12, color:'#475569' }}>{cert.cert_id}</span>
                          : <span style={{ color:'#e2e8f0' }}>—</span>}
                      </td>
                      <td style={{ ...s.td, fontSize:12, color:'#64748b', whiteSpace:'nowrap' }}>
                        {fmtDateTime(a.completed_at)}
                      </td>
                      <td style={s.td}>
                        <div style={{ display:'flex', gap:5 }}>
                          <Link to={`/result/${a.id}`} target="_blank" style={{ ...s.btnGhost, textDecoration:'none' }} title="ดูผลสอบ">👁 ดู</Link>
                          {cert && !cert.is_revoked && (
                            <button onClick={() => setRevokeTarget(a)} style={s.btnDanger} title="ยกเลิกใบรับรอง">🚫</button>
                          )}
                          {cert?.is_revoked && (
                            <span style={{ fontSize:11, color:'#dc2626', padding:'4px 8px' }}>ยกเลิกแล้ว</span>
                          )}
                          <button onClick={() => setDeleteTarget(a)} style={s.btnDanger} title="ลบผลสอบ">🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {attempts.length === 0 && (
              <div style={{ textAlign:'center', padding:'48px 0', color:'#94a3b8' }}>
                <div style={{ fontSize:40, marginBottom:10 }}>📋</div>
                <p>ไม่พบผลสอบที่ตรงกับเงื่อนไข</p>
                {(filter.search || filter.courseId || filter.status || filter.from || filter.to) && (
                  <button onClick={() => setFilter({ courseId:'', status:'', search:'', from:'', to:'' })}
                    style={{ marginTop:12, background:'transparent', border:'1px solid #e2e8f0', borderRadius:8, padding:'6px 16px', fontSize:13, cursor:'pointer', color:'#64748b' }}>
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