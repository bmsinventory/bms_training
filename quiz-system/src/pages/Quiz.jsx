import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { InlineLoader } from '../components/Loading';
import { useToast } from '../contexts/ToastContext';
import { getAttempt, getCourse, getRandomQuestions, saveAnswers, updateAttempt } from '../lib/supabase';
import { gradeQuiz } from '../lib/utils';

/* ─── Choice colour palette (CSS custom properties per choice) ────────────── */
const PAL = [
  { l:'A', c:'#2563EB', bg:'#EFF6FF', bgH:'#DBEAFE', bd:'#93C5FD', glow:'rgba(37,99,235,.18)'  },
  { l:'B', c:'#0891B2', bg:'#ECFEFF', bgH:'#CFFAFE', bd:'#67E8F9', glow:'rgba(8,145,178,.18)'  },
  { l:'C', c:'#7C3AED', bg:'#F5F3FF', bgH:'#EDE9FE', bd:'#C4B5FD', glow:'rgba(124,58,237,.18)' },
  { l:'D', c:'#D97706', bg:'#FFFBEB', bgH:'#FEF3C7', bd:'#FCD34D', glow:'rgba(217,119,6,.18)'  },
  { l:'E', c:'#059669', bg:'#ECFDF5', bgH:'#D1FAE5', bd:'#6EE7B7', glow:'rgba(5,150,105,.18)'  },
  { l:'F', c:'#E11D48', bg:'#FFF1F2', bgH:'#FFE4E6', bd:'#FCA5A5', glow:'rgba(225,29,72,.18)'  },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmtTime = s => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

const getMotive = pct => {
  if (pct === 0) return { e:'🎯', h:'เริ่มต้นได้เลย!',    s:'เลือกคำตอบที่ถูกต้องในแต่ละข้อ' };
  if (pct < 30)  return { e:'🔥', h:'ทำได้ดีมาก!',         s:'ทำต่อเลย คุณทำได้แน่ๆ' };
  if (pct < 60)  return { e:'⚡', h:'กำลังดีเลย!',          s:'ผ่านครึ่งทางแล้ว ไปต่อ' };
  if (pct < 90)  return { e:'🚀', h:'เกือบถึงแล้ว!',        s:'อีกนิดเดียว สู้ๆ' };
  return              { e:'🎉', h:'ตอบครบทุกข้อแล้ว!', s:'พร้อมส่งคำตอบได้เลย' };
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

/* ─── SVG Icons ───────────────────────────────────────────────────────────── */
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

/* ─── ChoiceCard ──────────────────────────────────────────────────────────── */
function ChoiceCard({ choice, idx, selected, onSelect, keyHint, compact }) {
  const [pop, setPop] = useState(false);
  const p = PAL[idx % PAL.length];

  function click() { setPop(true); setTimeout(() => setPop(false), 200); onSelect(); }

  return (
    <button
      className={`qc ${compact ? 'qc-sm' : 'qc-lg'} ${selected ? 'qc-sel' : ''} ${pop ? 'q-pop' : ''}`}
      style={{ '--c': p.c, '--bg': p.bg, '--bgh': p.bgH, '--bd': p.bd, '--glow': p.glow }}
      onClick={click}
    >
      <span className={`qc-lbl ${compact ? 'qc-lbl-sm' : 'qc-lbl-lg'}`}>{p.l}</span>
      <span className="flex-1 text-left">{choice.choice_text}</span>
      {keyHint && !selected && !compact && <span className="qc-hint">{keyHint}</span>}
      {selected && <span className={`q-chk qc-chk ${compact ? 'qc-chk-sm' : 'qc-chk-lg'}`}>{I.chk}</span>}
    </button>
  );
}

/* ─── NavButton ──────────────────────────────────────────────────────────── */
function NavButton({ onClick, disabled, icon, label, variant = 'ghost', compact, iconLeft }) {
  const base = 'flex items-center justify-center gap-1.5 rounded-[10px] font-semibold transition-all duration-[180ms] disabled:cursor-not-allowed';
  const vs = {
    ghost:   'border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-35',
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg hover:-translate-y-px disabled:bg-slate-200 disabled:text-slate-400',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg hover:-translate-y-px disabled:bg-slate-200 disabled:text-slate-400',
  };
  const sz = compact ? 'px-3 py-2 text-xs min-w-[40px]' : 'px-4 py-2.5 text-sm font-bold';

  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${vs[variant]} ${sz}`}>
      {iconLeft && <span className="flex">{icon}</span>}
      {label && <span>{label}</span>}
      {!iconLeft && <span className="flex">{icon}</span>}
    </button>
  );
}

/* ─── Submit Confirm Modal ────────────────────────────────────────────────── */
function ConfirmSubmitModal({ unanswered, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-5 bg-slate-900/45 backdrop-blur-[6px]"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl q-modal-in">
        <div className="px-7 pt-7 pb-5 flex flex-col items-center gap-3.5 text-center">
          <div className="w-[60px] h-[60px] rounded-full bg-amber-50 border border-amber-300 flex items-center justify-center text-[28px] shadow-[0_4px_14px_rgba(217,119,6,.2)]">
            ⚠️
          </div>
          <div>
            <div className="text-[17px] font-bold text-slate-900 mb-2">ยืนยันการส่งคำตอบ</div>
            <div className="text-sm text-slate-500 leading-[1.65]">
              ยังมี{' '}
              <span className="font-bold text-amber-600 bg-amber-50 px-2 py-px rounded-md border border-amber-300">
                {unanswered} ข้อ
              </span>
              {' '}ที่ยังไม่ได้ตอบ<br />ต้องการส่งคำตอบหรือไม่?
            </div>
          </div>
        </div>
        <div className="h-px bg-slate-100" />
        <div className="px-6 py-4 flex gap-2.5 bg-slate-50">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 text-sm font-semibold hover:bg-slate-100 transition-colors">
            ยกเลิก
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-px transition-all">
            ตกลง ส่งเลย
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Quiz ───────────────────────────────────────────────────────────── */
export default function Quiz() {
  const { attemptId } = useParams();
  const navigate      = useNavigate();
  const { state }     = useLocation();
  const toast         = useToast();

  const [attempt,     setAttempt]     = useState(null);
  const [course,      setCourse]      = useState(state?.course || null);
  const [questions,   setQuestions]   = useState([]);
  const [current,     setCurrent]     = useState(0);
  const [answers,     setAnswers]     = useState({});
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [timeLeft,    setTimeLeft]    = useState(null);
  const [animDir,     setAnimDir]     = useState('l');
  const [animKey,     setAnimKey]     = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [unanswered,  setUnanswered]  = useState(0);
  const [isMobile,    setIsMobile]    = useState(window.innerWidth < 640);

  const timerRef = useRef(null);
  const touchRef = useRef(null);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

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

  useEffect(() => {
    if (timeLeft === null || submitting) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, submitting]);

  const q        = questions[current];
  const answered = answers[q?.id];

  useEffect(() => {
    function h(e) {
      if (!q) return;
      const n = parseInt(e.key);
      if (!isNaN(n) && n >= 1 && q.choices?.[n - 1]) handleSelect(q.id, q.choices[n - 1].id);
      if (e.key === 'ArrowRight' && answered && current < questions.length - 1) goTo(current + 1);
      if (e.key === 'ArrowLeft'  && current > 0) goTo(current - 1);
      if (e.key === 'Enter') {
        if (answered && current < questions.length - 1) goTo(current + 1);
        else if (answered) handleSubmit();
      }
    }
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

  const onTouchStart = e => { touchRef.current = e.touches[0].clientX; };
  const onTouchEnd   = e => {
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
  const m             = isMobile;

  const isUrg     = timeLeft !== null && timeLeft < 60;
  const isWarn    = timeLeft !== null && timeLeft < 300 && !isUrg;
  const timerCls  = isUrg  ? 'bg-red-50 border-red-300 text-red-600'
                  : isWarn ? 'bg-amber-50 border-amber-300 text-amber-600'
                  :          'bg-emerald-50 border-emerald-300 text-emerald-600';

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-100 to-indigo-50 relative"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Decorative blobs (desktop only) */}
      {!m && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="q-blob absolute -top-[12%] -right-[8%] w-[560px] h-[560px] rounded-full"
            style={{ background: 'radial-gradient(circle,rgba(37,99,235,.07) 0%,transparent 65%)' }} />
          <div className="q-blob absolute -bottom-[18%] -left-[8%] w-[500px] h-[500px] rounded-full [animation-delay:-6s]"
            style={{ background: 'radial-gradient(circle,rgba(79,70,229,.05) 0%,transparent 65%)' }} />
        </div>
      )}

      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-slate-900 border-b border-white/10 shadow-[0_4px_20px_rgba(0,0,0,.25)]">
        <div className={`max-w-[820px] mx-auto flex items-center ${m ? 'px-3.5 h-[52px] gap-2.5' : 'px-5 h-[60px] gap-3'}`}>
          <div className={`${m ? 'w-[30px] h-[30px]' : 'w-9 h-9'} rounded-[10px] shrink-0 bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(37,99,235,.45)]`}>
            {I.book}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className={`${m ? 'text-xs' : 'text-[13px]'} font-bold text-slate-100 truncate`}>
              {course?.name || 'แบบทดสอบ'}
            </div>
            <div className="text-[10px] text-white/40 mt-px">
              ข้อ {current + 1} / {questions.length}
              {m && ` · ตอบแล้ว ${answeredCount} ข้อ`}
            </div>
          </div>
          {timeLeft !== null && (
            <div className={`flex items-center gap-1.5 ${m ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-[13px]'} rounded-full border font-bold ${timerCls} ${isUrg ? 'q-urg' : ''}`}>
              <span className="flex">{I.clk}</span>
              {fmtTime(timeLeft)}
            </div>
          )}
        </div>
        {/* Progress shimmer bar */}
        <div className="h-[3px] bg-white/10">
          <div className="q-shimmer-bar h-full transition-[width] duration-[550ms] ease-[cubic-bezier(.4,0,.2,1)]"
            style={{ width: `${navPct}%` }} />
        </div>
      </div>

      {/* Main content */}
      <div className={`max-w-[820px] mx-auto relative z-[1] ${m ? 'px-3 pt-2.5 pb-[72px]' : 'px-5 pt-6 pb-24'}`}>

        {/* Dot navigation */}
        <div className={`flex items-center ${m ? 'gap-0.5 mb-2' : 'gap-1 mb-5'}`}>
          <div className={`flex-1 flex items-center ${m ? 'gap-0.5' : 'gap-1'}`}>
            {questions.map((_, i) => {
              const isA = !!answers[questions[i]?.id];
              const isC = i === current;
              return (
                <div key={i} onClick={() => goTo(i)} title={`ข้อ ${i + 1}${isA ? ' ✓' : ''}`}
                  className="cursor-pointer rounded-[4px] transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)]"
                  style={{
                    flex: 1,
                    height: isC ? (m ? 5 : 8) : (m ? 3 : 4),
                    background: isC ? '#2563EB' : isA ? '#93C5FD' : '#E2E8F0',
                    boxShadow: isC ? '0 0 8px #2563EB88' : 'none',
                  }} />
              );
            })}
          </div>
          {!m && (
            <span className="text-xs text-slate-500 font-semibold shrink-0 ml-2.5">
              {answeredCount}/{questions.length} ตอบแล้ว
            </span>
          )}
        </div>

        {/* Question card */}
        {q && (
          <div key={animKey} className={animDir === 'l' ? 'q-l' : 'q-r'}>

            {/* Question header */}
            <div className={`bg-white border border-slate-200 shadow-sm relative overflow-hidden ${m ? 'p-[14px_16px_12px] rounded-t-[14px]' : 'p-[22px_26px_20px] rounded-t-[20px]'}`}>
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 via-blue-400 to-sky-400" />
              <div className={`flex items-start mt-1 ${m ? 'gap-2.5' : 'gap-3.5'}`}>
                <div
                  className={`shrink-0 bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white font-black shadow-[0_6px_16px_rgba(37,99,235,.35)] ${m ? 'w-8 h-8 rounded-[9px] text-[13px]' : 'w-[42px] h-[42px] rounded-[12px] text-[16px]'}`}>
                  {current + 1}
                </div>
                <div className="flex-1">
                  <div className={`text-[10px] font-bold text-blue-600 tracking-[1.2px] uppercase ${m ? 'mb-1' : 'mb-2'}`}>
                    คำถามที่ {current + 1} จาก {questions.length}
                  </div>
                  <h2 className={`font-bold text-slate-900 leading-[1.6] m-0 ${m ? 'text-[15px]' : 'text-[18px]'}`}>
                    {q.question}
                  </h2>
                </div>
              </div>
            </div>

            {/* Choices */}
            <div className={`bg-white border-x border-slate-200 flex flex-col ${m ? 'p-[10px_12px] gap-[7px]' : 'p-[18px_26px] gap-2.5'}`}>
              {!m && (
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-slate-400 flex">{I.kbd}</span>
                  <span className="text-[11px] text-slate-400">กด 1–{q.choices.length} เลือกคำตอบ &nbsp;·&nbsp; ← → เปลี่ยนข้อ</span>
                </div>
              )}
              {q.choices.map((ch, ci) => (
                <ChoiceCard key={ch.id} choice={ch} idx={ci} selected={answered === ch.id}
                  keyHint={String(ci + 1)} compact={m} onSelect={() => handleSelect(q.id, ch.id)} />
              ))}
            </div>

            {/* Navigation footer */}
            <div className={`bg-slate-50 border border-slate-200 shadow-sm flex justify-between items-center gap-2 ${m ? 'p-[10px_12px] rounded-b-[14px]' : 'p-[14px_26px_20px] rounded-b-[20px]'}`}>
              <NavButton onClick={() => goTo(current - 1)} disabled={current === 0}
                icon={I.chL} label={m ? '' : 'ก่อนหน้า'} variant="ghost" compact={m} iconLeft />
              <div className={`text-xs font-medium ${answered ? 'text-emerald-600' : 'text-slate-400'}`}>
                {answered ? '✓ เลือกแล้ว' : 'เลือกคำตอบก่อน'}
              </div>
              {current < questions.length - 1 ? (
                <NavButton onClick={() => answered && goTo(current + 1)} disabled={!answered}
                  icon={I.chR} label={m ? '' : 'ถัดไป'} variant="primary" compact={m} />
              ) : (
                <NavButton
                  onClick={() => {
                    const u = questions.filter(q => !answers[q.id]).length;
                    if (u > 0) { setUnanswered(u); setShowConfirm(true); return; }
                    handleSubmit();
                  }}
                  disabled={submitting}
                  icon={submitting ? I.spn : I.snd}
                  label={submitting ? 'กำลังส่ง...' : 'ส่งคำตอบ'}
                  variant="success"
                  compact={m}
                />
              )}
            </div>
          </div>
        )}

        {/* Desktop stats */}
        {!m && (
          <div className="q-up mt-4 grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[1px] mb-2.5">ความคืบหน้า</div>
              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2.5">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400 transition-[width] duration-500"
                  style={{ width: `${pct}%`, boxShadow: '0 0 8px rgba(37,99,235,.4)' }} />
              </div>
              <div className="flex justify-between">
                <span className="text-[13px] text-slate-600 font-semibold">{answeredCount} / {questions.length} ข้อ</span>
                <span className="text-[13px] text-blue-600 font-bold">{Math.round(pct)}%</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-3">
              <span className="q-flt text-[26px] shrink-0">{motive.e}</span>
              <div>
                <div className="text-[13px] font-bold text-slate-900">{motive.h}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{motive.s}</div>
              </div>
            </div>
          </div>
        )}

        {/* All-answered CTA */}
        {allAnswered && current < questions.length - 1 && (
          <div className={`q-up ${m ? 'mt-2.5' : 'mt-3.5'}`}>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`w-full flex items-center justify-center gap-2.5 font-bold transition-all disabled:cursor-not-allowed
                ${m ? 'py-2.5 text-[13px] rounded-xl' : 'py-[15px] text-[15px] rounded-[14px]'}
                ${submitting
                  ? 'bg-slate-200 text-slate-400'
                  : 'bg-blue-600 text-white shadow-[0_6px_20px_rgba(37,99,235,.38)] hover:bg-blue-700 hover:shadow-[0_8px_24px_rgba(37,99,235,.45)] hover:-translate-y-px'
                }`}
            >
              {submitting
                ? <>{I.spn} กำลังส่ง...</>
                : m
                ? <>{I.snd} ตอบครบแล้ว — ส่งคำตอบ</>
                : <><span className="q-flt flex">{I.rkt}</span> ตอบครบทุกข้อแล้ว — ส่งคำตอบได้เลย</>
              }
            </button>
          </div>
        )}

        {!m && (
          <div className="text-center mt-6">
            <span className="text-[11px] text-slate-400 tracking-[0.5px]">← เลื่อนซ้าย/ขวาเพื่อเปลี่ยนข้อ →</span>
          </div>
        )}
      </div>

      {showConfirm && (
        <ConfirmSubmitModal
          unanswered={unanswered}
          onConfirm={() => { setShowConfirm(false); handleSubmit(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
