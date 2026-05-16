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

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar siteName={settings.site_name} />

      <div className={`max-w-3xl mx-auto ${isMobile ? 'px-3 py-2.5 pb-5' : 'px-4 py-7 pb-12'}`}>

        {/* Header */}
        <div className={`text-center ${isMobile ? 'mb-2.5' : 'mb-7'}`}>
          <div className={`${isMobile ? 'text-4xl mb-1' : 'text-5xl mb-2.5'}`}>🏆</div>
          <div className={`font-extrabold text-slate-900 ${isMobile ? 'text-lg mb-0.5' : 'text-2xl mb-1'}`}>
            ใบรับรองการผ่านการทดสอบ
          </div>
          <div className={`text-slate-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            ID:{' '}
            <span className="font-mono font-bold text-blue-600 break-all" style={{ fontSize: isMobile ? 10 : 13 }}>
              {cert.cert_id}
            </span>
          </div>
        </div>

        {/* Certificate preview */}
        <div className={`bg-white border border-slate-200 shadow-sm overflow-hidden flex justify-center ${isMobile ? 'rounded-xl mb-2.5' : 'rounded-2xl mb-4'}`}>
          <CertPreviewCard cert={cert} settings={settings} scale={previewScale} />
        </div>

        {/* Score chips on mobile */}
        {isMobile && (
          <div className="flex gap-2 justify-center flex-wrap mb-2.5">
            <span className="badge badge-pass">✅ ผ่านการทดสอบ</span>
            <span className="badge badge-info">🎯 {cert.score}/{cert.total} คะแนน ({cert.percent}%)</span>
          </div>
        )}

        {/* Action buttons */}
        <div className={`flex gap-2 sm:gap-3 ${isMobile ? 'flex-col mb-2' : 'mb-4'}`}>
          <button
            onClick={handleDownload}
            disabled={generating}
            className="btn btn-primary flex-1 justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {generating ? '⏳ กำลังสร้าง PDF...' : '⬇️ ดาวน์โหลดใบรับรอง PDF'}
          </button>

          <button
            onClick={handleSendEmail}
            disabled={sending}
            className="btn btn-secondary flex-1 justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {sending ? '⏳ กำลังส่ง...' : '📧 ส่งใบรับรองทางอีเมล'}
          </button>
        </div>

        {/* Email hint */}
        <div className={`text-slate-400 text-center break-all ${isMobile ? 'text-xs mb-3' : 'text-xs mb-4'}`}>
          📧 จะส่งไปยัง {cert.email}
        </div>

        {/* Navigation */}
        <div className={`flex gap-2 sm:gap-2.5 justify-center ${isMobile ? 'flex-col' : ''}`}>
          <Link to="/" className="btn btn-ghost justify-center">← กลับหน้าหลัก</Link>
          <Link to="/resend" className="btn btn-info justify-center">
            📧 ส่งใบรับรองใหม่ / แก้ไขอีเมล
          </Link>
        </div>

      </div>
    </div>
  );
}
