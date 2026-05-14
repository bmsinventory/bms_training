import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { InlineLoader } from '../components/Loading';
import { useToast } from '../contexts/ToastContext';
import {
  getAttempt, getCourse, getRandomQuestions,
  saveAnswers, updateAttempt,
} from '../lib/supabase';
import { gradeQuiz } from '../lib/utils';

export default function Quiz() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const toast = useToast();

  const [attempt, setAttempt]       = useState(null);
  const [course, setCourse]         = useState(state?.course || null);
  const [questions, setQuestions]   = useState([]);
  const [current, setCurrent]       = useState(0);
  const [answers, setAnswers]       = useState({});
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft]     = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    async function init() {
      try {
        const att = await getAttempt(attemptId);
        if (!att) { navigate('/'); return; }

        if (att.status === 'PASS' || att.status === 'FAIL') {
          navigate(`/result/${attemptId}`, { replace: true });
          return;
        }

        setAttempt(att);
        const c = course || await getCourse(att.course_id);
        setCourse(c);
        const qs = await getRandomQuestions(att.course_id, c.questions_count);
        setQuestions(qs);
        if (c.time_limit_min > 0) setTimeLeft(c.time_limit_min * 60);
      } catch (err) {
        toast.error('โหลดข้อสอบไม่สำเร็จ');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [attemptId]);

  useEffect(() => {
    if (timeLeft === null || submitting) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, submitting]);

  const handleSelect = (questionId, choiceId) => {
    setAnswers(prev => ({ ...prev, [questionId]: choiceId }));
  };

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    clearTimeout(timerRef.current);
    try {
      const result = gradeQuiz(questions, answers);
      const passPercent = course?.pass_percent || 80;
      const status = result.percent >= passPercent ? 'PASS' : 'FAIL';
      const answerRows = questions.map(q => ({
        attempt_id:  attemptId,
        question_id: q.id,
        choice_id:   answers[q.id] || null,
        is_correct:  result.details.find(d => d.question === q.question)?.isCorrect || false,
      }));
      await saveAnswers(answerRows);
      await updateAttempt(attemptId, {
        score: result.correct, total: result.total, percent: result.percent, status,
        question_ids: questions.map(q => q.id), completed_at: new Date().toISOString(),
      });
      navigate(`/result/${attemptId}`, { state: { result, status, course, attempt, passPercent } });
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการส่งคำตอบ');
      console.error(err);
      setSubmitting(false);
    }
  }, [submitting, questions, answers, course, attempt, attemptId, navigate, toast]);

  if (loading) return <InlineLoader text="กำลังโหลดข้อสอบ..." />;

  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;
  const answered = answers[q?.id];

  function fmtTime(s) {
    if (s === null) return null;
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sc = (s % 60).toString().padStart(2, '0');
    return `${m}:${sc}`;
  }

  const timerColor = timeLeft === null ? null :
    timeLeft < 60 ? { background:'#fee2e2', color:'#dc2626' } :
    timeLeft < 300 ? { background:'#fef3c7', color:'#b45309' } :
    { background:'#f1f5f9', color:'#475569' };

  return (
    <div style={{ fontFamily:"'Anuphan','Sarabun',sans-serif", minHeight:'100vh', background:'#f1f5f9' }}>

      {/* Top bar */}
      <div style={{ position:'sticky', top:0, zIndex:40, background:'#fff',
                    borderBottom:'1px solid #e2e8f0', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
        <div style={{ maxWidth:720, margin:'0 auto', padding:'12px 16px',
                      display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:14, fontWeight:600, color:'#374151',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'60%' }}>
            {course?.name || 'แบบทดสอบ'}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {timeLeft !== null && (
              <div style={{ fontSize:13, fontWeight:700, padding:'4px 12px', borderRadius:20, ...timerColor }}>
                ⏱ {fmtTime(timeLeft)}
              </div>
            )}
            <div style={{ fontSize:13, color:'#94a3b8' }}>{current + 1}/{questions.length}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height:3, background:'#e2e8f0' }}>
          <div style={{ height:'100%', background:'#2563eb', transition:'width .5s', width:`${progress}%` }} />
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:720, margin:'0 auto', padding:'28px 16px' }}>

        {/* Step dots */}
        <div style={{ display:'flex', gap:3, marginBottom:20, flexWrap:'wrap' }}>
          {questions.map((_, i) => (
            <div
              key={i}
              style={{
                height:6, flex:1, borderRadius:3, transition:'background .2s',
                background: i < current ? '#2563eb' :
                  i === current ? '#93c5fd' :
                  answers[questions[i]?.id] ? '#bfdbfe' : '#e2e8f0',
              }}
            />
          ))}
        </div>

        {q && (
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0',
                        boxShadow:'0 1px 4px rgba(0,0,0,.07)', padding:'24px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#2563eb', letterSpacing:'.5px',
                          textTransform:'uppercase', marginBottom:8 }}>
              ข้อที่ {current + 1}
            </div>
            <h2 style={{ fontSize:18, fontWeight:700, color:'#0f172a', marginBottom:22, lineHeight:1.6 }}>
              {q.question}
            </h2>

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {q.choices.map((choice, ci) => {
                const isSelected = answered === choice.id;
                return (
                  <button
                    key={choice.id}
                    onClick={() => handleSelect(q.id, choice.id)}
                    style={{
                      display:'flex', alignItems:'center', gap:12,
                      padding:'12px 16px', borderRadius:10, cursor:'pointer',
                      border: isSelected ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                      background: isSelected ? '#eff6ff' : '#fff',
                      textAlign:'left', fontFamily:'inherit', fontSize:14,
                      color: isSelected ? '#1d4ed8' : '#374151',
                      transition:'all .15s', fontWeight: isSelected ? 600 : 400,
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#fff'; }}
                  >
                    <span style={{
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                      width:28, height:28, borderRadius:'50%', fontSize:13, fontWeight:700,
                      flexShrink:0,
                      background: isSelected ? '#2563eb' : '#f1f5f9',
                      color: isSelected ? '#fff' : '#64748b',
                    }}>
                      {String.fromCharCode(65 + ci)}
                    </span>
                    {choice.choice_text}
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:24, gap:12 }}>
              <button
                onClick={() => setCurrent(c => c - 1)}
                disabled={current === 0}
                style={{
                  padding:'10px 20px', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer',
                  border:'1.5px solid #e2e8f0', background:'#fff', color:'#64748b',
                  opacity: current === 0 ? 0.4 : 1,
                }}
              >
                ← ก่อนหน้า
              </button>

              {current < questions.length - 1 ? (
                <button
                  onClick={() => setCurrent(c => c + 1)}
                  disabled={!answered}
                  style={{
                    padding:'10px 24px', borderRadius:9, fontSize:14, fontWeight:700, cursor:'pointer',
                    border:'none', background:'#2563eb', color:'#fff',
                    opacity: !answered ? 0.5 : 1,
                  }}
                >
                  ถัดไป →
                </button>
              ) : (
                <button
                  onClick={() => {
                    const unanswered = questions.filter(q => !answers[q.id]).length;
                    if (unanswered > 0 && !confirm(`ยังมี ${unanswered} ข้อที่ยังไม่ได้ตอบ ต้องการส่งคำตอบหรือไม่?`)) return;
                    handleSubmit();
                  }}
                  disabled={submitting}
                  style={{
                    padding:'10px 24px', borderRadius:9, fontSize:14, fontWeight:700, cursor:'pointer',
                    border:'none', background:'#059669', color:'#fff',
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? '⏳ กำลังส่ง...' : '✅ ส่งคำตอบ'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* All-answered shortcut */}
        {Object.keys(answers).length === questions.length && current < questions.length - 1 && (
          <div style={{ marginTop:16, textAlign:'center' }}>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding:'11px 28px', borderRadius:9, fontSize:14, fontWeight:700,
                border:'none', background:'#059669', color:'#fff', cursor:'pointer',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              ✅ ตอบครบทุกข้อ – ส่งคำตอบเลย
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
