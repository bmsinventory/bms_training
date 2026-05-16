import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { InlineLoader } from '../components/Loading';
import { useToast } from '../contexts/ToastContext';
import {
  getAttempt, getAnswers, getCertificateByAttempt,
  createCertificate, getSettings,
} from '../lib/supabase';
import { makeCertId, fmtDateTime } from '../lib/utils';

function StatBox({ label, value, color, bg }) {
  return (
    <div className="rounded-xl p-3.5 text-center" style={{ background: bg }}>
      <div className="text-2xl font-extrabold" style={{ color }}>{value}</div>
      <div className="text-xs mt-0.5 opacity-75" style={{ color }}>{label}</div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <span className="text-slate-400 text-sm">{label}: </span>
      <span className="text-slate-800 font-semibold text-sm">{value}</span>
    </div>
  );
}

export default function Result() {
  const { attemptId } = useParams();
  const { state }     = useLocation();
  const navigate      = useNavigate();
  const toast         = useToast();

  const [attempt, setAttempt]     = useState(null);
  const [answers, setAnswers]     = useState([]);
  const [cert, setCert]           = useState(null);
  const [settings, setSettings]   = useState({});
  const [loading, setLoading]     = useState(true);
  const [showWrong, setShowWrong] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [att, anws, stg] = await Promise.all([
          getAttempt(attemptId), getAnswers(attemptId), getSettings(),
        ]);
        if (!att || att.status === 'started') {
          navigate(`/quiz/${attemptId}`, { replace: true });
          return;
        }
        setAttempt(att);
        setAnswers(anws);
        setSettings(stg);
        let existingCert = await getCertificateByAttempt(attemptId);
        if (!existingCert && att.status === 'PASS') {
          const prefix = stg.cert_prefix || 'BMS';
          const certId = makeCertId(prefix);
          existingCert = await createCertificate({
            attempt_id: attemptId, cert_id: certId, full_name: att.full_name,
            email: att.email, course_id: att.course_id, course_name: att.courses?.name || '',
            score: att.score, total: att.total, percent: att.percent,
          });
        }
        setCert(existingCert);
      } catch (err) {
        toast.error('โหลดผลสอบไม่สำเร็จ');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [attemptId]);

  if (loading) return <><Navbar /><InlineLoader text="กำลังโหลดผลสอบ..." /></>;
  if (!attempt) return (
    <><Navbar /><div className="text-center py-20 text-slate-400">ไม่พบข้อมูล</div></>
  );

  const isPassed     = attempt.status === 'PASS';
  const wrongAnswers = answers.filter(a => !a.is_correct);
  const passColor    = isPassed ? '#059669' : '#dc2626';
  const passBg       = isPassed ? '#ecfdf5' : '#fef2f2';
  const passText     = isPassed ? '#065f46' : '#991b1b';

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar siteName={settings.site_name} />

      <div className="max-w-2xl mx-auto px-4 py-7 sm:py-10 pb-12">

        {/* Result banner card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-3.5 text-center"
          style={{ borderTop: `4px solid ${passColor}` }}>
          <div className="text-5xl mb-2.5">{isPassed ? '🎉' : '😔'}</div>
          <div className="text-2xl sm:text-3xl font-extrabold mb-1.5" style={{ color: passColor }}>
            {isPassed ? 'ผ่านการทดสอบ!' : 'ไม่ผ่านการทดสอบ'}
          </div>
          <div className="text-sm text-slate-400 mb-5">
            {attempt.courses?.name || 'แบบทดสอบ'} &nbsp;·&nbsp; {fmtDateTime(attempt.completed_at)}
          </div>

          {/* Score circle */}
          <div className="flex justify-center mb-5">
            <div className="w-28 h-28 rounded-full flex flex-col items-center justify-center"
              style={{ border: `8px solid ${passColor}`, background: passBg }}>
              <span className="text-3xl font-extrabold" style={{ color: passText }}>
                {Math.round(attempt.percent)}%
              </span>
              <span className="text-xs text-slate-400">คะแนน</span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            <StatBox label="ถูก"     value={attempt.score}                 color="#065f46" bg="#ecfdf5" />
            <StatBox label="ผิด"     value={attempt.total - attempt.score} color="#991b1b" bg="#fef2f2" />
            <StatBox label="ทั้งหมด" value={attempt.total}                 color="#1e40af" bg="#eff6ff" />
          </div>

          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-base font-bold"
            style={{ background: passBg, color: passText }}>
            {isPassed ? '✅ PASS' : '❌ FAIL'}
            <span className="text-xs font-normal">
              (เกณฑ์ผ่าน {attempt.courses?.pass_percent || 80}%)
            </span>
          </div>
        </div>

        {/* Examinee info */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-3.5">
          <div className="text-xs font-semibold text-slate-500 mb-3">ข้อมูลผู้สอบ</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Info label="ชื่อ-สกุล" value={attempt.full_name} />
            <Info label="อีเมล"     value={attempt.email} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 mb-3.5">
          {isPassed && cert && (
            <Link to={`/certificate/${attemptId}`} className="btn btn-success w-full justify-center py-3">
              🏆 ดูและดาวน์โหลดใบรับรอง
            </Link>
          )}

          {wrongAnswers.length > 0 && (
            <button onClick={() => setShowWrong(w => !w)} className="btn btn-secondary w-full justify-center">
              {showWrong ? '▲ ซ่อนเฉลย' : `📖 ดูเฉลยข้อที่ผิด (${wrongAnswers.length} ข้อ)`}
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={() => navigate('/')} className="btn btn-ghost w-full justify-center">← กลับหน้าหลัก</button>
            <button onClick={() => navigate(`/register/${attempt.course_id}`)} className="btn btn-secondary w-full justify-center">🔄 สอบใหม่</button>
          </div>
        </div>

        {/* Wrong answers review */}
        {showWrong && wrongAnswers.length > 0 && (
          <div>
            <div className="text-sm font-bold text-slate-900 mb-3">
              📖 เฉลยข้อที่ตอบผิด ({wrongAnswers.length} ข้อ)
            </div>
            <div className="flex flex-col gap-3">
              {wrongAnswers.map((a, i) => (
                <div key={a.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"
                  style={{ borderLeft: '4px solid #dc2626' }}>
                  <div className="text-xs text-slate-400 mb-1">ข้อที่ {i + 1}</div>
                  <div className="font-semibold text-slate-900 mb-3 leading-relaxed">
                    {a.questions?.question}
                  </div>
                  <div className="flex flex-col gap-1.5 text-sm">
                    <div className="flex gap-2">
                      <span className="text-red-600 font-bold shrink-0">❌ ตอบ:</span>
                      <span className="text-red-800">{a.choices?.choice_text || '(ไม่ได้ตอบ)'}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-emerald-600 font-bold shrink-0">✅ เฉลย:</span>
                      <span className="text-emerald-800 font-semibold">
                        {a.correct_choice_text || 'ดูคำอธิบาย'}
                      </span>
                    </div>
                    {a.questions?.explanation && (
                      <div className="mt-1.5 px-3.5 py-2.5 bg-blue-50 rounded-lg text-blue-700 text-xs">
                        💡 {a.questions.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
