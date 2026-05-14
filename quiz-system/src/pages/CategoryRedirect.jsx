import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import { getCourseByCategory, getSettings } from '../lib/supabase';

export default function CategoryRedirect() {
  const { catId }   = useParams();
  const navigate    = useNavigate();
  const [settings, setSettings] = useState({});
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function resolve() {
      try {
        const [course, stg] = await Promise.all([
          getCourseByCategory(catId),
          getSettings(),
        ]);
        setSettings(stg);
        if (course) {
          navigate(`/register/${course.id}`, { replace: true });
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
    <div style={{ fontFamily:"'Anuphan','Sarabun',sans-serif", minHeight:'100vh', background:'#f1f5f9' }}>
      <Navbar siteName={settings.site_name} />
      <div style={{ maxWidth:540, margin:'0 auto', padding:'64px 16px', textAlign:'center' }}>
        <div style={{ fontSize:56, marginBottom:14 }}>📋</div>
        <h2 style={{ fontSize:22, fontWeight:700, color:'#1e293b', marginBottom:8 }}>
          ยังไม่มีแบบทดสอบสำหรับหลักสูตรนี้
        </h2>
        <p style={{ color:'#64748b', fontSize:14, lineHeight:1.7, marginBottom:24 }}>
          หลักสูตร ID: <span style={{ fontFamily:'monospace', fontWeight:600, color:'#2563eb' }}>{catId}</span>
          <br />ยังไม่ได้เชื่อมกับแบบทดสอบ กรุณาติดต่อผู้ดูแลระบบ
        </p>

        <div style={{ display:'flex', gap:12, justifyContent:'center', marginBottom:24 }}>
          <Link to="/" style={{
            padding:'10px 22px', background:'#2563eb', color:'#fff',
            border:'none', borderRadius:10, fontSize:14, fontWeight:600,
            textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6,
          }}>
            📝 ดูแบบทดสอบทั้งหมด
          </Link>
          <a href={trainingUrl} style={{
            padding:'10px 22px', background:'#fff', color:'#374151',
            border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14, fontWeight:600,
            textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6,
          }}>
            ← กลับระบบลงทะเบียน
          </a>
        </div>

        <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:12,
                      padding:'14px 18px', textAlign:'left', fontSize:13, color:'#1e40af' }}>
          <div style={{ fontWeight:700, marginBottom:6 }}>👤 สำหรับ Admin</div>
          <p style={{ margin:0, lineHeight:1.7 }}>
            ไปที่ BMS Training Admin → แบบทดสอบ → จัดการหลักสูตร
            แล้วเลือก "ประเภทอบรม" ให้ตรงกับ Category ID&nbsp;
            <code style={{ background:'#dbeafe', padding:'1px 6px', borderRadius:4, fontFamily:'monospace' }}>
              {catId}
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
