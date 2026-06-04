import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useToast } from '../contexts/ToastContext';
import { getSettings } from '../services/settings.service';
import { uploadCertPdf } from '../services/storage.service';
import { updateCertificatePdf, updateCertificateEmail } from '../services/certificates.service';
import { isValidEmail } from '../utils/validation.util';
import { generateCertPDF } from '../lib/certificate';
import { sendCertEmail } from '../services/email.service';

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
        await updateCertificateEmail(cert.cert_id, newEmail);
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
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <div className="max-w-sm mx-auto px-4 py-7 pb-12">

        {/* Hero */}
        <div className="text-center mb-7">
          <div className="text-5xl mb-2.5">📧</div>
          <div className="text-2xl font-extrabold text-slate-900 mb-1">ขอส่งใบรับรองใหม่</div>
          <div className="text-sm text-slate-500">แก้ไขอีเมลและส่งใบรับรองซ้ำ</div>
        </div>

        {done ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
            <div className="text-5xl mb-2.5">🎉</div>
            <div className="font-bold text-emerald-600 text-xl mb-2">ส่งสำเร็จ!</div>
            <div className="text-sm text-slate-500 mb-5">
              ส่งใบรับรองไปยัง <strong>{newEmail}</strong> แล้ว
            </div>
            <Link to="/" className="btn btn-primary w-full justify-center">← กลับหน้าหลัก</Link>
          </div>

        ) : step === 1 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="text-sm font-bold text-slate-900 mb-4">ขั้นตอน 1: ยืนยัน Cert ID</div>
            <form onSubmit={handleVerifyCert}>
              <div className="form-group mb-4">
                <label className="form-label">Cert ID</label>
                <input
                  className="form-input font-mono uppercase"
                  placeholder="เช่น BMS-2024-001234"
                  value={certId}
                  onChange={e => setCertId(e.target.value.toUpperCase())}
                  required
                />
                <div className="text-xs text-slate-400 mt-1">Cert ID อยู่บนใบรับรองของคุณ</div>
              </div>
              <button type="submit" disabled={loading}
                className="btn btn-primary w-full justify-center disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? '⏳ กำลังตรวจสอบ...' : 'ถัดไป →'}
              </button>
            </form>
          </div>

        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="text-sm font-bold text-slate-900 mb-1">ขั้นตอน 2: ยืนยันและส่งใหม่</div>
            <div className="text-xs text-slate-400 mb-4">
              Cert ID: <span className="font-mono text-blue-600 font-semibold">{cert?.cert_id}</span>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 mb-4 text-sm">
              <div><span className="text-slate-400">ชื่อ: </span><span className="font-semibold text-slate-900">{cert?.full_name}</span></div>
              <div className="mt-1"><span className="text-slate-400">หลักสูตร: </span><span className="font-semibold text-slate-900">{cert?.course_name}</span></div>
            </div>

            <form onSubmit={handleResend}>
              <div className="form-group mb-4">
                <label className="form-label">อีเมลที่จะส่งใบรับรอง</label>
                <input
                  type="email"
                  className="form-input"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  required
                />
                {newEmail.toLowerCase() !== cert?.email?.toLowerCase() && (
                  <div className="text-xs text-amber-600 mt-1">⚠️ อีเมลแตกต่างจากที่ลงทะเบียนไว้</div>
                )}
              </div>

              <div className="flex gap-2.5">
                <button type="button" onClick={() => setStep(1)} className="btn btn-secondary flex-1 justify-center">
                  ← ย้อนกลับ
                </button>
                <button type="submit" disabled={loading}
                  className="btn btn-primary flex-1 justify-center disabled:opacity-70 disabled:cursor-not-allowed">
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
