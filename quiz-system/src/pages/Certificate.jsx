import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { InlineLoader } from '../components/Loading';
import { useToast } from '../contexts/ToastContext';
import {
  getAttempt, getCertificateByAttempt, updateCertificatePdf,
  uploadCertPdf, getSettings,
} from '../lib/supabase';
import { generateCertPDF } from '../lib/certificate';
import { downloadBlob } from '../lib/utils';
import { sendCertEmail } from '../lib/email';
import CertPreviewCard from '../components/CertPreviewCard';

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
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 640);
  const [previewScale, setPreviewScale] = useState(
    window.innerWidth < 640 ? Math.min(0.32, (window.innerWidth - 32) / 1123) : 0.47
  );

  useEffect(() => {
    function h() {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      setPreviewScale(mobile ? Math.min(0.32, (window.innerWidth - 32) / 1123) : 0.47);
    }
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

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

  const m = isMobile;

  return (
    <div style={{ fontFamily:"'Anuphan','Sarabun',sans-serif", minHeight:'100vh', background:'#f1f5f9' }}>
      <Navbar siteName={settings.site_name} />

      <div style={{ maxWidth:800, margin:'0 auto', padding: m ? '10px 12px 20px' : '28px 16px 48px' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom: m ? 10 : 28 }}>
          <div style={{ fontSize: m ? 34 : 44, marginBottom: m ? 4 : 10 }}>🏆</div>
          <div style={{ fontSize: m ? 17 : 22, fontWeight:800, color:'#0f172a', marginBottom: m ? 2 : 4 }}>
            ใบรับรองการผ่านการทดสอบ
          </div>
          <div style={{ fontSize: m ? 11 : 14, color:'#64748b' }}>
            ID:{' '}
            <span style={{
              fontFamily:'monospace', fontWeight:700, color:'#2563eb',
              wordBreak:'break-all', fontSize: m ? 10 : 13,
            }}>
              {cert.cert_id}
            </span>
          </div>
        </div>

        {/* Certificate preview */}
        <div style={{
          background:'#fff', borderRadius: m ? 10 : 14,
          border:'1px solid #e2e8f0',
          boxShadow:'0 1px 4px rgba(0,0,0,.07)',
          marginBottom: m ? 10 : 16,
          overflow:'hidden', padding:0,
          display:'flex', justifyContent:'center',
        }}>
          <CertPreviewCard cert={cert} settings={settings} scale={previewScale} />
        </div>

        {/* Score chip on mobile */}
        {m && (
          <div style={{
            display:'flex', gap:8, justifyContent:'center',
            marginBottom:10, flexWrap:'wrap',
          }}>
            <span style={{
              display:'inline-flex', alignItems:'center', gap:4,
              padding:'4px 12px', borderRadius:20,
              fontSize:12, fontWeight:700,
              background:'#ecfdf5', color:'#065f46',
            }}>
              ✅ ผ่านการทดสอบ
            </span>
            <span style={{
              display:'inline-flex', alignItems:'center', gap:4,
              padding:'4px 12px', borderRadius:20,
              fontSize:12, fontWeight:700,
              background:'#eff6ff', color:'#1d4ed8',
            }}>
              🎯 {cert.score}/{cert.total} คะแนน ({cert.percent}%)
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div style={{
          display:'flex',
          flexDirection: m ? 'column' : 'row',
          gap: m ? 8 : 12,
          marginBottom: m ? 8 : 16,
        }}>
          <button
            onClick={handleDownload}
            disabled={generating}
            style={{
              flex:1,
              padding: m ? '11px 16px' : '13px 20px',
              background: generating ? '#93c5fd' : '#2563eb',
              color:'#fff', border:'none', borderRadius:10,
              fontSize: m ? 14 : 15, fontWeight:700,
              cursor: generating ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              opacity: generating ? 0.7 : 1,
              transition:'background .15s',
            }}
            onMouseEnter={e => { if (!generating) e.currentTarget.style.background = '#1d4ed8'; }}
            onMouseLeave={e => { if (!generating) e.currentTarget.style.background = '#2563eb'; }}
          >
            {generating ? '⏳ กำลังสร้าง PDF...' : '⬇️ ดาวน์โหลดใบรับรอง PDF'}
          </button>

          <button
            onClick={handleSendEmail}
            disabled={sending}
            style={{
              flex:1,
              padding: m ? '11px 16px' : '13px 20px',
              background:'#fff', color:'#374151',
              border:'1.5px solid #e2e8f0', borderRadius:10,
              fontSize: m ? 14 : 15, fontWeight:600,
              cursor: sending ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              opacity: sending ? 0.7 : 1,
              transition:'border-color .15s',
            }}
          >
            {sending ? '⏳ กำลังส่ง...' : '📧 ส่งใบรับรองทางอีเมล'}
          </button>
        </div>

        {/* Email info */}
        <div style={{
          fontSize: m ? 11 : 12, color:'#94a3b8',
          textAlign:'center', marginBottom: m ? 12 : 16,
          wordBreak:'break-all',
        }}>
          📧 จะส่งไปยัง {cert.email}
        </div>

        {/* Navigation */}
        <div style={{
          display:'flex', gap: m ? 8 : 10,
          justifyContent:'center',
          flexDirection: m ? 'column' : 'row',
        }}>
          <Link to="/" style={{
            display:'inline-flex', alignItems:'center',
            justifyContent: m ? 'center' : 'flex-start',
            gap:6, padding: m ? '10px 16px' : '9px 18px',
            background:'transparent', color:'#64748b',
            border:'1.5px solid #e2e8f0', borderRadius:9,
            fontSize: m ? 13 : 14, fontWeight:600, textDecoration:'none',
          }}>
            ← กลับหน้าหลัก
          </Link>
          <Link to="/resend" style={{
            display:'inline-flex', alignItems:'center',
            justifyContent: m ? 'center' : 'flex-start',
            gap:6, padding: m ? '10px 16px' : '9px 18px',
            background:'#eff6ff', color:'#1d4ed8',
            border:'1px solid #bfdbfe', borderRadius:9,
            fontSize: m ? 13 : 14, fontWeight:600, textDecoration:'none',
          }}>
            📧 ส่งใบรับรองใหม่ / แก้ไขอีเมล
          </Link>
        </div>

      </div>
    </div>
  );
}
