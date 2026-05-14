import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useToast } from '../contexts/ToastContext';
import { supabase, getSettings, uploadCertPdf, updateCertificatePdf } from '../lib/supabase';
import { isValidEmail } from '../lib/utils';
import { generateCertPDF } from '../lib/certificate';
import { sendCertEmail } from '../lib/email';

const s = {
  page:  { fontFamily:"'Anuphan','Sarabun',sans-serif", minHeight:'100vh', background:'#f1f5f9' },
  wrap:  { maxWidth:480, margin:'0 auto', padding:'28px 16px 48px' },
  hero:  { textAlign:'center', marginBottom:28 },
  card:  { background:'#fff', borderRadius:14, border:'1px solid #e2e8f0',
           boxShadow:'0 1px 4px rgba(0,0,0,.07)', padding:'22px' },
  fGroup:{ marginBottom:16 },
  label: { display:'block', fontSize:13, fontWeight:600, color:'#334155', marginBottom:5 },
  input: { width:'100%', padding:'10px 13px', border:'1px solid #e2e8f0', borderRadius:9,
           fontFamily:"'Anuphan','Sarabun',sans-serif", fontSize:14, color:'#0f172a',
           background:'#fff', boxSizing:'border-box', outline:'none' },
  hint:  { fontSize:12, color:'#94a3b8', marginTop:4 },
  warn:  { fontSize:12, color:'#b45309', marginTop:4 },
  info:  { background:'#f8fafc', borderRadius:9, padding:'12px 14px', marginBottom:16, fontSize:13 },
  infoLbl:{ color:'#94a3b8' },
  infoVal:{ color:'#0f172a', fontWeight:600 },
  btnPrimary:{ width:'100%', padding:'12px', background:'#2563eb', color:'#fff',
               border:'none', borderRadius:10, fontSize:15, fontWeight:700,
               cursor:'pointer', display:'flex', alignItems:'center',
               justifyContent:'center', gap:8 },
  btnDis:{ width:'100%', padding:'12px', background:'#93c5fd', color:'#fff',
           border:'none', borderRadius:10, fontSize:15, fontWeight:700,
           cursor:'not-allowed', display:'flex', alignItems:'center',
           justifyContent:'center', gap:8 },
  btnSecondary:{ flex:1, padding:'11px', background:'#fff', color:'#374151',
                  border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14,
                  fontWeight:600, cursor:'pointer', display:'flex',
                  alignItems:'center', justifyContent:'center', gap:6 },
};

