import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { InlineLoader } from '../components/Loading';
import { useToast } from '../contexts/ToastContext';
import { getCourse, createAttempt, getAllAttempts, getSettings } from '../lib/supabase';
import { isValidEmail } from '../lib/utils';

const s = {
  page:    { fontFamily:"'Anuphan','Sarabun',sans-serif", minHeight:'100vh', background:'#f1f5f9' },
  wrap:    { maxWidth:480, margin:'0 auto', padding:'28px 16px 48px' },

  /* course banner */
  banner:  { background:'#fff', borderRadius:12, border:'1px solid #e2e8f0',
             borderLeft:'4px solid #2563eb', padding:'16px 18px', marginBottom:16,
             boxShadow:'0 1px 3px rgba(0,0,0,.07)' },
  bannerLbl:{ fontSize:11, fontWeight:700, color:'#2563eb', letterSpacing:'.5px',
              textTransform:'uppercase', marginBottom:4 },
  bannerName:{ fontSize:18, fontWeight:700, color:'#0f172a', lineHeight:1.3 },
  bannerDesc:{ fontSize:13, color:'#64748b', marginTop:4 },

  /* stats row */
  statsRow:{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' },
  statChip:( color, bg ) => ({
    display:'inline-flex', alignItems:'center', gap:5,
    padding:'4px 10px', borderRadius:20, fontSize:12, fontWeight:600,
    background:bg, color,
  }),

  /* form card */
  card:    { background:'#fff', borderRadius:12, border:'1px solid #e2e8f0',
             boxShadow:'0 1px 3px rgba(0,0,0,.07)', overflow:'hidden' },
  cardHd:  { background:'linear-gradient(135deg,#1a3a6b,#1a56a0)',
             padding:'18px 22px' },
  cardHdTitle:{ fontSize:16, fontWeight:700, color:'#fff', marginBottom:2 },
  cardHdSub:  { fontSize:13, color:'rgba(255,255,255,.7)' },
  cardBody:{ padding:'22px' },

  /* field */
  fGroup:  { marginBottom:18 },
  label:   { display:'block', fontSize:13, fontWeight:600, color:'#334155', marginBottom:6 },
  req:     { color:'#dc2626', marginLeft:2 },
  input:   { width:'100%', padding:'10px 13px', border:'1px solid #e2e8f0',
             borderRadius:9, fontFamily:'inherit', fontSize:14, color:'#0f172a',
             background:'#fff', boxSizing:'border-box', outline:'none',
             transition:'border-color .15s, box-shadow .15s' },
  inputErr:{ width:'100%', padding:'10px 13px', border:'1px solid #fca5a5',
             borderRadius:9, fontFamily:'inherit', fontSize:14, color:'#0f172a',
             background:'#fff', boxSizing:'border-box', outline:'none' },
  errMsg:  { fontSize:12, color:'#dc2626', marginTop:4 },
  hint:    { fontSize:12, color:'#94a3b8', marginTop:4 },

  /* notice */
  notice:  { display:'flex', gap:10, alignItems:'flex-start', background:'#fffbeb',
             border:'1px solid #fde68a', borderRadius:9, padding:'12px 14px',
             marginBottom:20, fontSize:13, color:'#92400e' },

  /* button */
  btnSubmit:{ width:'100%', padding:'12px', background:'#2563eb', color:'#fff',
              border:'none', borderRadius:10, fontSize:15, fontWeight:700,
              cursor:'pointer', display:'flex', alignItems:'center',
              justifyContent:'center', gap:8, transition:'background .15s' },
  btnSubmitDis:{ width:'100%', padding:'12px', background:'#93c5fd', color:'#fff',
                 border:'none', borderRadius:10, fontSize:15, fontWeight:700,
                 cursor:'not-allowed', display:'flex', alignItems:'center',
                 justifyContent:'center', gap:8 },
};

function StatChip({ icon, label, color, bg }) {
  return <span style={s.statChip(color, bg)}>{icon} {label}</span>;
}

export default function Register() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [course, setCourse]   = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState({});
  const [focusField, setFocusField] = useState('');

  const [form, setForm] = useState({ fullName: '', email: '' });

  useEffect(() => {
    Promise.all([getCourse(courseId), getSettings()])
      .then(([c, stg]) => { setCourse(c); setSettings(stg); })
      .catch(() => toast.error('ไม่พบหลักสูตร'))
      .finally(() => setLoading(false));
  }, [courseId]);

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  }

  function validate() {
    const errs = {};
    if (!form.fullName.trim())     errs.fullName = 'กรุณากรอกชื่อ-นามสกุล';
    if (!isValidEmail(form.email)) errs.email    = 'รูปแบบอีเมลไม่ถูกต้อง';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (course.max_attempts > 0) {
        const prev = await getAllAttempts({ courseId, search: form.email });
        const mine = prev.filter(
          a => a.email.toLowerCase() === form.email.toLowerCase() && a.status !== 'started'
        );
        if (mine.length >= course.max_attempts) {
          toast.error(`อีเมลนี้สอบหลักสูตรนี้ครบ ${course.max_attempts} ครั้งแล้ว`);
          setSaving(false);
          return;
        }
      }

      const attempt = await createAttempt({
        course_id: courseId,
        full_name: form.fullName.trim(),
        email:     form.email.trim().toLowerCase(),
        status:    'started',
      });

      navigate(`/quiz/${attempt.id}`, {
        state: { course, form: { ...form, fullName: form.fullName.trim() } },
      });
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <><Navbar /><InlineLoader text="กำลังโหลด..." /></>;

  return (
    <div style={s.page}>
      <Navbar siteName={settings.site_name} />

      <div style={s.wrap}>

        {/* Course banner */}
        {course && (
          <div style={s.banner}>
            <div style={s.bannerLbl}>แบบทดสอบ</div>
            <div style={s.bannerName}>{course.name}</div>
            {course.description && (
              <div style={s.bannerDesc}>{course.description}</div>
            )}
            <div style={s.statsRow}>
              <StatChip icon="📝" label={`${course.questions_count} ข้อ`} color="#1d4ed8" bg="#eff6ff" />
              <StatChip icon="🎯" label={`ผ่าน ${course.pass_percent}%`}  color="#92400e" bg="#fffbeb" />
              {course.time_limit_min > 0 && (
                <StatChip icon="⏱" label={`${course.time_limit_min} นาที`} color="#065f46" bg="#ecfdf5" />
              )}
              {course.max_attempts > 0 && (
                <StatChip icon="🔄" label={`สอบได้ ${course.max_attempts} ครั้ง`} color="#4c1d95" bg="#f5f3ff" />
              )}
            </div>
          </div>
        )}

        {/* Form card */}
        <div style={s.card}>
          <div style={s.cardHd}>
            <div style={s.cardHdTitle}>ลงทะเบียนทำแบบทดสอบ</div>
            <div style={s.cardHdSub}>กรอกชื่อและอีเมลเพื่อรับใบรับรองเมื่อผ่าน</div>
          </div>

          <div style={s.cardBody}>
            <form onSubmit={handleSubmit} noValidate>

              {/* ชื่อ-นามสกุล */}
              <div style={s.fGroup}>
                <label style={s.label}>
                  ชื่อ-นามสกุล <span style={s.req}>*</span>
                </label>
                <input
                  style={errors.fullName
                    ? s.inputErr
                    : { ...s.input, borderColor: focusField === 'fullName' ? '#2563eb' : '#e2e8f0',
                        boxShadow: focusField === 'fullName' ? '0 0 0 3px rgba(37,99,235,.1)' : 'none' }}
                  placeholder="เช่น สมชาย ใจดี"
                  value={form.fullName}
                  onChange={e => set('fullName', e.target.value)}
                  onFocus={() => setFocusField('fullName')}
                  onBlur={() => setFocusField('')}
                  autoComplete="name"
                  autoFocus
                />
                {errors.fullName && <div style={s.errMsg}>⚠ {errors.fullName}</div>}
              </div>

              {/* อีเมล */}
              <div style={s.fGroup}>
                <label style={s.label}>
                  อีเมล <span style={s.req}>*</span>
                </label>
                <input
                  type="email"
                  style={errors.email
                    ? s.inputErr
                    : { ...s.input, borderColor: focusField === 'email' ? '#2563eb' : '#e2e8f0',
                        boxShadow: focusField === 'email' ? '0 0 0 3px rgba(37,99,235,.1)' : 'none' }}
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  onFocus={() => setFocusField('email')}
                  onBlur={() => setFocusField('')}
                  autoComplete="email"
                />
                {errors.email
                  ? <div style={s.errMsg}>⚠ {errors.email}</div>
                  : <div style={s.hint}>📧 ใบรับรองจะส่งไปยังอีเมลนี้เมื่อผ่านการทดสอบ</div>
                }
              </div>

              {/* Notice */}
              <div style={s.notice}>
                <span style={{ fontSize:16, flexShrink:0 }}>⚠️</span>
                <span>เมื่อเริ่มทำแบบทดสอบแล้ว <strong>จะไม่สามารถย้อนกลับ</strong>มาแก้ไขข้อมูลได้ กรุณาตรวจสอบชื่อและอีเมลให้ถูกต้อง</span>
              </div>

              <button
                type="submit"
                disabled={saving}
                style={saving ? s.btnSubmitDis : s.btnSubmit}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#1d4ed8'; }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#2563eb'; }}
              >
                {saving ? '⏳ กำลังดำเนินการ...' : '🚀 เริ่มทำแบบทดสอบ'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
