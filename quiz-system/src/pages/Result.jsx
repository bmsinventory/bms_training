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

const s = {
  page:  { fontFamily:"'Anuphan','Sarabun',sans-serif", minHeight:'100vh', background:'#f1f5f9' },
  wrap:  { maxWidth:680, margin:'0 auto', padding:'28px 16px 48px' },
  card:  { background:'#fff', borderRadius:14, border:'1px solid #e2e8f0',
           boxShadow:'0 1px 4px rgba(0,0,0,.07)', padding:'24px', marginBottom:14 },

  btnSuccess:{ display:'flex', alignItems:'center', justifyContent:'center', gap:8,
               padding:'13px 20px', background:'#059669', color:'#fff',
               border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer',
               textDecoration:'none', width:'100%', boxSizing:'border-box' },
  btnSecondary:{ display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  padding:'11px 20px', background:'#fff', color:'#374151',
                  border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14, fontWeight:600,
                  cursor:'pointer', width:'100%', boxSizing:'border-box' },
  btnGhost:{ display:'flex', alignItems:'center', justifyContent:'center', gap:8,
             padding:'11px 20px', background:'transparent', color:'#64748b',
             border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14, fontWeight:600,
             cursor:'pointer', width:'100%', boxSizing:'border-box' },
};

function StatBox({ label, value, color, bg }) {
  return (
    <div style={{ padding:'14px', borderRadius:10, background:bg, textAlign:'center' }}>
      <div style={{ fontSize:26, fontWeight:800, color }}>{value}</div>
      <div style={{ fontSize:12, color, opacity:.75, marginTop:2 }}>{label}</div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <span style={{ color:'#94a3b8', fontSize:13 }}>{label}: </span>
      <span style={{ color:'#1e293b', fontWeight:600, fontSize:14 }}>{value}</span>
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
    <><Navbar /><div style={{ textAlign:'center', padding:'80px 0', color:'#94a3b8' }}>ไม่พบข้อมูล</div></>
  );

  const isPassed     = attempt.status === 'PASS';
  const wrongAnswers = answers.filter(a => !a.is_correct);

  return (
    <div style={s.page}>
      <Navbar siteName={settings.site_name} />

      <div style={s.wrap}>

        {/* Result banner card */}
        <div style={{
          ...s.card,
          textAlign:'center',
          borderTop: `4px solid ${isPassed ? '#059669' : '#dc2626'}`,
        }}>
          <div style={{ fontSize:56, marginBottom:10 }}>{isPassed ? '🎉' : '😔'}</div>
          <div style={{ fontSize:28, fontWeight:800, color: isPassed ? '#059669' : '#dc2626', marginBottom:6 }}>
            {isPassed ? 'ผ่านการทดสอบ!' : 'ไม่ผ่านการทดสอบ'}
          </div>
          <div style={{ fontSize:13, color:'#94a3b8', marginBottom:20 }}>
            {attempt.courses?.name || 'แบบทดสอบ'} &nbsp;·&nbsp; {fmtDateTime(attempt.completed_at)}
          </div>

          {/* Score circle */}
          <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
            <div style={{
              width:120, height:120, borderRadius:'50%',
              border: `8px solid ${isPassed ? '#059669' : '#dc2626'}`,
              background: isPassed ? '#ecfdf5' : '#fef2f2',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            }}>
              <span style={{ fontSize:34, fontWeight:800, color: isPassed ? '#065f46' : '#991b1b' }}>
                {Math.round(attempt.percent)}%
              </span>
              <span style={{ fontSize:11, color:'#94a3b8' }}>คะแนน</span>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:18 }}>
            <StatBox label="ถูก"    value={attempt.score}                  color="#065f46" bg="#ecfdf5" />
            <StatBox label="ผิด"    value={attempt.total - attempt.score}  color="#991b1b" bg="#fef2f2" />
            <StatBox label="ทั้งหมด" value={attempt.total}                  color="#1e40af" bg="#eff6ff" />
          </div>

          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'8px 20px', borderRadius:20, fontSize:16, fontWeight:700,
            background: isPassed ? '#ecfdf5' : '#fef2f2',
            color: isPassed ? '#065f46' : '#991b1b',
          }}>
            {isPassed ? '✅ PASS' : '❌ FAIL'}
            <span style={{ fontSize:12, fontWeight:400 }}>
              (เกณฑ์ผ่าน {attempt.courses?.pass_percent || 80}%)
            </span>
          </div>
        </div>

        {/* Examinee info */}
        <div style={s.card}>
          <div style={{ fontSize:12, fontWeight:600, color:'#64748b', marginBottom:12 }}>ข้อมูลผู้สอบ</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <Info label="ชื่อ-สกุล" value={attempt.full_name} />
            <Info label="อีเมล"     value={attempt.email} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
          {isPassed && cert && (
            <Link to={`/certificate/${attemptId}`} style={s.btnSuccess}>
              🏆 ดูและดาวน์โหลดใบรับรอง
            </Link>
          )}

          {wrongAnswers.length > 0 && (
            <button onClick={() => setShowWrong(w => !w)} style={s.btnSecondary}>
              {showWrong ? '▲ ซ่อนเฉลย' : `📖 ดูเฉลยข้อที่ผิด (${wrongAnswers.length} ข้อ)`}
            </button>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <button onClick={() => navigate('/')} style={s.btnGhost}>← กลับหน้าหลัก</button>
            <button onClick={() => navigate(`/register/${attempt.course_id}`)} style={s.btnSecondary}>🔄 สอบใหม่</button>
          </div>
        </div>

        {/* Wrong answers review */}
        {showWrong && wrongAnswers.length > 0 && (
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'#0f172a', marginBottom:12 }}>
              📖 เฉลยข้อที่ตอบผิด ({wrongAnswers.length} ข้อ)
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {wrongAnswers.map((a, i) => (
                <div key={a.id} style={{
                  background:'#fff', borderRadius:12, border:'1px solid #e2e8f0',
                  borderLeft:'4px solid #dc2626', padding:'16px 18px',
                  boxShadow:'0 1px 3px rgba(0,0,0,.05)',
                }}>
                  <div style={{ fontSize:11, color:'#94a3b8', marginBottom:4 }}>ข้อที่ {i + 1}</div>
                  <div style={{ fontWeight:600, color:'#0f172a', marginBottom:12, lineHeight:1.5 }}>
                    {a.questions?.question}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6, fontSize:13 }}>
                    <div style={{ display:'flex', gap:8 }}>
                      <span style={{ color:'#dc2626', fontWeight:700, flexShrink:0 }}>❌ ตอบ:</span>
                      <span style={{ color:'#991b1b' }}>{a.choices?.choice_text || '(ไม่ได้ตอบ)'}</span>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <span style={{ color:'#059669', fontWeight:700, flexShrink:0 }}>✅ เฉลย:</span>
                      <span style={{ color:'#065f46', fontWeight:600 }}>
                        {a.correct_choice_text || 'ดูคำอธิบาย'}
                      </span>
                    </div>
                    {a.questions?.explanation && (
                      <div style={{ marginTop:6, padding:'10px 14px', background:'#eff6ff',
                                    borderRadius:8, color:'#1e40af', fontSize:12 }}>
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
