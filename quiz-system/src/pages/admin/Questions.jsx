import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { InlineLoader } from '../../components/Loading';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { supabase } from '../../lib/supabase';
import { fmtDateTime } from '../../lib/utils';

const EMPTY_Q = { question: '', explanation: '', is_active: true };

function ChoiceRow({ choice, index, onRadio, onText }) {
  const letter = String.fromCharCode(65 + index);
  return (
    <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-colors ${choice.is_correct ? 'border-2 border-emerald-500 bg-emerald-50' : 'border border-slate-200'}`}>
      <input type="radio" name="correct" checked={choice.is_correct} onChange={onRadio}
        className="w-4 h-4 cursor-pointer shrink-0 accent-emerald-600" />
      <span className="text-xs font-bold text-slate-500 w-5 shrink-0">{letter}.</span>
      <input className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900"
        style={{ fontFamily: 'inherit' }}
        placeholder={`ตัวเลือก ${letter}`}
        value={choice.choice_text}
        onChange={e => onText(e.target.value)}
      />
      {choice.is_correct && <span className="text-xs font-bold text-emerald-600 shrink-0">✅ ถูก</span>}
    </div>
  );
}

function QuestionCard({ q, idx, onEdit, onToggle, onDelete }) {
  const sortedChoices = [...(q.choices || [])].sort((a, b) => a.sort_order - b.sort_order);
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-4 ${!q.is_active ? 'opacity-50' : ''}`}>
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2.5">
            <span className="text-xs text-slate-400 font-mono mt-0.5 shrink-0">{idx + 1}.</span>
            <div className="flex-1 min-w-0">
              <p className="m-0 font-semibold text-slate-900 text-sm">{q.question}</p>
              {sortedChoices.length > 0 && (
                <div className="mt-2.5 flex flex-col gap-1">
                  {sortedChoices.map(c => (
                    <div key={c.id} className={`flex items-center gap-2 text-sm ${c.is_correct ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                      <span>{c.is_correct ? '✅' : '○'}</span>
                      <span>{c.choice_text}</span>
                    </div>
                  ))}
                </div>
              )}
              {q.explanation && (
                <p className="mt-2 text-xs text-blue-600 italic m-0">💡 {q.explanation}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button onClick={onEdit} className="btn btn-sm btn-ghost" title="แก้ไข">✏️</button>
          <button onClick={onToggle} className="btn btn-sm btn-ghost" title={q.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}>
            {q.is_active ? '🔴' : '🟢'}
          </button>
          <button onClick={onDelete} className="btn btn-sm btn-danger" title="ลบ">🗑️</button>
        </div>
      </div>
    </div>
  );
}

export default function Questions() {
  const { courseId } = useParams();
  const toast = useToast();

  const [course, setCourse]           = useState(null);
  const [questions, setQs]            = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null);
  const [form, setForm]               = useState(EMPTY_Q);
  const [choices, setChoices]         = useState([{}, {}, {}, {}].map(() => ({ choice_text: '', is_correct: false })));
  const [saving, setSaving]           = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]       = useState(false);

  const [activeTab,    setActiveTab]   = useState('questions');
  const [attempts,     setAttempts]    = useState([]);
  const [attLoading,   setAttLoading]  = useState(false);
  const [attFilter,    setAttFilter]   = useState('');
  const [locFilter,    setLocFilter]   = useState(null);
  const [locations,    setLocations]   = useState([]);
  const [delAttempt,   setDelAttempt]  = useState(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearByLocConfirm, setClearByLocConfirm] = useState(false);
  const [clearing,     setClearing]    = useState(false);

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

  useEffect(() => {
    supabase.from('locations').select('id,code,name').order('id')
      .then(({ data }) => setLocations(data || []));
  }, []);

  function openAdd() {
    setForm(EMPTY_Q);
    setChoices([{}, {}, {}, {}].map(() => ({ choice_text: '', is_correct: false })));
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
    setChoices(choices.map((c, idx) => {
      if (idx !== i) return k === 'is_correct' ? { ...c, is_correct: false } : c;
      return { ...c, [k]: v };
    }));
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

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await supabase.from('quiz_answers').delete().in('question_id', [deleteTarget.id]);
      await supabase.from('choices').delete().eq('question_id', deleteTarget.id);
      await supabase.from('questions').delete().eq('id', deleteTarget.id);
      toast.success('ลบสำเร็จ');
      setQs(prev => prev.filter(q => q.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      toast.error('ลบไม่สำเร็จ: ' + e.message);
    } finally { setDeleting(false); }
  }

  async function toggleActive(q) {
    await supabase.from('questions').update({ is_active: !q.is_active }).eq('id', q.id);
    load();
  }

  async function loadAttempts() {
    setAttLoading(true);
    try {
      let q = supabase.from('quiz_attempts')
        .select('*, certificates(cert_id), location:location_id(id, name, code)')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
      if (attFilter) q = q.eq('status', attFilter);
      if (locFilter !== null) q = q.eq('location_id', locFilter);
      const { data } = await q.limit(500);
      setAttempts(data || []);
    } finally { setAttLoading(false); }
  }

  useEffect(() => {
    if (activeTab === 'history') loadAttempts();
  }, [activeTab, attFilter, locFilter]);

  async function clearAllAttempts() {
    setClearing(true);
    try {
      const { data: all } = await supabase.from('quiz_attempts')
        .select('id').eq('course_id', courseId);
      const ids = (all || []).map(a => a.id);
      if (ids.length) {
        await supabase.from('quiz_answers').delete().in('attempt_id', ids);
        await supabase.from('certificates').delete().in('attempt_id', ids);
        await supabase.from('quiz_attempts').delete().eq('course_id', courseId);
      }
      toast.success(`ลบประวัติสอบ ${ids.length} รายการแล้ว`);
      setAttempts([]);
    } catch (e) {
      toast.error('ลบไม่สำเร็จ: ' + e.message);
    } finally { setClearing(false); setClearConfirm(false); }
  }

  async function clearByLocation() {
    if (locFilter === null) return;
    setClearing(true);
    try {
      const { data: all } = await supabase.from('quiz_attempts')
        .select('id').eq('course_id', courseId).eq('location_id', locFilter);
      const ids = (all || []).map(a => a.id);
      if (ids.length) {
        await supabase.from('quiz_answers').delete().in('attempt_id', ids);
        await supabase.from('certificates').delete().in('attempt_id', ids);
        await supabase.from('quiz_attempts').delete().in('id', ids);
      }
      const locName = locations.find(l => l.id === locFilter)?.name || 'สาขานี้';
      toast.success(`ลบประวัติสอบ ${ids.length} รายการของ${locName}แล้ว`);
      setAttempts([]);
    } catch (e) {
      toast.error('ลบไม่สำเร็จ: ' + e.message);
    } finally { setClearing(false); setClearByLocConfirm(false); }
  }

  async function deleteOneAttempt() {
    if (!delAttempt) return;
    try {
      await supabase.from('quiz_answers').delete().eq('attempt_id', delAttempt.id);
      await supabase.from('certificates').delete().eq('attempt_id', delAttempt.id);
      await supabase.from('quiz_attempts').delete().eq('id', delAttempt.id);
      toast.success('ลบรายการแล้ว');
      setAttempts(prev => prev.filter(a => a.id !== delAttempt.id));
    } catch (e) {
      toast.error('ลบไม่สำเร็จ: ' + e.message);
    } finally { setDelAttempt(null); }
  }

  return (
    <div>
      <ConfirmDialog
        open={!!deleteTarget}
        title="ลบข้อสอบ"
        desc={deleteTarget ? `ลบข้อสอบ "${deleteTarget.question.slice(0, 60)}${deleteTarget.question.length > 60 ? '...' : ''}" — ข้อมูลจะหายถาวร` : ''}
        loading={deleting}
        okLabel="🗑️ ยืนยันลบ"
        onOk={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Confirm dialogs for history tab */}
      <ConfirmDialog
        open={clearConfirm}
        title="เคียร์ประวัติสอบทั้งหมด"
        desc={`ลบประวัติสอบทั้งหมด ${attempts.length > 0 ? `(${attempts.length} รายการ)` : ''} ของหลักสูตรนี้\nรวมถึงคำตอบและใบรับรองที่เชื่อมอยู่ ข้อมูลจะหายถาวร`}
        loading={clearing}
        okLabel="🗑️ เคียร์ทั้งหมด"
        onOk={clearAllAttempts}
        onCancel={() => setClearConfirm(false)}
      />
      <ConfirmDialog
        open={clearByLocConfirm}
        title={`เคียร์ประวัติสอบ — ${locations.find(l => l.id === locFilter)?.name || 'สาขานี้'}`}
        desc={`ลบประวัติสอบ ${attempts.length} รายการของสาขานี้\nรวมถึงคำตอบและใบรับรองที่เชื่อมอยู่ ข้อมูลจะหายถาวร`}
        loading={clearing}
        okLabel="🗑️ เคียร์ตามสาขา"
        onOk={clearByLocation}
        onCancel={() => setClearByLocConfirm(false)}
      />
      <ConfirmDialog
        open={!!delAttempt}
        title="ลบประวัติสอบ"
        desc={delAttempt ? `ลบรายการของ "${delAttempt.full_name}" (${delAttempt.email})\nข้อมูลจะหายถาวร` : ''}
        okLabel="🗑️ ยืนยันลบ"
        onOk={deleteOneAttempt}
        onCancel={() => setDelAttempt(null)}
      />

      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            <Link to="/admin/courses" className="text-slate-500 no-underline">← หลักสูตร</Link>
          </div>
          <h1 className="text-lg font-bold text-slate-900 m-0">📝 {course?.name || 'ข้อสอบ'}</h1>
          <p className="text-sm text-slate-500 mt-0.5 mb-0">
            จัดการข้อสอบในหลักสูตรนี้
          </p>
        </div>
        {activeTab === 'questions' && (
          <button onClick={openAdd} className="btn btn-primary btn-sm">+ เพิ่มข้อสอบ</button>
        )}
        {activeTab === 'history' && attempts.length > 0 && locFilter !== null && (
          <button onClick={() => setClearByLocConfirm(true)} className="btn btn-danger btn-sm">
            🗑️ เคียร์สาขา {locations.find(l => l.id === locFilter)?.name || ''}
          </button>
        )}
        {activeTab === 'history' && attempts.length > 0 && locFilter === null && (
          <button onClick={() => setClearConfirm(true)} className="btn btn-danger btn-sm">
            🗑️ เคียร์ทั้งหมด
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('questions')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'questions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          📝 ข้อสอบ ({questions.length} ข้อ)
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          📊 ประวัติสอบ
        </button>
      </div>

      {/* ── Tab: ข้อสอบ ── */}
      {activeTab === 'questions' && (
        loading ? <InlineLoader /> : (
          <div className="flex flex-col gap-3">
            {questions.map((q, idx) => (
              <QuestionCard
                key={q.id} q={q} idx={idx}
                onEdit={() => openEdit(q)}
                onToggle={() => toggleActive(q)}
                onDelete={() => setDeleteTarget(q)}
              />
            ))}
            {questions.length === 0 && (
              <div className="text-center py-16 text-slate-500">
                <div className="text-5xl mb-3">📝</div>
                <p className="text-sm m-0">ยังไม่มีข้อสอบ คลิก "เพิ่มข้อสอบ" เพื่อเริ่มต้น</p>
              </div>
            )}
          </div>
        )
      )}

      {/* ── Tab: ประวัติสอบ ── */}
      {activeTab === 'history' && (
        <div>
          {/* Filter bar */}
          <div className="flex flex-col gap-2 mb-3">
            <div className="flex gap-2 items-center flex-wrap">
              <div className="flex gap-1 flex-wrap">
                {[['', 'ทั้งหมด'], ['PASS', '✅ ผ่าน'], ['FAIL', '❌ ไม่ผ่าน'], ['started', '⏳ ยังไม่เสร็จ']].map(([v, label]) => (
                  <button key={v}
                    onClick={() => setAttFilter(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${attFilter === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-400 ml-auto">{attempts.length} รายการ</span>
            </div>
            {locations.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setLocFilter(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${locFilter === null ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  🌐 ทุกสาขา
                </button>
                {locations.map(loc => (
                  <button key={loc.id}
                    onClick={() => setLocFilter(loc.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${locFilter === loc.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    🏫 {loc.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {attLoading ? <InlineLoader /> : attempts.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-sm m-0">ไม่พบประวัติสอบ{attFilter ? 'ตามตัวกรองที่เลือก' : ''}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Table header */}
              <div className="grid text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-2.5 bg-slate-50 border-b border-slate-200"
                style={{ gridTemplateColumns: '1fr 1fr 80px 72px 90px 110px 40px' }}>
                <div>ชื่อ</div>
                <div>อีเมล</div>
                <div>คะแนน</div>
                <div>ผลสอบ</div>
                <div>สาขา</div>
                <div>วันที่สอบ</div>
                <div />
              </div>
              {/* Rows */}
              <div className="divide-y divide-slate-100">
                {attempts.map(a => (
                  <div key={a.id}
                    className="grid items-center px-4 py-2.5 hover:bg-slate-50 transition-colors text-sm"
                    style={{ gridTemplateColumns: '1fr 1fr 80px 72px 90px 110px 40px' }}>
                    <div className="font-medium text-slate-900 truncate pr-2">{a.full_name}</div>
                    <div className="text-slate-500 text-xs truncate pr-2">{a.email}</div>
                    <div className="text-slate-700 font-semibold">
                      {a.score ?? '-'}/{a.total ?? '-'}
                      {a.percent != null && <span className="text-xs text-slate-400 ml-1">({Math.round(a.percent)}%)</span>}
                    </div>
                    <div>
                      <span className={`badge ${a.status === 'PASS' ? 'badge-pass' : a.status === 'FAIL' ? 'badge-fail' : 'badge-gray'}`}>
                        {a.status === 'PASS' ? '✅ ผ่าน' : a.status === 'FAIL' ? '❌ ไม่ผ่าน' : '⏳ ยังไม่เสร็จ'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 truncate pr-1">
                      {a.location ? a.location.name : <span className="text-slate-300">—</span>}
                    </div>
                    <div className="text-xs text-slate-400">{fmtDateTime(a.completed_at || a.created_at)}</div>
                    <div>
                      <button onClick={() => setDelAttempt(a)}
                        className="btn btn-sm btn-danger p-1.5" title="ลบรายการนี้">
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? '+ เพิ่มข้อสอบใหม่' : '✏️ แก้ไขข้อสอบ'}
        sub={course?.name}
        maxWidth={680}
        footer={
          <>
            <button onClick={() => setModal(null)} className="btn btn-secondary btn-sm">ยกเลิก</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm disabled:opacity-60">
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </>
        }
      >
        <div className="form-group mb-3.5">
          <label className="form-label">คำถาม *</label>
          <textarea className="form-input min-h-[90px] resize-y"
            value={form.question}
            onChange={e => setF('question', e.target.value)}
            placeholder="พิมพ์คำถาม..." />
        </div>

        <div className="form-group mb-3.5">
          <label className="form-label">คำอธิบายเฉลย</label>
          <input className="form-input"
            value={form.explanation}
            onChange={e => setF('explanation', e.target.value)}
            placeholder="อธิบายเหตุผลของคำตอบที่ถูก..." />
        </div>

        <div className="mb-3.5">
          <label className="form-label">
            ตัวเลือกคำตอบ{' '}
            <span className="font-normal text-slate-500">(คลิกวงกลมเพื่อระบุคำตอบที่ถูก)</span>
          </label>
          <div className="flex flex-col gap-2">
            {choices.map((c, i) => (
              <ChoiceRow key={i} choice={c} index={i}
                onRadio={() => setC(i, 'is_correct', true)}
                onText={v => setC(i, 'choice_text', v)}
              />
            ))}
          </div>
          <button type="button"
            onClick={() => setChoices(prev => [...prev, { choice_text: '', is_correct: false }])}
            className="mt-2.5 w-full bg-transparent text-blue-600 border border-dashed border-blue-300 rounded-lg py-1.5 text-xs cursor-pointer hover:bg-blue-50 transition-colors">
            + เพิ่มตัวเลือก
          </button>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
          <input type="checkbox" className="w-4 h-4"
            checked={form.is_active}
            onChange={e => setF('is_active', e.target.checked)} />
          เปิดใช้งานข้อนี้
        </label>
      </Modal>
    </div>
  );
}
