import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { InlineLoader } from '../components/Loading';
import { useToast } from '../contexts/ToastContext';
import { getCertificate, getSettings } from '../lib/supabase';
import { fmtDate } from '../lib/utils';

const s = {
  page:  { fontFamily:"'Anuphan','Sarabun',sans-serif", minHeight:'100vh', background:'#f1f5f9' },
  wrap:  { maxWidth:520, margin:'0 auto', padding:'28px 16px 48px' },
  hero:  { textAlign:'center', marginBottom:28 },
  card:  { background:'#fff', borderRadius:14, border:'1px solid #e2e8f0',
           boxShadow:'0 1px 4px rgba(0,0,0,.07)', padding:'20px', marginBottom:14 },
  input: { flex:1, padding:'10px 14px', border:'1px solid #e2e8f0', borderRadius:9,
           fontFamily:'monospace', fontSize:14, color:'#0f172a',
           background:'#fff', outline:'none', textTransform:'uppercase' },
  btn:   { padding:'10px 20px', background:'#2563eb', color:'#fff', border:'none',
           borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer' },
  btnDis:{ padding:'10px 20px', background:'#93c5fd', color:'#fff', border:'none',
           borderRadius:9, fontSize:14, fontWeight:600, cursor:'not-allowed' },
  label: { fontSize:12, fontWeight:600, color:'#334155', marginBottom:6, display:'block' },
  row:   { display:'flex', gap:10, alignItems:'center', marginBottom:8, fontSize:13 },
  rowLbl:{ color:'#94a3b8', width:140, flexShrink:0 },
  rowVal:{ color:'#1e293b', fontWeight:500 },
};

function Row({ label, value, highlight }) {
  return (
    <div style={s.row}>
      <span style={s.rowLbl}>{label}:</span>
      <span style={{ ...s.rowVal, ...(highlight ? { fontSize:15, fontWeight:700 } : {}) }}>
        {value}
      </span>
    </div>
  );
}

export default function Verify() {
  const { certId: paramCertId } = useParams();
  const toast = useToast();

  const [input, setInput]       = useState(paramCertId || '');
  const [cert, setCert]         = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings).catch(console.error);
    if (paramCertId) handleSearch(paramCertId);
  }, [paramCertId]);

  async function handleSearch(id) {
    const certId = (id || input).trim().toUpperCase();
    if (!certId) return;
    setLoading(true); setSearched(false); setNotFound(false); setCert(null);
    try {
      const data = await getCertificate(certId);
      setCert(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  const canSearch = !loading && input.trim();

  return (
    <div style={s.page}>
      <Navbar siteName={settings.site_name} />

      <div style={s.wrap}>
        <div style={s.hero}>
          <div style={{ fontSize:44, marginBottom:10 }}>🛡️</div>
          <div style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:4 }}>ตรวจสอบใบรับรอง</div>
          <div style={{ fontSize:14, color:'#64748b' }}>กรอก Cert ID เพื่อตรวจสอบความถูกต้องของใบรับรอง</div>
        </div>

        {/* Search */}
        <div style={s.card}>
          <label style={s.label}>Cert ID</label>
          <div style={{ display:'flex', gap:10 }}>
            <input
              style={s.input}
              placeholder="เช่น BMS-2024-001234"
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={() => handleSearch()}
              disabled={!canSearch}
              style={canSearch ? s.btn : s.btnDis}
            >
              {loading ? '⏳' : '🔍 ตรวจสอบ'}
            </button>
          </div>
        </div>

        {loading && <InlineLoader text="กำลังตรวจสอบ..." />}

        {/* Not found */}
        {searched && notFound && !loading && (
          <div style={{ ...s.card, borderLeft:'4px solid #dc2626', textAlign:'center' }}>
            <div style={{ fontSize:36, marginBottom:8 }}>❌</div>
            <div style={{ fontWeight:700, color:'#dc2626', fontSize:16, marginBottom:4 }}>ไม่พบใบรับรอง</div>
            <div style={{ fontSize:13, color:'#64748b' }}>
              Cert ID ที่ค้นหาไม่มีในระบบ หรืออาจถูกยกเลิกแล้ว
            </div>
          </div>
        )}

        {/* Found */}
        {cert && !loading && (
          <div style={{ ...s.card, borderLeft:'4px solid #059669' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:22 }}>✅</span>
                  <span style={{ fontWeight:700, color:'#059669', fontSize:16 }}>ใบรับรองถูกต้อง</span>
                </div>
                <div style={{ fontSize:12, color:'#94a3b8' }}>
                  Cert ID: <span style={{ fontFamily:'monospace', fontWeight:600 }}>{cert.cert_id}</span>
                </div>
              </div>
              {cert.pdf_url && (
                <a
                  href={cert.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ padding:'6px 14px', background:'#eff6ff', color:'#2563eb',
                           border:'1px solid #bfdbfe', borderRadius:8, fontSize:12,
                           fontWeight:600, textDecoration:'none' }}
                >
                  ⬇️ PDF
                </a>
              )}
            </div>

            <Row label="ชื่อผู้ถือใบรับรอง" value={cert.full_name}                                highlight />
            <Row label="หลักสูตร"            value={cert.course_name} />
            <Row label="คะแนน"               value={`${cert.score}/${cert.total} (${Math.round(cert.percent)}%)`} />
            <Row label="วันที่ออกใบรับรอง"   value={fmtDate(cert.issued_at)} />
            <Row label="อีเมล"               value={cert.email} />

            <div style={{ marginTop:14, padding:'10px 14px', background:'#ecfdf5',
                          borderRadius:9, display:'flex', alignItems:'center', gap:8,
                          fontSize:13, color:'#065f46' }}>
              <span>🔒</span>
              <span>ใบรับรองนี้ออกโดย <strong>{settings.org_name || settings.site_name}</strong> และได้รับการยืนยันในระบบ</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
