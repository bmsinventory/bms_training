import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { InlineLoader } from '../../components/Loading';
import { useToast } from '../../contexts/ToastContext';
import {
  supabase, getTrainingCategories, getSettings,
  getCourseCategoryIds, setCourseCategories,
} from '../../lib/supabase';

const EMPTY = {
  name: '', description: '', pass_percent: 80,
  questions_count: 10, max_attempts: 0, time_limit_min: 0,
  is_active: true, categoryIds: [],
};

const s = {
  page:      { fontFamily:"'Anuphan','Sarabun',sans-serif", fontSize:14 },
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 },
  statBox:   { background:'#fff', borderRadius:10, border:'1px solid #e2e8f0', padding:'10px 16px' },
  statLbl:   { fontSize:11, color:'#64748b', marginBottom:3 },
  statVal:   { fontSize:22, fontWeight:700 },

  toolbar:   { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  secTitle:  { fontSize:14, fontWeight:600, color:'#2563eb', display:'flex', alignItems:'center', gap:8 },
  btnPri:    { background:'#2563eb', color:'#fff', border:'none', borderRadius:8, padding:'7px 16px',
               fontSize:13, fontWeight:500, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 },

  grid:      { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 },

  card:      (active) => ({
    background:'#fff', borderRadius:12, border:'1px solid #e2e8f0',
    boxShadow:'0 1px 3px rgba(0,0,0,.06)', display:'flex', flexDirection:'column',
    opacity: active ? 1 : 0.6, overflow:'hidden',
  }),
  cardTop:   { padding:'14px 16px 10px', flex:1 },
  cardFoot:  { padding:'10px 14px', borderTop:'1px solid #f1f5f9',
               display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' },

  badge:     (active) => ({
    display:'inline-flex', alignItems:'center', padding:'2px 9px',
    borderRadius:20, fontSize:11, fontWeight:600,
    background: active ? '#ecfdf5' : '#f1f5f9',
    color:      active ? '#065f46' : '#475569',
  }),
  chip:      { display:'inline-flex', alignItems:'center', padding:'2px 8px',
               borderRadius:8, fontSize:11, fontWeight:500,
               background:'#f1f5f9', color:'#475569' },
  chipBlue:  { display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px',
               borderRadius:8, fontSize:11, fontWeight:500,
               background:'#eff6ff', color:'#1d4ed8' },

  btnSm:     { background:'transparent', color:'#64748b', border:'1px solid #e2e8f0',
               borderRadius:7, padding:'4px 9px', fontSize:12, fontWeight:500,
               cursor:'pointer', display:'inline-flex', alignItems:'center', gap:3 },
  btnSmPri:  { background:'#2563eb', color:'#fff', border:'none',
               borderRadius:7, padding:'4px 9px', fontSize:12, fontWeight:500,
               cursor:'pointer', display:'inline-flex', alignItems:'center', gap:3, textDecoration:'none' },
  btnSmDanger:{ background:'transparent', color:'#dc2626', border:'1px solid #fecaca',
               borderRadius:7, padding:'4px 9px', fontSize:12, cursor:'pointer' },

  empty:     { textAlign:'center', padding:'56px 0', color:'#94a3b8' },

  /* modal */
  overlay:   { position:'fixed', inset:0, zIndex:999, display:'flex', alignItems:'center',
               justifyContent:'center', background:'rgba(15,23,42,.55)', padding:16 },
  modal:     { background:'#fff', borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,.2)',
               width:'100%', maxWidth:520, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column' },
  mHead:     { background:'linear-gradient(135deg,#1a3a6b,#1a56a0)', padding:'16px 22px', color:'#fff' },
  mBody:     { overflowY:'auto', flex:1, padding:22 },
  mFoot:     { padding:'12px 22px', borderTop:'1px solid #f1f5f9', display:'flex', gap:8, justifyContent:'flex-end' },

  input:     { width:'100%', padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:8,
               fontFamily:"inherit", fontSize:14, color:'#0f172a', background:'#fff', boxSizing:'border-box' },
  label:     { display:'block', fontSize:13, fontWeight:500, color:'#334155', marginBottom:5 },
  fGroup:    { marginBottom:14 },
  btnCancel: { background:'transparent', color:'#64748b', border:'1px solid #e2e8f0',
               borderRadius:8, padding:'7px 18px', fontSize:13, fontWeight:500, cursor:'pointer' },
};

function Stat({ label, value, color }) {
  return (
    <div style={s.statBox}>
      <div style={s.statLbl}>{label}</div>
      <div style={{ ...s.statVal, color }}>{value}</div>
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

  async function load() {
    setLoading(true);
    const [{ data: cs }, cats, stg, { data: links }] = await Promise.all([
      supabase.from('courses').select('*').order('created_at'),
      getTrainingCategories(),
      getSettings(),
      supabase.from('course_categories').select('course_id,category_id'),
    ]);
    setCourses(cs || []);
    setTrainingCats(cats);
    setSettings(stg);
    setCourseLinks(links || []);
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
        const { data, error } = await supabase.from('courses').insert(payload).select('id').single();
        if (error) throw error;
        courseId = data.id;
        toast.success('เพิ่มหลักสูตรสำเร็จ');
      } else {
        await supabase.from('courses').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', modal.id);
        courseId = modal.id;
        toast.success('บันทึกสำเร็จ');
      }
      await setCourseCategories(courseId, categoryIds.map(Number));
      closeModal(); load();
    } catch (e) { toast.error('บันทึกไม่สำเร็จ: ' + (e?.message || e)); }
    finally     { setSaving(false); }
  }

  async function toggleActive(c) {
    await supabase.from('courses').update({ is_active: !c.is_active }).eq('id', c.id);
    load();
  }

  async function handleDelete(c) {
    // check if any attempts reference this course
    const { count } = await supabase
      .from('quiz_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', c.id);
    if (count > 0) {
      toast.error(`ไม่สามารถลบได้ มีประวัติการสอบ ${count} รายการ กรุณาปิดใช้งานแทน`);
      return;
    }
    if (!confirm(`ลบหลักสูตร "${c.name}" จะลบข้อสอบทั้งหมดด้วย ยืนยัน?`)) return;
    try {
      // remove category links first
      await supabase.from('course_categories').delete().eq('course_id', c.id);
      const { error } = await supabase.from('courses').delete().eq('id', c.id);
      if (error) throw error;
      toast.success('ลบสำเร็จ'); load();
    } catch (e) {
      toast.error('ลบไม่สำเร็จ: ' + (e?.message || e));
    }
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
    <div style={s.page}>

      {/* Stats */}
      <div style={s.statsGrid}>
        <Stat label="หลักสูตรทั้งหมด" value={courses.length} color="#2563eb" />
        <Stat label="เปิดใช้งาน"      value={activeCount}   color="#059669" />
        <Stat label="ปิดใช้งาน"       value={inactiveCount} color="#94a3b8" />
      </div>

      {/* Toolbar */}
      <div style={s.toolbar}>
        <div style={s.secTitle}><span>📚</span> จัดการหลักสูตรแบบทดสอบ</div>
        <button onClick={openAdd} style={s.btnPri}><span>+</span> เพิ่มหลักสูตร</button>
      </div>

      {/* Cards */}
      {loading ? <InlineLoader /> : courses.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontSize:48, marginBottom:10 }}>📚</div>
          <p>ยังไม่มีหลักสูตร คลิก "เพิ่มหลักสูตร" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div style={s.grid}>
          {courses.map(c => {
            const linkedCats = getLinkedCats(c.id);
            return (
              <div key={c.id} style={s.card(c.is_active)}>
                <div style={s.cardTop}>

                  {/* Title row */}
                  <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                    <span style={{ ...s.badge(c.is_active), flexShrink:0, marginTop:2 }}>
                      {c.is_active ? 'เปิด' : 'ปิด'}
                    </span>
                    <div style={{ fontWeight:700, fontSize:15, color:'#0f172a', lineHeight:1.4 }}>
                      {c.name}
                    </div>
                  </div>

                  {/* Description */}
                  {c.description && (
                    <div style={{ fontSize:12, color:'#64748b', lineHeight:1.6, marginBottom:10,
                                  display:'-webkit-box', WebkitLineClamp:3,
                                  WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                      {c.description}
                    </div>
                  )}

                  {/* Stats chips */}
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:10 }}>
                    <span style={s.chip}>📝 {c.questions_count} ข้อ</span>
                    <span style={{ ...s.chip, background:'#fffbeb', color:'#92400e' }}>🎯 ผ่าน {c.pass_percent}%</span>
                    {c.time_limit_min > 0 && (
                      <span style={s.chip}>⏱ {c.time_limit_min} นาที</span>
                    )}
                    {c.max_attempts > 0 && (
                      <span style={s.chip}>🔁 {c.max_attempts} ครั้ง</span>
                    )}
                  </div>

                  {/* Linked categories */}
                  {linkedCats.length > 0 ? (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {linkedCats.map(cat => (
                        <span key={cat.id} style={s.chipBlue}>
                          {cat.location?.code && (
                            <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:10 }}>
                              {cat.location.code}
                            </span>
                          )}
                          {cat.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize:11, color:'#cbd5e1' }}>ไม่ได้เชื่อมหลักสูตรอบรม</span>
                  )}
                </div>

                {/* Action footer */}
                <div style={s.cardFoot}>
                  <Link to={`/admin/questions/${c.id}`} style={s.btnSmPri}>📝 ข้อสอบ</Link>
                  <button onClick={() => openEdit(c)}    style={s.btnSm}>✏️ แก้ไข</button>
                  <button onClick={() => toggleActive(c)} style={s.btnSm}>
                    {c.is_active ? '🔴 ปิด' : '🟢 เปิด'}
                  </button>
                  <a href={quizLink(c)} target="_blank" rel="noopener noreferrer" style={{ ...s.btnSm, textDecoration:'none' }}>
                    🔗 เปิด
                  </a>
                  <button onClick={() => handleDelete(c)} style={{ ...s.btnSmDanger, marginLeft:'auto' }}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.mHead}>
              <div style={{ fontWeight:700, fontSize:15 }}>
                {modal === 'add' ? '➕ เพิ่มหลักสูตรใหม่' : '✏️ แก้ไขหลักสูตร'}
              </div>
            </div>

            <div style={s.mBody}>
              {/* Category links */}
              <div style={s.fGroup}>
                <label style={s.label}>
                  🔗 เชื่อมกับหลักสูตรอบรม
                  {form.categoryIds.length > 0 && (
                    <span style={{ marginLeft:8, background:'#eff6ff', color:'#1d4ed8',
                                   padding:'1px 8px', borderRadius:20, fontSize:11, fontWeight:600 }}>
                      {form.categoryIds.length} หลักสูตร
                    </span>
                  )}
                </label>
                <div style={{ border:'1px solid #e2e8f0', borderRadius:8, overflow:'hidden' }}>
                  {trainingCats.length === 0 ? (
                    <div style={{ padding:'10px 14px', fontSize:13, color:'#94a3b8' }}>ยังไม่มีหลักสูตรอบรม</div>
                  ) : (
                    <div style={{ maxHeight:200, overflowY:'auto' }}>
                      {locOrder.map(key => {
                        const { loc, cats } = locGroups[key];
                        return (
                          <div key={key}>
                            <div style={{ padding:'5px 12px', background:'#f8fafc',
                                          borderBottom:'1px solid #f1f5f9',
                                          fontSize:11, fontWeight:700, color:'#475569' }}>
                              📍 {loc ? `${loc.name} (${loc.code})` : 'ไม่ระบุสาขา'}
                            </div>
                            {cats.map(cat => {
                              const isChecked = form.categoryIds.includes(String(cat.id));
                              const isUsed    = !isChecked && usedCatIds.includes(cat.id);
                              return (
                                <label key={cat.id} style={{
                                  display:'flex', alignItems:'center', gap:10,
                                  padding:'7px 14px', cursor: isUsed ? 'not-allowed' : 'pointer',
                                  background: isChecked ? '#eff6ff' : 'transparent',
                                  borderBottom:'1px solid #f8fafc', opacity: isUsed ? 0.45 : 1,
                                }}>
                                  <input type="checkbox" style={{ width:15, height:15, flexShrink:0 }}
                                    checked={isChecked} disabled={isUsed}
                                    onChange={() => !isUsed && toggleCat(cat.id)} />
                                  <span style={{ fontSize:13, flex:1, color: isChecked ? '#1d4ed8' : '#0f172a' }}>
                                    {loc?.code && (
                                      <span style={{ fontFamily:'monospace', fontWeight:700,
                                                     color:'#2563eb', marginRight:6, fontSize:12 }}>
                                        {loc.code}
                                      </span>
                                    )}
                                    {cat.name}
                                    {isUsed && <span style={{ fontSize:11, color:'#94a3b8', marginLeft:6 }}>(ถูกใช้แล้ว)</span>}
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
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>
                    ไม่เลือก = Standalone (ปรากฏในส่วน "แบบทดสอบอื่นๆ")
                  </div>
                )}
              </div>

              <div style={s.fGroup}>
                <label style={s.label}>ชื่อหลักสูตร (Quiz) *</label>
                <input style={s.input} value={form.name}
                  onChange={e => setF('name', e.target.value)}
                  placeholder="เช่น ความปลอดภัยในการทำงาน" />
              </div>

              <div style={s.fGroup}>
                <label style={s.label}>คำอธิบาย</label>
                <textarea style={{ ...s.input, minHeight:80, resize:'vertical' }}
                  value={form.description} onChange={e => setF('description', e.target.value)} />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div style={s.fGroup}>
                  <label style={s.label}>จำนวนข้อที่สุ่ม</label>
                  <input type="number" min="1" max="100" style={s.input}
                    value={form.questions_count} onChange={e => setF('questions_count', +e.target.value)} />
                </div>
                <div style={s.fGroup}>
                  <label style={s.label}>เกณฑ์ผ่าน (%)</label>
                  <input type="number" min="1" max="100" style={s.input}
                    value={form.pass_percent} onChange={e => setF('pass_percent', +e.target.value)} />
                </div>
                <div style={s.fGroup}>
                  <label style={s.label}>จำกัดครั้ง (0=ไม่จำกัด)</label>
                  <input type="number" min="0" style={s.input}
                    value={form.max_attempts} onChange={e => setF('max_attempts', +e.target.value)} />
                </div>
                <div style={s.fGroup}>
                  <label style={s.label}>จำกัดเวลา นาที (0=ไม่จำกัด)</label>
                  <input type="number" min="0" style={s.input}
                    value={form.time_limit_min} onChange={e => setF('time_limit_min', +e.target.value)} />
                </div>
              </div>

              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, fontWeight:500, color:'#334155' }}>
                <input type="checkbox" checked={form.is_active}
                  onChange={e => setF('is_active', e.target.checked)} style={{ width:16, height:16 }} />
                เปิดใช้งาน
              </label>
            </div>

            <div style={s.mFoot}>
              <button onClick={closeModal} style={s.btnCancel}>ยกเลิก</button>
              <button onClick={handleSave} disabled={saving} style={{ ...s.btnPri, padding:'7px 20px' }}>
                {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
