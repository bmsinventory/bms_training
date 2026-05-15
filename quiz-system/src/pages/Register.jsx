import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { InlineLoader } from '../components/Loading';
import { useToast } from '../contexts/ToastContext';
import { getCourse, createAttempt, getAllAttempts, getSettings } from '../lib/supabase';
import { isValidEmail } from '../lib/utils';

export default function Register() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [course, setCourse]     = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [errors, setErrors]     = useState({});
  const [focusField, setFocusField] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  const [form, setForm] = useState({ fullName: '', email: '' });

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

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

  const m = isMobile;

  if (loading) return <><Navbar /><InlineLoader text="กำลังโหลด..." /></>;

  return (
    <div style={{ fontFamily:"'Anuphan','Sarabun',sans-serif", minHeight:'100vh', background:'#f1f5f9' }}>
      <Navbar siteName={settings.site_name} />

      <div style={{ maxWidth: 480, margin: '0 auto', padding: m ? '10px 14px 16px' : '28px 16px 48px' }}>

        {/* ── Course banner ── */}
        {course && (
          <div style={{
            background: '#fff', borderRadius: m ? 10 : 12,
            border: '1px solid #e2e8f0', borderLeft: '4px solid #2563eb',
            padding: m ? '10px 14px' : '16px 18px',
            marginBottom: m ? 10 : 16,
            boxShadow: '0 1px 3px rgba(0,0,0,.07)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 2 }}>
              แบบทดสอบ
            </div>
            <div style={{ fontSize: m ? 15 : 18, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
              {course.name}
            </div>
            {!m && course.description && (
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{course.description}</div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: m ? 6 : 10, flexWrap: 'wrap' }}>
              {[
                { icon: '📝', label: `${course.questions_count} ข้อ`,      color: '#1d4ed8', bg: '#eff6ff' },
                { icon: '🎯', label: `ผ่าน ${course.pass_percent}%`,        color: '#92400e', bg: '#fffbeb' },
                course.time_limit_min > 0 && { icon: '⏱', label: `${course.time_limit_min} นาที`, color: '#065f46', bg: '#ecfdf5' },
                course.max_attempts > 0   && { icon: '🔄', label: `${course.max_attempts} ครั้ง`, color: '#4c1d95', bg: '#f5f3ff' },
              ].filter(Boolean).map((chip, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: m ? '3px 8px' : '4px 10px',
                  borderRadius: 20, fontSize: m ? 11 : 12, fontWeight: 600,
                  background: chip.bg, color: chip.color,
                }}>
                  {chip.icon} {chip.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Form card ── */}
        <div style={{
          background: '#fff', borderRadius: m ? 10 : 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,.07)', overflow: 'hidden',
        }}>
          {/* header */}
          <div style={{
            background: 'linear-gradient(135deg,#1a3a6b,#1a56a0)',
            padding: m ? '12px 16px' : '18px 22px',
          }}>
            <div style={{ fontSize: m ? 14 : 16, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
              ลงทะเบียนทำแบบทดสอบ
            </div>
            <div style={{ fontSize: m ? 12 : 13, color: 'rgba(255,255,255,.7)' }}>
              กรอกชื่อและอีเมลเพื่อรับใบรับรองเมื่อผ่าน
            </div>
          </div>

          {/* body */}
          <div style={{ padding: m ? '12px 14px' : '22px' }}>
            <form onSubmit={handleSubmit} noValidate>

              {/* ชื่อ-นามสกุล */}
              <div style={{ marginBottom: m ? 10 : 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: m ? 4 : 6 }}>
                  ชื่อ-นามสกุล <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>
                </label>
                <input
                  style={{
                    width: '100%', padding: m ? '9px 12px' : '10px 13px',
                    border: `1px solid ${errors.fullName ? '#fca5a5' : focusField === 'fullName' ? '#2563eb' : '#e2e8f0'}`,
                    borderRadius: 9, fontFamily: 'inherit', fontSize: 14, color: '#0f172a',
                    background: '#fff', boxSizing: 'border-box', outline: 'none',
                    boxShadow: focusField === 'fullName' && !errors.fullName ? '0 0 0 3px rgba(37,99,235,.1)' : 'none',
                    transition: 'border-color .15s, box-shadow .15s',
                  }}
                  placeholder="เช่น สมชาย ใจดี"
                  value={form.fullName}
                  onChange={e => set('fullName', e.target.value)}
                  onFocus={() => setFocusField('fullName')}
                  onBlur={() => setFocusField('')}
                  autoComplete="name"
                  autoFocus
                />
                {errors.fullName && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>⚠ {errors.fullName}</div>}
              </div>

              {/* อีเมล */}
              <div style={{ marginBottom: m ? 10 : 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: m ? 4 : 6 }}>
                  อีเมล <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>
                </label>
                <input
                  type="email"
                  style={{
                    width: '100%', padding: m ? '9px 12px' : '10px 13px',
                    border: `1px solid ${errors.email ? '#fca5a5' : focusField === 'email' ? '#2563eb' : '#e2e8f0'}`,
                    borderRadius: 9, fontFamily: 'inherit', fontSize: 14, color: '#0f172a',
                    background: '#fff', boxSizing: 'border-box', outline: 'none',
                    boxShadow: focusField === 'email' && !errors.email ? '0 0 0 3px rgba(37,99,235,.1)' : 'none',
                    transition: 'border-color .15s, box-shadow .15s',
                  }}
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  onFocus={() => setFocusField('email')}
                  onBlur={() => setFocusField('')}
                  autoComplete="email"
                />
                {errors.email
                  ? <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>⚠ {errors.email}</div>
                  : <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>📧 {m ? 'ใบรับรองจะส่งไปยังอีเมลนี้' : 'ใบรับรองจะส่งไปยังอีเมลนี้เมื่อผ่าน'}</div>
                }
              </div>

              {/* Notice */}
              <div style={{
                display: 'flex', gap: 8, alignItems: 'flex-start',
                background: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: 8, padding: m ? '7px 10px' : '12px 14px',
                marginBottom: m ? 10 : 20, fontSize: m ? 12 : 13, color: '#92400e',
              }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
                <span>เมื่อเริ่มแล้ว <strong>จะไม่สามารถย้อนกลับ</strong>มาแก้ไขข้อมูลได้</span>
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  width: '100%', padding: m ? '11px' : '12px',
                  background: saving ? '#93c5fd' : '#2563eb',
                  color: '#fff', border: 'none', borderRadius: 10,
                  fontSize: m ? 14 : 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background .15s',
                }}
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
