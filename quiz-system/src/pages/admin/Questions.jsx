import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { InlineLoader } from '../../components/Loading';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';

const EMPTY_Q = { question: '', explanation: '', is_active: true };
const EMPTY_C = { choice_text: '', is_correct: false };

export default function Questions() {
  const { courseId } = useParams();
  const toast = useToast();

  const [course, setCourse]     = useState(null);
  const [questions, setQs]      = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState(EMPTY_Q);
  const [choices, setChoices]   = useState([EMPTY_C, EMPTY_C, EMPTY_C, EMPTY_C]);
  const [saving, setSaving]     = useState(false);

  async function load() {
    setLoading(true);
    const [cR, qR] = await Promise.all([
      supabase.from('courses').select('*').eq('id', courseId).single(),
      supabase.from('questions').select('*, choices(*)').eq('course_id', courseId).order('sort_order,created_at'),
    ]);
    setCourse(cR.data);
    setQs(qR.data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [courseId]);

  function openAdd() {
    setForm(EMPTY_Q);
    setChoices([
      { choice_text: '', is_correct: false },
      { choice_text: '', is_correct: false },
      { choice_text: '', is_correct: false },
      { choice_text: '', is_correct: false },
    ]);
    setModal('add');
  }

  function openEdit(q) {
    setForm({ question: q.question, explanation: q.explanation, is_active: q.is_active, id: q.id });
    const sorted = [...(q.choices || [])].sort((a, b) => a.sort_order - b.sort_order);
    setChoices(sorted.map(c => ({ id: c.id, choice_text: c.choice_text, is_correct: c.is_correct })));
    setModal(q);
  }

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })); }
  function setC(i, k, v) {
    const next = choices.map((c, idx) => {
      if (idx !== i) return k === 'is_correct' ? { ...c, is_correct: false } : c;
      return { ...c, [k]: v };
    });
    setChoices(next);
  }

  async function handleSave() {
    if (!form.question.trim()) { toast.error('กรุณากรอกข้อความคำถาม'); return; }
    const hasCorrect = choices.some(c => c.is_correct && c.choice_text.trim());
    if (!hasCorrect) { toast.error('กรุณาระบุคำตอบที่ถูกต้องอย่างน้อย 1 ข้อ'); return; }
    const validChoices = choices.filter(c => c.choice_text.trim());
    if (validChoices.length < 2) { toast.error('กรุณากรอกตัวเลือกอย่างน้อย 2 ข้อ'); return; }

    setSaving(true);
    try {
      if (modal === 'add') {
        const { data: q } = await supabase.from('questions').insert({
          course_id: courseId,
          question:  form.question.trim(),
          explanation: form.explanation.trim(),
          is_active: form.is_active,
        }).select().single();

        await supabase.from('choices').insert(
          validChoices.map((c, i) => ({
            question_id: q.id,
            choice_text: c.choice_text.trim(),
            is_correct:  c.is_correct,
            sort_order:  i,
          }))
        );
        toast.success('เพิ่มข้อสอบสำเร็จ');
      } else {
        await supabase.from('questions').update({
          question:    form.question.trim(),
          explanation: form.explanation.trim(),
          is_active:   form.is_active,
          updated_at:  new Date().toISOString(),
        }).eq('id', modal.id);

        // ลบตัวเลือกเก่าแล้วสร้างใหม่
        await supabase.from('choices').delete().eq('question_id', modal.id);
        await supabase.from('choices').insert(
          validChoices.map((c, i) => ({
            question_id: modal.id,
            choice_text: c.choice_text.trim(),
            is_correct:  c.is_correct,
            sort_order:  i,
          }))
        );
        toast.success('บันทึกสำเร็จ');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error('บันทึกไม่สำเร็จ');
      console.error(err);
    } finally { setSaving(false); }
  }

  async function handleDelete(q) {
    if (!confirm(`ลบข้อสอบ "${q.question.slice(0, 40)}..."?`)) return;
    await supabase.from('questions').delete().eq('id', q.id);
    toast.success('ลบสำเร็จ');
    load();
  }

  async function toggleActive(q) {
    await supabase.from('questions').update({ is_active: !q.is_active }).eq('id', q.id);
    load();
  }

  return (
    <div style={{ fontFamily: "'Anuphan','Sarabun',sans-serif", color: '#0f172a' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
            <Link to="/admin/courses" style={{ color: '#64748b', textDecoration: 'none' }}>← หลักสูตร</Link>
          </div>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            📝 {course?.name || 'ข้อสอบ'}
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 2, marginBottom: 0 }}>
            จัดการข้อสอบในหลักสูตรนี้ ({questions.length} ข้อ)
          </p>
        </div>
        <button onClick={openAdd} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          + เพิ่มข้อสอบ
        </button>
      </div>

      {/* Question list */}
      {loading ? <InlineLoader /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {questions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              q={q}
              idx={idx}
              onEdit={() => openEdit(q)}
              onToggle={() => toggleActive(q)}
              onDelete={() => handleDelete(q)}
            />
          ))}

          {questions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 0', color: '#64748b' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
              <p style={{ fontSize: 14, margin: 0 }}>ยังไม่มีข้อสอบ คลิก "เพิ่มข้อสอบ" เพื่อเริ่มต้น</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,.55)', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.2)', width: '100%', maxWidth: 680, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Modal header gradient */}
            <div style={{ background: 'linear-gradient(135deg,#1a3a6b,#1a56a0)', padding: '16px 22px', color: '#fff' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                {modal === 'add' ? '+ เพิ่มข้อสอบใหม่' : '✏️ แก้ไขข้อสอบ'}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{course?.name}</div>
            </div>

            {/* Modal body */}
            <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>

              {/* คำถาม */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 5 }}>คำถาม *</label>
                <textarea
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, color: '#0f172a', background: '#fff', boxSizing: 'border-box', minHeight: 90, resize: 'vertical' }}
                  value={form.question}
                  onChange={e => setF('question', e.target.value)}
                  placeholder="พิมพ์คำถาม..."
                />
              </div>

              {/* คำอธิบายเฉลย */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 5 }}>คำอธิบายเฉลย</label>
                <input
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, color: '#0f172a', background: '#fff', boxSizing: 'border-box' }}
                  value={form.explanation}
                  onChange={e => setF('explanation', e.target.value)}
                  placeholder="อธิบายเหตุผลของคำตอบที่ถูก..."
                />
              </div>

              {/* Choices */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 8 }}>
                  ตัวเลือกคำตอบ{' '}
                  <span style={{ fontWeight: 400, color: '#64748b' }}>(คลิกวงกลมเพื่อระบุคำตอบที่ถูก)</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {choices.map((c, i) => (
                    <ChoiceRow
                      key={i}
                      choice={c}
                      index={i}
                      onRadio={() => setC(i, 'is_correct', true)}
                      onText={v => setC(i, 'choice_text', v)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setChoices(prev => [...prev, { choice_text: '', is_correct: false }])}
                  style={{ marginTop: 10, background: 'transparent', color: '#2563eb', border: '1px dashed #93c5fd', borderRadius: 7, padding: '5px 14px', fontSize: 12, cursor: 'pointer', width: '100%' }}
                >
                  + เพิ่มตัวเลือก
                </button>
              </div>

              {/* is_active checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setF('is_active', e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#2563eb' }}
                />
                เปิดใช้งานข้อนี้
              </label>
            </div>

            {/* Modal footer */}
            <div style={{ padding: '14px 22px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button
                onClick={() => setModal(null)}
                style={{ background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 7, padding: '7px 20px', fontSize: 13, cursor: 'pointer' }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ background: saving ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 22px', fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- sub-components ---------- */

function QuestionCard({ q, idx, onEdit, onToggle, onDelete }) {
  const sortedChoices = [...(q.choices || [])].sort((a, b) => a.sort_order - b.sort_order);
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18, marginBottom: 0, opacity: q.is_active ? 1 : 0.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>

        {/* Left: number + question + choices + explanation */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace', marginTop: 2, flexShrink: 0 }}>{idx + 1}.</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{q.question}</p>

              {sortedChoices.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {sortedChoices.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: c.is_correct ? '#059669' : '#64748b', fontWeight: c.is_correct ? 600 : 400 }}>
                      <span style={{ fontSize: 14 }}>{c.is_correct ? '✅' : '○'}</span>
                      <span>{c.choice_text}</span>
                    </div>
                  ))}
                </div>
              )}

              {q.explanation && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#2563eb', fontStyle: 'italic' }}>
                  💡 {q.explanation}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: action buttons */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <ActionBtn onClick={onEdit} title="แก้ไข">✏️</ActionBtn>
          <ActionBtn onClick={onToggle} title={q.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}>
            {q.is_active ? '🔴' : '🟢'}
          </ActionBtn>
          <ActionBtn onClick={onDelete} title="ลบ" danger>🗑️</ActionBtn>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, title, children, danger }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: hovered ? (danger ? '#fef2f2' : '#f8fafc') : 'transparent',
        color: danger ? '#dc2626' : '#64748b',
        border: danger ? '1px solid #fecaca' : '1px solid #e2e8f0',
        borderRadius: 7,
        padding: '5px 10px',
        fontSize: 13,
        cursor: 'pointer',
        transition: 'background .12s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  );
}

function ChoiceRow({ choice, index, onRadio, onText }) {
  const letter = String.fromCharCode(65 + index);
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 14px',
      borderRadius: 10,
      border: choice.is_correct ? '2px solid #059669' : '1px solid #e2e8f0',
      background: choice.is_correct ? '#f0fdf4' : '#fff',
      transition: 'border .15s, background .15s',
    }}>
      <input
        type="radio"
        name="correct"
        checked={choice.is_correct}
        onChange={onRadio}
        style={{ width: 16, height: 16, accentColor: '#059669', cursor: 'pointer', flexShrink: 0 }}
      />
      <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', width: 20, flexShrink: 0 }}>{letter}.</span>
      <input
        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#0f172a', fontFamily: 'inherit' }}
        placeholder={`ตัวเลือก ${letter}`}
        value={choice.choice_text}
        onChange={e => onText(e.target.value)}
      />
      {choice.is_correct && (
        <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', flexShrink: 0 }}>✅ ถูก</span>
      )}
    </div>
  );
}
