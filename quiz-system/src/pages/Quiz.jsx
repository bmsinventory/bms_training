import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { InlineLoader } from '../components/Loading';
import { useToast } from '../contexts/ToastContext';
import {
  getAttempt, getCourse, getRandomQuestions,
  saveAnswers, updateAttempt,
} from '../lib/supabase';
import { gradeQuiz } from '../lib/utils';

/* ─── CSS injected once ───────────────────────────────────────────────────── */
const ANIM = `
@import url('https://fonts.googleapis.com/css2?family=Anuphan:wght@300;400;500;600;700&display=swap');
@keyframes qSlideL  { from{opacity:0;transform:translateX(52px) scale(.98)} to{opacity:1;transform:none} }
@keyframes qSlideR  { from{opacity:0;transform:translateX(-52px) scale(.98)} to{opacity:1;transform:none} }
@keyframes qFadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
@keyframes qPop     { 0%{transform:scale(1)} 45%{transform:scale(.95)} 100%{transform:scale(1)} }
@keyframes qCheck   { from{transform:scale(0) rotate(-110deg);opacity:0} to{transform:scale(1) rotate(0);opacity:1} }
@keyframes qFloat   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes qPulse   { 0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.45)} 50%{box-shadow:0 0 0 8px rgba(220,38,38,0)} }
@keyframes qSpin    { to{transform:rotate(360deg)} }
@keyframes qShimmer { from{background-position:-200% 0} to{background-position:200% 0} }
@keyframes qBlob    { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(20px,-18px) scale(1.05)} 70%{transform:translate(-12px,16px) scale(.97)} }
@keyframes qModalIn { from{opacity:0;transform:translateY(20px) scale(.97)} to{opacity:1;transform:none} }
@keyframes qProgress{ from{background-position:-200% 0} to{background-position:200% 0} }
@keyframes qPopIn   { from{opacity:0;transform:scale(.82) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
.q-l   { animation: qSlideL .38s cubic-bezier(.22,1,.36,1) both }
.q-r   { animation: qSlideR .38s cubic-bezier(.22,1,.36,1) both }
.q-up  { animation: qFadeUp .42s ease both }
.q-pop { animation: qPop .18s ease }
.q-chk { animation: qCheck .28s cubic-bezier(.34,1.56,.64,1) both }
.q-flt { animation: qFloat 3.2s ease-in-out infinite }
.q-urg { animation: qPulse .88s ease-in-out infinite }
.q-spn { animation: qSpin 1s linear infinite }
.q-mod { animation: qModalIn .28s cubic-bezier(.22,1,.36,1) both }
.q-blob{ animation: qBlob 14s ease-in-out infinite }
`;

/* ─── Design tokens ───────────────────────────────────────────────────────── */
const T = {
  pageBg:   'linear-gradient(145deg, #EFF6FF 0%, #F1F5F9 45%, #EEF2FF 100%)',
  nav:      '#0F172A',
  navBorder:'rgba(255,255,255,.07)',
  card:     '#FFFFFF',
  cardBorder:'#E2E8F0',
  cardShadow:'0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.05)',
  primary:  '#2563EB',
  primaryL: '#EFF6FF',
  primaryM: '#3B82F6',
  primaryD: '#1D4ED8',
  t1:  '#0F172A',
  t2:  '#334155',
  t3:  '#64748B',
  t4:  '#94A3B8',
  success:  '#059669',
  successL: '#ECFDF5',
  danger:   '#DC2626',
  dangerL:  '#FEF2F2',
  warn:     '#D97706',
  warnL:    '#FFFBEB',
  border:   '#E2E8F0',
  borderS:  '#F1F5F9',
};