export default function ResendCert() {
  const toast = useToast();

  const [step, setStep]         = useState(1);
  const [certId, setCertId]     = useState('');
  const [cert, setCert]         = useState(null);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);

  async function handleVerifyCert(e) {
    e.preventDefault();
    if (!certId.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('cert_id', certId.trim().toUpperCase())
        .eq('is_revoked', false)
        .single();
      if (error || !data) throw new Error('not found');
      setCert(data);
      setNewEmail(data.email);
      setStep(2);
    } catch {
      toast.error('ไม่พบ Cert ID นี้ในระบบ');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend(e) {
    e.preventDefault();
    if (!isValidEmail(newEmail)) { toast.error('รูปแบบอีเมลไม่ถูกต้อง'); return; }
    setLoading(true);
    try {
      const settings = await getSettings();
      if (newEmail.toLowerCase() !== cert.email.toLowerCase()) {
        await supabase.from('certificates')
          .update({ email: newEmail.toLowerCase() })
          .eq('cert_id', cert.cert_id);
      }
      const verifyUrl = `${settings.verify_base_url || window.location.origin + '/verify'}/${cert.cert_id}`;
      const blob = await generateCertPDF({ ...cert, email: newEmail }, settings, verifyUrl);
      let pdfUrl = cert.pdf_url;
      if (!pdfUrl) {
        pdfUrl = await uploadCertPdf(cert.cert_id, blob);
        await updateCertificatePdf(cert.cert_id, pdfUrl);
      }
      await sendCertEmail({
        toEmail: newEmail, toName: cert.full_name, certId: cert.cert_id,
        courseName: cert.course_name, score: cert.score, total: cert.total,
        percent: cert.percent, issuedAt: cert.issued_at, pdfUrl,
        attemptId: cert.attempt_id, settings,
      });
      setDone(true);
      toast.success(`ส่งใบรับรองไปยัง ${newEmail} สำเร็จ`);
    } catch (err) {
      toast.error('ส่งอีเมลไม่สำเร็จ กรุณาตรวจสอบการตั้งค่า');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.wrap}>

        <div style={s.hero}>
          <div style={{ fontSize:44, marginBottom:10 }}>📧</div>
          <div style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:4 }}>ขอส่งใบรับรองใหม่</div>
          <div style={{ fontSize:14, color:'#64748b' }}>แก้ไขอีเมลและส่งใบรับรองซ้ำ</div>
        </div>

        {done ? (
          <div style={{ ...s.card, textAlign:'center' }}>
            <div style={{ fontSize:44, marginBottom:10 }}>🎉</div>
            <div style={{ fontWeight:700, color:'#059669', fontSize:20, marginBottom:8 }}>ส่งสำเร็จ!</div>
            <div style={{ fontSize:14, color:'#64748b', marginBottom:20 }}>
              ส่งใบรับรองไปยัง <strong>{newEmail}</strong> แล้ว
            </div>
            <Link to="/" style={{
              display:'flex', alignItems:'center', justifyContent:'center',
              padding:'12px', background:'#2563eb', color:'#fff', textDecoration:'none',
              borderRadius:10, fontSize:15, fontWeight:700,
            }}>
              ← กลับหน้าหลัก
            </Link>
          </div>

        ) : step === 1 ? (
          <div style={s.card}>
            <div style={{ fontSize:15, fontWeight:700, color:'#0f172a', marginBottom:16 }}>
              ขั้นตอน 1: ยืนยัน Cert ID
            </div>
            <form onSubmit={handleVerifyCert}>
              <div style={s.fGroup}>
                <label style={s.label}>Cert ID</label>
                <input
                  style={{ ...s.input, fontFamily:'monospace', textTransform:'uppercase' }}
                  placeholder="เช่น BMS-2024-001234"
                  value={certId}
                  onChange={e => setCertId(e.target.value.toUpperCase())}
                  required
                />
                <div style={s.hint}>Cert ID อยู่บนใบรับรองของคุณ</div>
              </div>
              <button type="submit" disabled={loading} style={loading ? s.btnDis : s.btnPrimary}>
                {loading ? '⏳ กำลังตรวจสอบ...' : 'ถัดไป →'}
              </button>
            </form>
          </div>

        ) : (
          <div style={s.card}>
            <div style={{ fontSize:15, fontWeight:700, color:'#0f172a', marginBottom:4 }}>
              ขั้นตอน 2: ยืนยันและส่งใหม่
            </div>
            <div style={{ fontSize:12, color:'#94a3b8', marginBottom:16 }}>
              Cert ID: <span style={{ fontFamily:'monospace', color:'#2563eb', fontWeight:600 }}>{cert?.cert_id}</span>
            </div>

            <div style={s.info}>
              <div><span style={s.infoLbl}>ชื่อ: </span><span style={s.infoVal}>{cert?.full_name}</span></div>
              <div style={{ marginTop:4 }}><span style={s.infoLbl}>หลักสูตร: </span><span style={s.infoVal}>{cert?.course_name}</span></div>
            </div>

            <form onSubmit={handleResend}>
              <div style={s.fGroup}>
                <label style={s.label}>อีเมลที่จะส่งใบรับรอง</label>
                <input
                  type="email"
                  style={s.input}
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  required
                />
                {newEmail.toLowerCase() !== cert?.email?.toLowerCase() && (
                  <div style={s.warn}>⚠️ อีเมลแตกต่างจากที่ลงทะเบียนไว้</div>
                )}
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button type="button" onClick={() => setStep(1)} style={s.btnSecondary}>
                  ← ย้อนกลับ
                </button>
                <button type="submit" disabled={loading}
                  style={{ ...s.btnPrimary, flex:1, width:'auto', padding:'11px' }}>
                  {loading ? '⏳ กำลังส่ง...' : '📧 ส่งใบรับรอง'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
