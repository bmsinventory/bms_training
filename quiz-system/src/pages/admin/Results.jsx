import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { InlineLoader } from '../../components/Loading';
import { useToast } from '../../contexts/ToastContext';
import { getAllAttempts, getCourses, supabase } from '../../lib/supabase';
import { fmtDateTime, exportToExcel } from '../../lib/utils';

const Stat = ({ label, value, color, sub }) => (
  <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e2e8f0', padding:'10px 16px' }}>
    <div style={{ fontSize:11, color:'#64748b', marginBottom:3 }}>{label}</div>
    <div style={{ fontSize:22, fontWeight:700, color }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{sub}</div>}
  </div>
);

export default function Results() {
  const toast = useToast();
  const [attempts, setAttempts] = useState([]);
  const [courses, setCourses]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState({ courseId:'', status:'', search:'', from:'', to:'' });

  async function load() {
    setLoading(true);
    try {
      const [all, cs] = await Promise.all([getAllAttempts(filter), getCourses()]);
      setAttempts(all.filter(a => a.status !== 'started'));
      setCourses(cs);
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

  async function handleRevokeCert(a) {
    const certId = a.certificates?.[0]?.cert_id;
    if (!certId) return;
    if (!confirm(`ยกเลิกใบรับรอง ${certId} ของ ${a.full_name}?`)) return;
    await supabase.from('certificates').update({ is_revoked: true }).eq('cert_id', certId);
    toast.success('ยกเลิกใบรับรองสำเร็จ'); load();
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
    input:    { width:'100%', padding:'7px 11px', border:'1px solid #e2e8f0', borderRadius:8, fontFamily:'inherit', fontSize:13, color:'#0f172a', background:'#fff', boxSizing:'border-box' },
  };

  return (
    <div style={s.page}>

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
          <button onClick={handleExport} style={s.btnExport}>⬇️ Export Excel</button>
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
                            <button onClick={() => handleRevokeCert(a)} style={s.btnDanger} title="ยกเลิกใบรับรอง">🚫</button>
                          )}
                          {cert?.is_revoked && (
                            <span style={{ fontSize:11, color:'#dc2626', padding:'4px 8px' }}>ยกเลิกแล้ว</span>
                          )}
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
