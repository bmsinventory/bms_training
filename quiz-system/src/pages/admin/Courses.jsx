import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { InlineLoader } from '../../components/Loading';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { getTrainingCategories } from '../../services/categories.service';
import { getSettings } from '../../services/settings.service';
import {
  getAllCoursesAdmin, createCourse, updateCourse, toggleCourseActive, deleteCourse,
  getCourseCategoryIds, setCourseCategories,
} from '../../services/courses.service';
import { getAttemptCountByCourse } from '../../services/attempts.service';

const EMPTY = {
  name: '', description: '', pass_percent: 80,
  questions_count: 10, max_attempts: 0, time_limit_min: 0,
  is_active: true, categoryIds: [],
};

function Stat({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5">
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

export default function Courses() {
  const toast = useToast();
  const [courses, setCourses]           = useState([]);
  const [trainingCats, setTrainingCats] = useState([]);
  const [courseLinks, setCourseLinks]   = useState([]);
  const [settings, setSettings]         = useState({});
  const [loading, setLoading]           = useState(true);
  const [modal, setModal]               = useState(null);
  const [form, setForm]                 = useState(EMPTY);
  const [saving, setSaving]             = useState(false);
  const [confirmDlg, setConfirmDlg]     = useState(null);

  async function load() {
    setLoading(true);
    const [allCourses, cats, stg] = await Promise.all([
      getAllCoursesAdmin(),
      getTrainingCategories(),
      getSettings(),
    ]);
    const cs    = allCourses.map(({ category_ids, ...c }) => c);
    const links = allCourses.flatMap(c =>
      (c.category_ids || []).map(catId => ({ course_id: c.id, category_id: catId }))
    );
    setCourses(cs);
    setTrainingCats(cats);
    setSettings(stg);
    setCourseLinks(links);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const catMap = Object.fromEntries(trainingCats.map(c => [c.id, c]));

  const editingId  = modal && modal !== 'add' ? modal.id : null;
  const usedCatIds = courseLinks
    .filter(l => l.course_id !== editingId)
    .map(l => l.category_id);

  function getLinkedCats(courseId) {
    return courseLinks
      .filter(l => l.course_id === courseId)
      .map(l => catMap[l.category_id])
      .filter(Boolean);
  }

  const locGroups = {};
  const locOrder  = [];
  trainingCats.forEach(cat => {
    const key = cat.location?.code || '__none__';
    if (!locGroups[key]) { locGroups[key] = { loc: cat.location, cats: [] }; locOrder.push(key); }
    locGroups[key].cats.push(cat);
  });

  function openAdd()   { setForm(EMPTY); setModal('add'); }
  async function openEdit(c) {
    const ids = await getCourseCategoryIds(c.id);
    setForm({ ...c, categoryIds: ids.map(String) });
    setModal(c);
  }
  function closeModal() { setModal(null); }
  function setF(k, v)   { setForm(p => ({ ...p, [k]: v })); }
  function toggleCat(id) {
    const sid = String(id);
    setF('categoryIds', form.categoryIds.includes(sid)
      ? form.categoryIds.filter(x => x !== sid)
      : [...form.categoryIds, sid]);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('กรุณากรอกชื่อหลักสูตร'); return; }
    setSaving(true);
    try {
      const { categoryIds, ...rest } = form;
      const payload = { ...rest, name: form.name.trim() };
      let courseId;
      if (modal === 'add') {
        const { id } = await createCourse(payload);
        courseId = id;
        toast.success('เพิ่มหลักสูตรสำเร็จ');
      } else {
        await updateCourse(modal.id, payload);
        courseId = modal.id;
        toast.success('บันทึกสำเร็จ');
      }
      await setCourseCategories(courseId, categoryIds.map(Number));
      closeModal(); load();
    } catch (e) { toast.error('บันทึกไม่สำเร็จ: ' + (e?.message || e)); }
    finally     { setSaving(false); }
  }

  async function toggleActive(c) {
    await toggleCourseActive(c.id, c.is_active);
    load();
  }

  async function handleDelete(c) {
    const attemptCount = await getAttemptCountByCourse(c.id);

    const doCascadeDelete = async () => {
      try {
        await deleteCourse(c.id);
        toast.success('ลบสำเร็จ'); load();
      } catch (e) {
        toast.error('ลบไม่สำเร็จ: ' + (e?.message || e));
      }
    };

    if (attemptCount > 0) {
      setConfirmDlg({
        message: `หลักสูตร "${c.name}" มีประวัติสอบ ${attemptCount} รายการ\nการลบจะลบข้อมูลทั้งหมด (ประวัติ + คำตอบ + ใบรับรอง) ด้วย\n\nยืนยันลบถาวรหรือไม่?`,
        danger: true,
        onOk: doCascadeDelete,
      });
      return;
    }

    setConfirmDlg({
      message: `ลบหลักสูตร "${c.name}" จะลบข้อสอบทั้งหมดด้วย ยืนยัน?`,
      onOk: doCascadeDelete,
    });
  }

  const quizBaseUrl   = settings.quiz_base_url || window.location.href.split('#')[0].replace(/\/+$/, '');
  const activeCount   = courses.filter(c => c.is_active).length;
  const inactiveCount = courses.filter(c => !c.is_active).length;

  function quizLink(c) {
    const linked  = getLinkedCats(c.id);
    const codes   = [...new Set(linked.map(cat => cat.location?.code).filter(Boolean))];
    const bmsSite = localStorage.getItem('bms_quiz_site');
    const site    = (bmsSite && codes.includes(bmsSite)) ? bmsSite
                  : codes.length === 1 ? codes[0] : '';
    return site ? `${quizBaseUrl}/#/?site=${site}` : `${quizBaseUrl}/#/`;
  }

  return (
    <div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <Stat label="หลักสูตรทั้งหมด" value={courses.length} color="#2563eb" />
        <Stat label="เปิดใช้งาน"      value={activeCount}   color="#059669" />
        <Stat label="ปิดใช้งาน"       value={inactiveCount} color="#94a3b8" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-sm font-semibold text-blue-600 flex items-center gap-2">
          <span>📚</span> จัดการหลักสูตรแบบทดสอบ
        </div>
        <button onClick={openAdd} className="btn btn-primary btn-sm shrink-0">+ เพิ่มหลักสูตร</button>
      </div>

      {/* Cards */}
      {loading ? <InlineLoader /> : courses.length === 0 ? (
        <div className="text-center py-14 text-slate-400">
          <div className="text-5xl mb-2.5">📚</div>
          <p>ยังไม่มีหลักสูตร คลิก "เพิ่มหลักสูตร" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
          {courses.map(c => {
            const linkedCats = getLinkedCats(c.id);
            return (
              <div key={c.id} className={`bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden ${!c.is_active ? 'opacity-60' : ''}`}>
                <div className="p-3.5 flex-1">
                  {/* Title row */}
                  <div className="flex items-start gap-2 mb-1.5">
                    <span className={`badge shrink-0 mt-0.5 ${c.is_active ? 'badge-pass' : 'badge-gray'}`}>
                      {c.is_active ? 'เปิด' : 'ปิด'}
                    </span>
                    <div className="font-bold text-slate-900 leading-snug">{c.name}</div>
                  </div>

                  {c.description && (
                    <div className="text-xs text-slate-500 leading-relaxed mb-2.5 line-clamp-3">{c.description}</div>
                  )}

                  <div className="flex gap-1.5 flex-wrap mb-2.5">
                    <span className="badge badge-info">📝 {c.questions_count} ข้อ</span>
                    <span className="badge" style={{ background: '#fffbeb', color: '#92400e' }}>🎯 ผ่าน {c.pass_percent}%</span>
                    {c.time_limit_min > 0 && <span className="badge badge-gray">⏱ {c.time_limit_min} นาที</span>}
                    {c.max_attempts > 0 && <span className="badge badge-gray">🔁 {c.max_attempts} ครั้ง</span>}
                  </div>

                  {linkedCats.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {linkedCats.map(cat => (
                        <span key={cat.id} className="badge" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                          {cat.location?.code && (
                            <span className="font-mono font-bold text-blue-600 mr-1 text-xs">{cat.location.code}</span>
                          )}
                          {cat.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-300">ไม่ได้เชื่อมหลักสูตรอบรม</span>
                  )}
                </div>

                {/* Footer */}
                <div className="px-3.5 py-2.5 border-t border-slate-100 flex gap-1.5 flex-wrap items-center">
                  <Link to={`/admin/questions/${c.id}`} className="btn btn-sm btn-primary">📝 ข้อสอบ</Link>
                  <button onClick={() => openEdit(c)} className="btn btn-sm btn-ghost">✏️ แก้ไข</button>
                  <button onClick={() => toggleActive(c)} className="btn btn-sm btn-ghost">
                    {c.is_active ? '🔴 ปิด' : '🟢 เปิด'}
                  </button>
                  <a href={quizLink(c)} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost no-underline">
                    🔗 เปิด
                  </a>
                  <button onClick={() => handleDelete(c)} className="btn btn-sm btn-danger ml-auto">🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={!!confirmDlg}
        title="ยืนยันการดำเนินการ"
        desc={confirmDlg?.message}
        danger={confirmDlg?.danger ?? true}
        onOk={() => { const fn = confirmDlg?.onOk; setConfirmDlg(null); fn?.(); }}
        onCancel={() => setConfirmDlg(null)}
      />

      {/* Add/Edit Modal */}
      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal === 'add' ? '➕ เพิ่มหลักสูตรใหม่' : '✏️ แก้ไขหลักสูตร'}
        footer={
          <>
            <button onClick={closeModal} className="btn btn-secondary btn-sm">ยกเลิก</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm disabled:opacity-60">
              {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
            </button>
          </>
        }
      >
        {/* Category links */}
        <div className="form-group mb-3.5">
          <label className="form-label">
            🔗 เชื่อมกับหลักสูตรอบรม
            {form.categoryIds.length > 0 && (
              <span className="ml-2 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                {form.categoryIds.length} หลักสูตร
              </span>
            )}
          </label>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            {trainingCats.length === 0 ? (
              <div className="p-3 text-sm text-slate-400">ยังไม่มีหลักสูตรอบรม</div>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {locOrder.map(key => {
                  const { loc, cats } = locGroups[key];
                  return (
                    <div key={key}>
                      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500">
                        📍 {loc ? `${loc.name} (${loc.code})` : 'ไม่ระบุสาขา'}
                      </div>
                      {cats.map(cat => {
                        const isChecked = form.categoryIds.includes(String(cat.id));
                        const isUsed    = !isChecked && usedCatIds.includes(cat.id);
                        return (
                          <label key={cat.id}
                            className={`flex items-center gap-2.5 px-3.5 py-1.5 border-b border-slate-50 ${isUsed ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'} ${isChecked ? 'bg-blue-50' : ''}`}>
                            <input type="checkbox" className="w-4 h-4 shrink-0"
                              checked={isChecked} disabled={isUsed}
                              onChange={() => !isUsed && toggleCat(cat.id)} />
                            <span className={`text-sm flex-1 ${isChecked ? 'text-blue-700' : 'text-slate-900'}`}>
                              {loc?.code && (
                                <span className="font-mono font-bold text-blue-600 mr-1.5 text-xs">{loc.code}</span>
                              )}
                              {cat.name}
                              {isUsed && <span className="text-xs text-slate-400 ml-1.5">(ถูกใช้แล้ว)</span>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {form.categoryIds.length === 0 && (
            <div className="text-xs text-slate-400 mt-1">
              ไม่เลือก = Standalone (ปรากฏในส่วน "แบบทดสอบอื่นๆ")
            </div>
          )}
        </div>

        <div className="form-group mb-3.5">
          <label className="form-label">ชื่อหลักสูตร (Quiz) *</label>
          <input className="form-input" value={form.name}
            onChange={e => setF('name', e.target.value)}
            placeholder="เช่น ความปลอดภัยในการทำงาน" />
        </div>

        <div className="form-group mb-3.5">
          <label className="form-label">คำอธิบาย</label>
          <textarea className="form-input min-h-20 resize-y"
            value={form.description} onChange={e => setF('description', e.target.value)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 mb-3.5">
          <div>
            <label className="form-label">จำนวนข้อที่สุ่ม</label>
            <input type="number" min="1" max="100" className="form-input"
              value={form.questions_count} onChange={e => setF('questions_count', +e.target.value)} />
          </div>
          <div>
            <label className="form-label">เกณฑ์ผ่าน (%)</label>
            <input type="number" min="1" max="100" className="form-input"
              value={form.pass_percent} onChange={e => setF('pass_percent', +e.target.value)} />
          </div>
          <div>
            <label className="form-label">จำกัดครั้ง (0=ไม่จำกัด)</label>
            <input type="number" min="0" className="form-input"
              value={form.max_attempts} onChange={e => setF('max_attempts', +e.target.value)} />
          </div>
          <div>
            <label className="form-label">จำกัดเวลา นาที (0=ไม่จำกัด)</label>
            <input type="number" min="0" className="form-input"
              value={form.time_limit_min} onChange={e => setF('time_limit_min', +e.target.value)} />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
          <input type="checkbox" checked={form.is_active}
            onChange={e => setF('is_active', e.target.checked)} className="w-4 h-4" />
          เปิดใช้งาน
        </label>
      </Modal>
    </div>
  );
}