/* ─── Choice palette ──────────────────────────────────────────────────────── */
const PAL = [
  { l:'A', c:'#2563EB', bg:'#EFF6FF', bgH:'#DBEAFE', border:'#93C5FD', glow:'rgba(37,99,235,.18)'  },
  { l:'B', c:'#0891B2', bg:'#ECFEFF', bgH:'#CFFAFE', border:'#67E8F9', glow:'rgba(8,145,178,.18)'  },
  { l:'C', c:'#7C3AED', bg:'#F5F3FF', bgH:'#EDE9FE', border:'#C4B5FD', glow:'rgba(124,58,237,.18)' },
  { l:'D', c:'#D97706', bg:'#FFFBEB', bgH:'#FEF3C7', border:'#FCD34D', glow:'rgba(217,119,6,.18)'  },
  { l:'E', c:'#059669', bg:'#ECFDF5', bgH:'#D1FAE5', border:'#6EE7B7', glow:'rgba(5,150,105,.18)'  },
  { l:'F', c:'#E11D48', bg:'#FFF1F2', bgH:'#FFE4E6', border:'#FCA5A5', glow:'rgba(225,29,72,.18)'  },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmt = (s) =>
  `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

const getMotive = (pct) => {
  if (pct === 0)  return { e:'🎯', h:'เริ่มต้นได้เลย!',    s:'เลือกคำตอบที่ถูกต้องในแต่ละข้อ' };
  if (pct < 30)   return { e:'🔥', h:'ทำได้ดีมาก!',         s:'ทำต่อเลย คุณทำได้แน่ๆ' };
  if (pct < 60)   return { e:'⚡', h:'กำลังดีเลย!',          s:'ผ่านครึ่งทางแล้ว ไปต่อ' };
  if (pct < 90)   return { e:'🚀', h:'เกือบถึงแล้ว!',        s:'อีกนิดเดียว สู้ๆ' };
  return               { e:'🎉', h:'ตอบครบทุกข้อแล้ว!', s:'พร้อมส่งคำตอบได้เลย' };
};

function playTick() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880; o.type = 'sine';
    g.gain.setValueAtTime(.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .12);
    o.start(); o.stop(ctx.currentTime + .12);
  } catch {}
}
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [660, 880, 1100].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = f; o.type = 'sine';
      const t = ctx.currentTime + i * .1;
      g.gain.setValueAtTime(.06, t);
      g.gain.exponentialRampToValueAtTime(.001, t + .25);
      o.start(t); o.stop(t + .25);
    });
  } catch {}
}

/* ─── SVG icons ───────────────────────────────────────────────────────────── */
const I = {
  book: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="17" height="17"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  clk:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  chL:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><polyline points="15 18 9 12 15 6"/></svg>,
  chR:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><polyline points="9 18 15 12 9 6"/></svg>,
  chk:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>,
  snd:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  rkt:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>,
  spn:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="q-spn" width="15" height="15"><path d="M12 2a10 10 0 1 0 10 10" opacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>,
  kbd:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/></svg>,
};

/* ─────────────────────── ChoiceCard ─────────────────────────────────────── */
function ChoiceCard({ choice, idx, selected, onSelect, keyHint, compact }) {
  const [hov, setHov] = useState(false);
  const [pop, setPop] = useState(false);
  const p = PAL[idx % PAL.length];

  const click = () => { setPop(true); setTimeout(() => setPop(false), 200); onSelect(); };

  return (
    <button
      className={pop ? 'q-pop' : ''}
      onClick={click}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center',
        gap: compact ? 10 : 14,
        padding: compact ? '10px 12px' : '14px 18px',
        borderRadius: compact ? 11 : 14, cursor: 'pointer',
        border: `1.5px solid ${selected ? p.c + 'aa' : hov ? p.border : T.border}`,
        background: selected ? p.bg : hov ? p.bgH : T.card,
        textAlign: 'left', fontFamily: "'Anuphan','Sarabun',sans-serif",
        fontSize: compact ? 14 : 15, lineHeight: 1.5,
        color: selected ? p.c : hov ? p.c : T.t2,
        fontWeight: selected ? 600 : 400,
        boxShadow: selected
          ? `0 0 0 3px ${p.glow}, 0 4px 16px ${p.glow}`
          : hov ? `0 2px 10px ${p.glow}` : T.cardShadow,
        transform: selected ? 'scale(1.012)' : hov ? 'scale(1.005)' : 'scale(1)',
        transition: 'all .22s cubic-bezier(.4,0,.2,1)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Label badge */}
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: compact ? 28 : 34, height: compact ? 28 : 34,
        borderRadius: compact ? 8 : 10, flexShrink: 0,
        background: selected ? p.c : hov ? p.bg : T.borderS,
        color: selected ? '#fff' : hov ? p.c : T.t3,
        fontSize: compact ? 12 : 13, fontWeight: 800,
        boxShadow: selected ? `0 3px 10px ${p.glow}` : 'none',
        transition: 'all .2s',
      }}>{p.l}</span>

      <span style={{ flex: 1 }}>{choice.choice_text}</span>

      {keyHint && !selected && !compact && (
        <span style={{
          fontSize: 11, color: T.t4, padding: '2px 7px',
          background: T.borderS, borderRadius: 6,
          border: `1px solid ${T.border}`, flexShrink: 0, fontWeight: 600,
        }}>{keyHint}</span>
      )}

      {selected && (
        <span className="q-chk" style={{
          width: compact ? 22 : 26, height: compact ? 22 : 26,
          borderRadius: '50%', flexShrink: 0,
          background: p.c, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', boxShadow: `0 3px 10px ${p.glow}`,
        }}>{I.chk}</span>
      )}
    </button>
  );
}

/* ─────────────────────── Confirm Modal ───────────────────────────────────── */
function ConfirmModal({ unanswered, onConfirm, onCancel }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(15,23,42,.45)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 400, background: '#FFFFFF',
        borderRadius: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,.18), 0 4px 16px rgba(0,0,0,.1)',
        overflow: 'hidden',
        animation: 'qPopIn .24s cubic-bezier(.34,1.56,.64,1) both',
      }}>
        <div style={{
          padding: '28px 28px 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          textAlign: 'center',
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: '#FFFBEB', border: '1.5px solid #FCD34D',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, boxShadow: '0 4px 14px rgba(217,119,6,.2)',
          }}>⚠️</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
              ยืนยันการส่งคำตอบ
            </div>
            <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.65 }}>
              ยังมี{' '}
              <span style={{
                fontWeight: 700, color: '#D97706', background: '#FFFBEB',
                padding: '1px 8px', borderRadius: 6, border: '1px solid #FCD34D',
              }}>{unanswered} ข้อ</span>
              {' '}ที่ยังไม่ได้ตอบ<br />ต้องการส่งคำตอบหรือไม่?
            </div>
          </div>
        </div>
        <div style={{ height: 1, background: '#F1F5F9' }} />
        <div style={{ padding: '16px 24px', display: 'flex', gap: 10, background: '#F8FAFC' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '11px', borderRadius: 12,
              border: '1.5px solid #E2E8F0', background: '#FFFFFF', color: '#64748B',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'Anuphan','Sarabun',sans-serif", transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#334155'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = '#64748B'; }}
          >ยกเลิก</button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '11px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #2563EB, #3B82F6)', color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Anuphan','Sarabun',sans-serif",
              boxShadow: '0 4px 12px rgba(37,99,235,.35)', transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 18px rgba(37,99,235,.48)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,.35)'; e.currentTarget.style.transform = 'none'; }}
          >ตกลง ส่งเลย</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Main Quiz ───────────────────────────────────────── */
export default function Quiz() {
  const { attemptId } = useParams();
  const navigate      = useNavigate();
  const { state }     = useLocation();
  const toast         = useToast();

  const [attempt,    setAttempt]    = useState(null);
  const [course,     setCourse]     = useState(state?.course || null);
  const [questions,  setQuestions]  = useState([]);
  const [current,    setCurrent]    = useState(0);
  const [answers,    setAnswers]    = useState({});
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft,   setTimeLeft]   = useState(null);
  const [animDir,    setAnimDir]    = useState('l');
  const [animKey,    setAnimKey]    = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [unanswered,  setUnanswered]  = useState(0);
  const [isMobile,    setIsMobile]    = useState(window.innerWidth < 640);

  const timerRef = useRef(null);
  const touchRef = useRef(null);

  /* inject CSS */
  useEffect(() => {
    const id = 'qz-bms';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id; el.textContent = ANIM;
      document.head.appendChild(el);
    }
  }, []);

  /* responsive */
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  /* load */
  useEffect(() => {
    async function init() {
      try {
        const att = await getAttempt(attemptId);
        if (!att) { navigate('/'); return; }
        if (att.status === 'PASS' || att.status === 'FAIL') {
          navigate(`/result/${attemptId}`, { replace: true }); return;
        }
        setAttempt(att);
        const c = course || await getCourse(att.course_id);
        setCourse(c);
        const qs = await getRandomQuestions(att.course_id, c.questions_count);
        setQuestions(qs);
        if (c.time_limit_min > 0) setTimeLeft(c.time_limit_min * 60);
      } catch (err) {
        toast.error('โหลดข้อสอบไม่สำเร็จ'); console.error(err);
      } finally { setLoading(false); }
    }
    init();
  }, [attemptId]);

  /* timer */
  useEffect(() => {
    if (timeLeft === null || submitting) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, submitting]);

  /* derived */
  const q        = questions[current];
  const answered = answers[q?.id];

  /* keyboard */
  useEffect(() => {
    const h = (e) => {
      if (!q) return;
      const n = parseInt(e.key);
      if (!isNaN(n) && n >= 1 && q.choices?.[n - 1]) handleSelect(q.id, q.choices[n - 1].id);
      if (e.key === 'ArrowRight' && answered && current < questions.length - 1) goTo(current + 1);
      if (e.key === 'ArrowLeft'  && current > 0) goTo(current - 1);
      if (e.key === 'Enter') {
        if (answered && current < questions.length - 1) goTo(current + 1);
        else if (answered) handleSubmit();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [current, answered, q, questions.length]);

  const goTo = useCallback((idx) => {
    setAnimDir(idx > current ? 'l' : 'r');
    setAnimKey(k => k + 1);
    setCurrent(idx);
  }, [current]);

  const handleSelect = useCallback((qId, cId) => {
    setAnswers(prev => ({ ...prev, [qId]: cId }));
    playTick();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true); clearTimeout(timerRef.current);
    try {
      const result      = gradeQuiz(questions, answers);
      const passPercent = course?.pass_percent || 80;
      const status      = result.percent >= passPercent ? 'PASS' : 'FAIL';
      const rows        = questions.map(q => ({
        attempt_id: attemptId, question_id: q.id,
        choice_id:  answers[q.id] || null,
        is_correct: result.details.find(d => d.question === q.question)?.isCorrect || false,
      }));
      await saveAnswers(rows);
      await updateAttempt(attemptId, {
        score: result.correct, total: result.total, percent: result.percent, status,
        question_ids: questions.map(q => q.id), completed_at: new Date().toISOString(),
      });
      playChime();
      navigate(`/result/${attemptId}`, { state: { result, status, course, attempt, passPercent } });
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการส่งคำตอบ'); console.error(err); setSubmitting(false);
    }
  }, [submitting, questions, answers, course, attempt, attemptId, navigate, toast]);

  /* swipe */
  const onTS = (e) => { touchRef.current = e.touches[0].clientX; };
  const onTE = (e) => {
    if (touchRef.current === null) return;
    const dx = touchRef.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 60) {
      if (dx > 0 && answered && current < questions.length - 1) goTo(current + 1);
      if (dx < 0 && current > 0) goTo(current - 1);
    }
    touchRef.current = null;
  };

  if (loading) return <InlineLoader text="กำลังโหลดข้อสอบ..." />;

  const answeredCount = Object.keys(answers).length;
  const allAnswered   = answeredCount === questions.length;
  const pct           = questions.length ? answeredCount / questions.length * 100 : 0;
  const navPct        = questions.length ? (current + 1) / questions.length * 100 : 0;
  const motive        = getMotive(pct);

  const isUrg  = timeLeft !== null && timeLeft < 60;
  const isWarn = timeLeft !== null && timeLeft < 300 && !isUrg;
  const timerCfg = isUrg
    ? { bg: T.dangerL, bd: '#FCA5A5', tx: T.danger, dot: T.danger }
    : isWarn
    ? { bg: T.warnL,   bd: '#FCD34D', tx: T.warn,   dot: T.warn   }
    : { bg: T.successL,bd: '#6EE7B7', tx: T.success, dot: T.success };

  const m = isMobile;

  /* ── render ── */
  return (
    <div
      onTouchStart={onTS} onTouchEnd={onTE}
      style={{
        fontFamily: "'Anuphan','Sarabun',sans-serif",
        minHeight: '100vh',
        background: T.pageBg,
        position: 'relative',
      }}
    >
      {/* ── Decorative blobs (desktop only) ── */}
      {!m && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          <div className="q-blob" style={{
            position: 'absolute', top: '-12%', right: '-8%', width: 560, height: 560, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,.07) 0%, transparent 65%)',
          }} />
          <div className="q-blob" style={{
            position: 'absolute', bottom: '-18%', left: '-8%', width: 500, height: 500, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(79,70,229,.05) 0%, transparent 65%)',
            animationDelay: '-6s',
          }} />
        </div>
      )}

      {/* ── Sticky header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: T.nav,
        borderBottom: `1px solid ${T.navBorder}`,
        boxShadow: '0 1px 0 rgba(255,255,255,.06), 0 4px 20px rgba(0,0,0,.25)',
      }}>
        <div style={{
          maxWidth: 820, margin: '0 auto',
          padding: m ? '0 14px' : '0 20px',
          height: m ? 52 : 60,
          display: 'flex', alignItems: 'center', gap: m ? 10 : 12,
        }}>
          {/* Brand icon */}
          <div style={{
            width: m ? 30 : 36, height: m ? 30 : 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', boxShadow: '0 4px 12px rgba(37,99,235,.45)',
          }}>{I.book}</div>

          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{
              fontSize: m ? 12 : 13, fontWeight: 700, color: '#F8FAFC',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {course?.name || 'แบบทดสอบ'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 1 }}>
              ข้อ {current + 1} / {questions.length}
              {m && ` · ตอบแล้ว ${answeredCount} ข้อ`}
            </div>
          </div>

          {/* Timer */}
          {timeLeft !== null && (
            <div
              className={isUrg ? 'q-urg' : ''}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: m ? '4px 10px' : '5px 13px', borderRadius: 20,
                background: timerCfg.bg, border: `1px solid ${timerCfg.bd}`,
                color: timerCfg.tx, fontSize: m ? 12 : 13, fontWeight: 700,
              }}
            >
              <span style={{ color: timerCfg.dot, display: 'flex' }}>{I.clk}</span>
              {fmt(timeLeft)}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: 'rgba(255,255,255,.08)' }}>
          <div style={{
            height: '100%',
            background: `linear-gradient(90deg, ${T.primary}, ${T.primaryM}, #38BDF8, ${T.primaryM}, ${T.primary})`,
            backgroundSize: '300% 100%',
            animation: 'qShimmer 4s linear infinite',
            width: `${navPct}%`,
            transition: 'width .55s cubic-bezier(.4,0,.2,1)',
            boxShadow: `0 0 10px ${T.primary}`,
          }} />
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{
        maxWidth: 820, margin: '0 auto',
        padding: m ? '10px 12px 72px' : '24px 20px 96px',
        position: 'relative', zIndex: 1,
      }}>

        {/* Dot navigation — desktop only */}
        {!m && (
          <div className="q-up" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, display: 'flex', gap: 3, alignItems: 'center' }}>
              {questions.map((_, i) => {
                const isA = !!answers[questions[i]?.id];
                const isC = i === current;
                return (
                  <div
                    key={i}
                    onClick={() => goTo(i)}
                    title={`ข้อ ${i + 1}${isA ? ' ✓' : ''}`}
                    style={{
                      flex: 1, height: isC ? 8 : 4, borderRadius: 4, cursor: 'pointer',
                      transition: 'all .3s cubic-bezier(.4,0,.2,1)',
                      background: isC ? T.primary : isA ? '#93C5FD' : T.border,
                      boxShadow: isC ? `0 0 8px ${T.primary}88` : 'none',
                    }}
                  />
                );
              })}
            </div>
            <span style={{ fontSize: 12, color: T.t3, fontWeight: 600, flexShrink: 0 }}>
              {answeredCount}/{questions.length} ตอบแล้ว
            </span>
          </div>
        )}

        {/* Mobile dot navigation — compact pill strip */}
        {m && (
          <div style={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 8 }}>
            {questions.map((_, i) => {
              const isA = !!answers[questions[i]?.id];
              const isC = i === current;
              return (
                <div
                  key={i}
                  onClick={() => goTo(i)}
                  style={{
                    flex: 1, height: isC ? 5 : 3, borderRadius: 3, cursor: 'pointer',
                    transition: 'all .25s',
                    background: isC ? T.primary : isA ? '#93C5FD' : T.border,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* ── Question card ── */}
        {q && (
          <div key={animKey} className={animDir === 'l' ? 'q-l' : 'q-r'}>

            {/* Question header */}
            <div style={{
              padding: m ? '14px 16px 12px' : '22px 26px 20px',
              borderRadius: m ? '14px 14px 0 0' : '20px 20px 0 0',
              background: T.card,
              border: `1px solid ${T.cardBorder}`,
              borderBottom: `1px solid ${T.borderS}`,
              boxShadow: T.cardShadow,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, ${T.primary}, ${T.primaryM}, #38BDF8)`,
              }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: m ? 10 : 14, marginTop: 4 }}>
                <div style={{
                  width: m ? 32 : 42, height: m ? 32 : 42,
                  borderRadius: m ? 9 : 12, flexShrink: 0,
                  background: `linear-gradient(135deg, ${T.primary}, ${T.primaryM})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: m ? 13 : 16, fontWeight: 900, color: '#fff',
                  boxShadow: `0 6px 16px rgba(37,99,235,.35)`,
                }}>{current + 1}</div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: T.primary,
                    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: m ? 4 : 8,
                  }}>
                    คำถามที่ {current + 1} จาก {questions.length}
                  </div>
                  <h2 style={{
                    fontSize: m ? 15 : 18, fontWeight: 700, color: T.t1,
                    lineHeight: 1.6, margin: 0,
                  }}>
                    {q.question}
                  </h2>
                </div>
              </div>
            </div>

            {/* Choices */}
            <div style={{
              padding: m ? '10px 12px' : '18px 26px',
              background: T.card,
              border: `1px solid ${T.cardBorder}`,
              borderTop: 'none', borderBottom: 'none',
              display: 'flex', flexDirection: 'column', gap: m ? 7 : 10,
            }}>
              {/* Keyboard hint — desktop only */}
              {!m && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ color: T.t4, display: 'flex' }}>{I.kbd}</span>
                  <span style={{ fontSize: 11, color: T.t4 }}>
                    กด 1–{q.choices.length} เลือกคำตอบ &nbsp;·&nbsp; ← → เปลี่ยนข้อ
                  </span>
                </div>
              )}

              {q.choices.map((ch, ci) => (
                <ChoiceCard
                  key={ch.id}
                  choice={ch}
                  idx={ci}
                  selected={answered === ch.id}
                  keyHint={String(ci + 1)}
                  compact={m}
                  onSelect={() => handleSelect(q.id, ch.id)}
                />
              ))}
            </div>

            {/* Navigation footer */}
            <div style={{
              padding: m ? '10px 12px' : '14px 26px 20px',
              borderRadius: m ? '0 0 14px 14px' : '0 0 20px 20px',
              background: T.borderS,
              border: `1px solid ${T.cardBorder}`,
              borderTop: `1px solid ${T.border}`,
              boxShadow: T.cardShadow,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
            }}>
              <NavGhost onClick={() => goTo(current - 1)} disabled={current === 0} icon={I.chL} label={m ? '' : 'ก่อนหน้า'} iconLeft compact={m} />

              <div style={{ fontSize: m ? 11 : 12, color: answered ? T.success : T.t4, fontWeight: 500 }}>
                {answered ? '✓ เลือกแล้ว' : 'เลือกคำตอบก่อน'}
              </div>

              {current < questions.length - 1 ? (
                <NavPrimary onClick={() => answered && goTo(current + 1)} disabled={!answered} icon={I.chR} label={m ? '' : 'ถัดไป'} compact={m} />
              ) : (
                <NavSuccess
                  onClick={() => {
                    const u = questions.filter(q => !answers[q.id]).length;
                    if (u > 0) { setUnanswered(u); setShowConfirm(true); return; }
                    handleSubmit();
                  }}
                  disabled={submitting}
                  icon={submitting ? I.spn : I.snd}
                  label={submitting ? 'กำลังส่ง...' : 'ส่งคำตอบ'}
                  compact={m}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Bottom stats — desktop only ── */}
        {!m && (
          <div className="q-up" style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{
              padding: '16px 20px', borderRadius: 16,
              background: T.card, border: `1px solid ${T.cardBorder}`,
              boxShadow: T.cardShadow,
            }}>
              <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                ความคืบหน้า
              </div>
              <div style={{ height: 6, background: T.border, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{
                  height: '100%', borderRadius: 6,
                  background: `linear-gradient(90deg, ${T.primary}, #38BDF8)`,
                  width: `${pct}%`, transition: 'width .5s ease',
                  boxShadow: `0 0 8px ${T.primary}66`,
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: T.t2, fontWeight: 600 }}>{answeredCount} / {questions.length} ข้อ</span>
                <span style={{ fontSize: 13, color: T.primary, fontWeight: 700 }}>{Math.round(pct)}%</span>
              </div>
            </div>

            <div style={{
              padding: '16px 20px', borderRadius: 16,
              background: T.card, border: `1px solid ${T.cardBorder}`,
              boxShadow: T.cardShadow,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span className="q-flt" style={{ fontSize: 26, flexShrink: 0 }}>{motive.e}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{motive.h}</div>
                <div style={{ fontSize: 11, color: T.t3, marginTop: 3, lineHeight: 1.5 }}>{motive.s}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── All-answered CTA — desktop only ── */}
        {!m && allAnswered && current < questions.length - 1 && (
          <div className="q-up" style={{ marginTop: 14 }}>
            <button
              onClick={handleSubmit} disabled={submitting}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '15px', borderRadius: 14, border: 'none',
                background: submitting ? T.border : `linear-gradient(135deg, ${T.primary}, ${T.primaryM})`,
                color: submitting ? T.t3 : '#fff',
                fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: !submitting ? `0 6px 20px rgba(37,99,235,.38)` : 'none',
                fontFamily: "'Anuphan','Sarabun',sans-serif", transition: 'all .25s',
              }}
              onMouseEnter={e => { if (!submitting) { e.currentTarget.style.boxShadow = '0 8px 28px rgba(37,99,235,.5)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = !submitting ? '0 6px 20px rgba(37,99,235,.38)' : 'none'; e.currentTarget.style.transform = 'none'; }}
            >
              <span className="q-flt" style={{ display: 'flex' }}>{I.rkt}</span>
              ตอบครบทุกข้อแล้ว — ส่งคำตอบได้เลย
            </button>
          </div>
        )}

        {/* Mobile: compact answered CTA when all answered and not on last question */}
        {m && allAnswered && current < questions.length - 1 && (
          <div style={{ marginTop: 10 }}>
            <button
              onClick={handleSubmit} disabled={submitting}
              style={{
                width: '100%', padding: '11px',
                borderRadius: 12, border: 'none',
                background: submitting ? T.border : T.primary,
                color: submitting ? T.t3 : '#fff',
                fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: "'Anuphan','Sarabun',sans-serif",
                boxShadow: !submitting ? `0 4px 14px rgba(37,99,235,.35)` : 'none',
              }}
            >
              {submitting ? <>{I.spn} กำลังส่ง...</> : <>{I.snd} ตอบครบแล้ว — ส่งคำตอบ</>}
            </button>
          </div>
        )}

        {/* Swipe hint — desktop only */}
        {!m && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <span style={{ fontSize: 11, color: T.t4, letterSpacing: .5 }}>
              ← เลื่อนซ้าย/ขวาเพื่อเปลี่ยนข้อ →
            </span>
          </div>
        )}
      </div>

      {/* ── Confirm Submit Modal ── */}
      {showConfirm && (
        <ConfirmModal
          unanswered={unanswered}
          onConfirm={() => { setShowConfirm(false); handleSubmit(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}

/* ─── Nav buttons ─────────────────────────────────────────────────────────── */
function NavGhost({ onClick, disabled, icon, label, iconLeft, compact }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: compact ? '8px 12px' : '9px 16px', borderRadius: 10,
        border: `1.5px solid ${h && !disabled ? T.primary + '44' : T.border}`,
        background: h && !disabled ? T.primaryL : T.card,
        color: disabled ? T.t4 : h ? T.primary : T.t2,
        fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? .35 : 1, fontFamily: "'Anuphan','Sarabun',sans-serif",
        transition: 'all .18s', minWidth: compact ? 40 : 'auto',
        justifyContent: 'center',
      }}
    >
      {iconLeft && <span style={{ display: 'flex' }}>{icon}</span>}
      {label}
      {!iconLeft && <span style={{ display: 'flex' }}>{icon}</span>}
    </button>
  );
}

function NavPrimary({ onClick, disabled, icon, label, compact }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: compact ? '8px 12px' : '9px 20px', borderRadius: 10, border: 'none',
        background: disabled ? T.border : h ? T.primaryD : T.primary,
        color: disabled ? T.t3 : '#fff',
        fontSize: 13, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? .45 : 1,
        boxShadow: !disabled ? (h ? '0 6px 16px rgba(37,99,235,.45)' : '0 4px 12px rgba(37,99,235,.3)') : 'none',
        transform: h && !disabled ? 'translateY(-1px)' : 'none',
        fontFamily: "'Anuphan','Sarabun',sans-serif", transition: 'all .18s',
        minWidth: compact ? 40 : 'auto', justifyContent: 'center',
      }}
    >
      {label}
      <span style={{ display: 'flex' }}>{icon}</span>
    </button>
  );
}

function NavSuccess({ onClick, disabled, icon, label, compact }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: compact ? '8px 14px' : '9px 20px', borderRadius: 10, border: 'none',
        background: disabled ? T.border : h ? '#047857' : T.success,
        color: disabled ? T.t3 : '#fff',
        fontSize: compact ? 12 : 13, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: !disabled ? (h ? '0 6px 16px rgba(5,150,105,.45)' : '0 4px 12px rgba(5,150,105,.3)') : 'none',
        transform: h && !disabled ? 'translateY(-1px)' : 'none',
        fontFamily: "'Anuphan','Sarabun',sans-serif", transition: 'all .18s',
      }}
    >
      <span style={{ display: 'flex' }}>{icon}</span>
      {label}
    </button>
  );
}
