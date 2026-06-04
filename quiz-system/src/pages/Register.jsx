import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation as useRouteLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { InlineLoader } from '../components/Loading';
import { useToast } from '../contexts/ToastContext';
import { getCourse } from '../services/courses.service';
import { createAttempt, getAllAttempts } from '../services/attempts.service';
import { getSettings } from '../services/settings.service';
import { isValidEmail } from '../utils/validation.util';

export default function Register() {
  const { courseId } = useParams();
  const navigate     = useNavigate();
  const toast        = useToast();
  const { state: routeState } = useRouteLocation();

  const [course, setCourse]     = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [errors, setErrors]     = useState({});
  const [form, setForm]         = useState({ fullName: '', email: '' });

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
        const mine = prev.filter(a => a.email.toLowerCase() === form.email.toLowerCase() && a.status !== 'started');
        if (mine.length >= course.max_attempts) {
          toast.error(`อีเมลนี้สอบหลักสูตรนี้ครบ ${course.max_attempts} ครั้งแล้ว`);
          setSaving(false);
          return;
        }
      }
      console.log('[Register] routeState:', routeState);
      const attempt = await createAttempt({
        course_id:   courseId,
        full_name:   form.fullName.trim(),
        email:       form.email.trim().toLowerCase(),
        status:      'started',
        ...(routeState?.locationId ? { location_id: routeState.locationId } : {}),
      });
      console.log('[Register] attempt created:', attempt);
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
    <div className="min-h-screen bg-gray-100">
      <Navbar siteName={settings.site_name} />

      <div className="max-w-md mx-auto px-4 py-7 sm:py-10">

        {/* Course info banner */}
        {course && (
          <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-blue-600 p-4 mb-4 shadow-sm">
            <div className="text-xs font-bold text-blue-600 tracking-wide uppercase mb-1">แบบทดสอบ</div>
            <div className="text-base sm:text-lg font-bold text-gray-900 leading-snug mb-2">{course.name}</div>
            <div className="flex gap-1.5 flex-wrap">
              <span className="badge badge-info">📝 {course.questions_count} ข้อ</span>
              <span className="badge badge-amber">🎯 ผ่าน {course.pass_percent}%</span>
              {course.time_limit_min > 0 && (
                <span className="badge badge-pass">⏱ {course.time_limit_min} นาที</span>
              )}
              {course.max_attempts > 0 && (
                <span className="badge badge-purple">🔄 {course.max_attempts} ครั้ง</span>
              )}
            </div>
          </div>
        )}

        {/* Form card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 sm:px-6 sm:py-5" style={{ background: 'linear-gradient(135deg,#1a3a6b,#1a56a0)' }}>
            <div className="text-white font-bold text-sm sm:text-base mb-0.5">ลงทะเบียนทำแบบทดสอบ</div>
            <div className="text-white/70 text-xs sm:text-sm">กรอกชื่อและอีเมลเพื่อรับใบรับรองเมื่อผ่าน</div>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} noValidate>

              {/* ชื่อ-นามสกุล */}
              <div className="form-group mb-3 sm:mb-5">
                <label className="form-label">
                  ชื่อ-นามสกุล <span className="text-red-500">*</span>
                </label>
                <input
                  className={errors.fullName ? 'form-input-error' : 'form-input'}
                  placeholder="เช่น สมชาย ใจดี"
                  value={form.fullName}
                  onChange={e => set('fullName', e.target.value)}
                  autoComplete="name"
                  autoFocus
                />
                {errors.fullName && <div className="form-error">⚠ {errors.fullName}</div>}
              </div>

              {/* อีเมล */}
              <div className="form-group mb-3 sm:mb-5">
                <label className="form-label">
                  อีเมล <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className={errors.email ? 'form-input-error' : 'form-input'}
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  autoComplete="email"
                />
                {errors.email
                  ? <div className="form-error">⚠ {errors.email}</div>
                  : <div className="text-xs text-gray-400 mt-1">📧 ใบรับรองจะส่งไปยังอีเมลนี้เมื่อผ่าน</div>
                }
              </div>

              {/* Notice */}
              <div className="flex gap-2 items-start bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs sm:text-sm text-amber-800">
                <span className="text-sm shrink-0">⚠️</span>
                <span>เมื่อเริ่มแล้ว <strong>จะไม่สามารถย้อนกลับ</strong>มาแก้ไขข้อมูลได้</span>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary w-full justify-center py-3 disabled:opacity-70 disabled:cursor-not-allowed"
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
