import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { InlineLoader } from '../components/Loading';
import { useToast } from '../contexts/ToastContext';
import {
  getAttempt, getCertificateByAttempt, updateCertificatePdf,
  uploadCertPdf, getSettings,
} from '../lib/supabase';
import { generateCertPDF, generateQR } from '../lib/certificate';
import { downloadBlob } from '../lib/utils';
import { sendCertEmail } from '../lib/email';
import CertPreviewCard from '../components/CertPreviewCard';

const s = {
  page:    { fontFamily:"'Anuphan','Sarabun',sans-serif", minHeight:'100vh', background:'#f1f5f9' },
  wrap:    { maxWidth:800, margin:'0 auto', padding:'28px 16px 48px' },
  hero:    { textAlign:'center', marginBottom:28 },

  previewCard:{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0',
                boxShadow:'0 1px 4px rgba(0,0,0,.07)', marginBottom:16,
                overflow:'hidden', padding:0 },
  infoCard:{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0',
              boxShadow:'0 1px 4px rgba(0,0,0,.07)', padding:'16px 20px', marginBottom:16 },

  grid2:   { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 },
  btnPrimary:{ padding:'13px 20px', background:'#2563eb', color:'#fff', border:'none',
               borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer',
               display:'flex', alignItems:'center', justifyContent:'center', gap:8 },
  btnSecondary:{ padding:'13px 20px', background:'#fff', color:'#374151',
                  border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:15,
                  fontWeight:600, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8 },
  btnDis:  { opacity:0.55, cursor:'not-allowed' },
  btnGhost:{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px',
             background:'transparent', color:'#64748b', border:'1.5px solid #e2e8f0',
             borderRadius:9, fontSize:14, fontWeight:600, textDecoration:'none' },
  btnBlue: { display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px',
             background:'#eff6ff', color:'#1d4ed8', border:'1px solid #bfdbfe',
             borderRadius:9, fontSize:14, fontWeight:600, textDecoration:'none' },
};

export default function Certificate() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [attempt, setAttempt]       = useState(null);
  const [cert, setCert]             = useState(null);
  const [settings, setSettings]     = useState({});
  const [generating, setGenerating] = useState(false);
  const [sending, setSending]       = useState(false);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [att, stg] = await Promise.all([getAttempt(attemptId), getSettings()]);
        if (!att || att.status !== 'PASS') {
          navigate(`/result/${attemptId}`, { replace: true });
          return;
        }
        const c = await getCertificateByAttempt(attemptId);
        if (!c) { navigate(`/result/${attemptId}`); return; }
        setAttempt(att);
        setCert(c);
        setSettings(stg);
      } catch (err) {
        toast.error('โหลดใบรับรองไม่สำเร็จ');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [attemptId]);

  async function handleDownload() {
    setGenerating(true);
    try {
      const verifyUrl = `${settings.verify_base_url || window.location.origin + '/verify'}/${cert.cert_id}`;
      const blob = await generateCertPDF(cert, settings, verifyUrl);
      downloadBlob(blob, `certificate-${cert.cert_id}.pdf`);
      if (!cert.pdf_url) {
        const url = await uploadCertPdf(cert.cert_id, blob);
        await updateCertificatePdf(cert.cert_id, url);
        setCert(prev => ({ ...prev, pdf_url: url }));
      }
      toast.success('ดาวน์โหลดใบรับรองสำเร็จ');
    } catch (err) {
      toast.error('สร้าง PDF ไม่สำเร็จ กรุณาลองใหม่');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSendEmail() {
    setSending(true);
    try {
      let pdfUrl = cert.pdf_url;
      if (!pdfUrl) {
        const verifyUrl = `${settings.verify_base_url || window.location.origin + '/verify'}/${cert.cert_id}`;
        const blob = await generateCertPDF(cert, settings, verifyUrl);
        pdfUrl = await uploadCertPdf(cert.cert_id, blob);
        await updateCertificatePdf(cert.cert_id, pdfUrl);
        setCert(prev => ({ ...prev, pdf_url: pdfUrl }));
      }
      await sendCertEmail({
        toEmail: cert.email, toName: cert.full_name, certId: cert.cert_id,
        courseName: cert.course_name, score: cert.score, total: cert.total,
        percent: cert.percent, issuedAt: cert.issued_at, pdfUrl, attemptId, settings,
      });
      toast.success(`ส่งใบรับรองไปยัง ${cert.email} สำเร็จ`);
    } catch (err) {
      toast.error('ส่งอีเมลไม่สำเร็จ กรุณาตรวจสอบการตั้งค่า');
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <><Navbar /><InlineLoader text="กำลังโหลดใบรับรอง..." /></>;
  if (!cert || !attempt) return null;

  const verifyUrl = `${settings.verify_base_url || window.location.origin + '/verify'}/${cert.cert_id}`;

  return (
    <div style={s.page}>
      <Navbar siteName={settings.site_name} />

      <div style={s.wrap}>

        {/* Header */}
        <div style={s.hero}>
          <div style={{ fontSize:44, marginBottom:10 }}>🏆</div>
          <div style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:4 }}>
            ใบรับรองการผ่านการทดสอบ
          </div>
          <div style={{ fontSize:14, color:'#64748b' }}>
            Cert ID: <span style={{ fontFamily:'monospace', fontWeight:700, color:'#2563eb' }}>{cert.cert_id}</span>
          </div>
        </div>

        {/* Certificate preview */}
        <div style={s.previewCard}>
          <CertPreviewCard cert={cert} settings={settings} scale={0.47} />
        </div>

        {/* Action buttons */}
        <div style={s.grid2}>
          <button
            onClick={handleDownload}
            disabled={generating}
            style={{ ...s.btnPrimary, ...(generating ? s.btnDis : {}) }}
          >
            {generating ? '⏳ กำลังสร้าง PDF...' : '⬇️ ดาวน์โหลด PDF'}
          </button>
          <button
            onClick={handleSendEmail}
            disabled={sending}
            style={{ ...s.btnSecondary, ...(sending ? s.btnDis : {}) }}
          >
            {sending ? '⏳ กำลังส่ง...' : `📧 ส่งไปยัง ${cert.email}`}
          </button>
        </div>


        {/* Navigation */}
        <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
          <Link to="/" style={s.btnGhost}>← กลับหน้าหลัก</Link>
          <Link to="/resend" style={s.btnBlue}>📧 แก้ไขอีเมล / ส่งใหม่</Link>
        </div>

      </div>
    </div>
  );
}
