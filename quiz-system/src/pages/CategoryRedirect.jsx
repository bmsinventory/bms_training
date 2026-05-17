import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import { getCourseByCategory, getSettings, getCategory } from '../lib/supabase';

export default function CategoryRedirect() {
  const { catId }   = useParams();
  const navigate    = useNavigate();
  const [settings, setSettings] = useState({});
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function resolve() {
      try {
        const [course, cat, stg] = await Promise.all([
          getCourseByCategory(catId),
          getCategory(catId),
          getSettings(),
        ]);
        setSettings(stg);
        if (course) {
          navigate(`/register/${course.id}`, {
            replace: true,
            state: { locationId: cat?.location?.id ?? null, locationName: cat?.location?.name ?? null },
          });
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error(err);
        setNotFound(true);
      }
    }
    resolve();
  }, [catId]);

  if (!notFound) return <Loading text="กำลังโหลดแบบทดสอบ..." />;

  const trainingUrl = settings.training_base_url || '/';

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar siteName={settings.site_name} />
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-3.5">📋</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          ยังไม่มีแบบทดสอบสำหรับหลักสูตรนี้
        </h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          หลักสูตร ID: <span className="font-mono font-semibold text-blue-600">{catId}</span>
          <br />ยังไม่ได้เชื่อมกับแบบทดสอบ กรุณาติดต่อผู้ดูแลระบบ
        </p>

        <div className="flex gap-3 justify-center mb-6">
          <Link to="/" className="btn btn-primary">📝 ดูแบบทดสอบทั้งหมด</Link>
          <a href={trainingUrl} className="btn btn-secondary">← กลับระบบลงทะเบียน</a>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3.5 text-left text-sm text-blue-800">
          <div className="font-bold mb-1.5">👤 สำหรับ Admin</div>
          <p className="m-0 leading-relaxed">
            ไปที่ BMS Training Admin → แบบทดสอบ → จัดการหลักสูตร
            แล้วเลือก "ประเภทอบรม" ให้ตรงกับ Category ID&nbsp;
            <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono">{catId}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
