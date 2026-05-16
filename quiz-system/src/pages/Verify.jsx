import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { InlineLoader } from '../components/Loading';
import { useToast } from '../contexts/ToastContext';
import { getCertificate, getSettings } from '../lib/supabase';
import { fmtDate } from '../lib/utils';

function Row({ label, value, highlight }) {
  return (
    <div className="flex gap-2.5 items-center mb-2 text-sm">
      <span className="text-slate-400 w-36 shrink-0">{label}:</span>
      <span className={`text-slate-800 ${highlight ? 'text-base font-bold' : 'font-medium'}`}>{value}</span>
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
    <div className="min-h-screen bg-slate-100">
      <Navbar siteName={settings.site_name} />

      <div className="max-w-lg mx-auto px-4 py-7 pb-12">
        {/* Hero */}
        <div className="text-center mb-7">
          <div className="text-5xl mb-2.5">🛡️</div>
          <div className="text-2xl font-extrabold text-slate-900 mb-1">ตรวจสอบใบรับรอง</div>
          <div className="text-sm text-slate-500">กรอก Cert ID เพื่อตรวจสอบความถูกต้องของใบรับรอง</div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-3.5">
          <label className="form-label">Cert ID</label>
          <div className="flex gap-2.5">
            <input
              className="form-input flex-1 font-mono uppercase"
              placeholder="เช่น BMS-2024-001234"
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={() => handleSearch()}
              disabled={!canSearch}
              className="btn btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? '⏳' : '🔍 ตรวจสอบ'}
            </button>
          </div>
        </div>

        {loading && <InlineLoader text="กำลังตรวจสอบ..." />}

        {/* Not found */}
        {searched && notFound && !loading && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center"
            style={{ borderLeft: '4px solid #dc2626' }}>
            <div className="text-4xl mb-2">❌</div>
            <div className="font-bold text-red-600 text-base mb-1">ไม่พบใบรับรอง</div>
            <div className="text-sm text-slate-500">
              Cert ID ที่ค้นหาไม่มีในระบบ หรืออาจถูกยกเลิกแล้ว
            </div>
          </div>
        )}

        {/* Found */}
        {cert && !loading && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"
            style={{ borderLeft: '4px solid #059669' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">✅</span>
                  <span className="font-bold text-emerald-600 text-base">ใบรับรองถูกต้อง</span>
                </div>
                <div className="text-xs text-slate-400">
                  Cert ID: <span className="font-mono font-semibold">{cert.cert_id}</span>
                </div>
              </div>
              {cert.pdf_url && (
                <a href={cert.pdf_url} target="_blank" rel="noopener noreferrer"
                  className="btn btn-sm btn-info">
                  ⬇️ PDF
                </a>
              )}
            </div>

            <Row label="ชื่อผู้ถือใบรับรอง" value={cert.full_name}                                highlight />
            <Row label="หลักสูตร"            value={cert.course_name} />
            <Row label="คะแนน"               value={`${cert.score}/${cert.total} (${Math.round(cert.percent)}%)`} />
            <Row label="วันที่ออกใบรับรอง"   value={fmtDate(cert.issued_at)} />
            <Row label="อีเมล"               value={cert.email} />

            <div className="mt-3.5 px-3.5 py-2.5 bg-emerald-50 rounded-xl flex items-center gap-2 text-sm text-emerald-800">
              <span>🔒</span>
              <span>ใบรับรองนี้ออกโดย <strong>{settings.org_name || settings.site_name}</strong> และได้รับการยืนยันในระบบ</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
