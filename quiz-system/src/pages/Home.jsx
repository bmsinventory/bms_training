import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { InlineLoader } from '../components/Loading';
import {
  getCourses, getSettings,
  getTrainingCategories, getCoursesWithCategory,
} from '../lib/supabase';

const CM = {
  blue:   { g1: '#1e3a8a', g2: '#2563eb', bg: '#e8f0fb', text: '#1a56a0' },
  teal:   { g1: '#0f766e', g2: '#0d9488', bg: '#d1fae5', text: '#065f46' },
  amber:  { g1: '#b45309', g2: '#d97706', bg: '#fef3c7', text: '#92400e' },
  red:    { g1: '#9f1239', g2: '#e11d48', bg: '#fee2e2', text: '#991b1b' },
  purple: { g1: '#4c1d95', g2: '#7c3aed', bg: '#ede9fe', text: '#5b21b6' },
  green:  { g1: '#14532d', g2: '#16a34a', bg: '#dcfce7', text: '#166534' },
};

const s = {
  page:     { fontFamily:"'Anuphan','Sarabun',sans-serif", minHeight:'100vh',
              background:'linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)' },
  inner:    { maxWidth:1024, margin:'0 auto', padding:'0 16px' },
  hero:     { textAlign:'center', paddingTop:40, paddingBottom:24 },
  heroTag:  { display:'inline-flex', alignItems:'center', gap:6, background:'#dbeafe',
              color:'#1e40af', padding:'6px 16px', borderRadius:20, fontSize:13,
              fontWeight:600, marginBottom:16 },
  heroTitle:{ fontSize:40, fontWeight:800, color:'#0f172a', marginBottom:10 },
  heroSub:  { fontSize:16, color:'#64748b', maxWidth:500, margin:'0 auto' },

  section:  { marginBottom:36 },
  secHd:    { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 },
  secTitle: { fontSize:18, fontWeight:700, color:'#1e293b', display:'flex', alignItems:'center', gap:8 },
  secLink:  { fontSize:13, color:'#2563eb', textDecoration:'none' },

  grid3:    { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:18 },

  catCard:  (hasQuiz) => ({
    background:'#fff', borderRadius:16, border: hasQuiz ? '1px solid #e2e8f0' : '1px solid #f1f5f9',
    overflow:'hidden', display:'flex', flexDirection:'column',
    boxShadow:'0 1px 4px rgba(0,0,0,.06)',
    cursor: hasQuiz ? 'pointer' : 'default',
    transition:'box-shadow .2s, border-color .2s',
  }),
  catBanner:{ height:112, display:'flex', alignItems:'center', justifyContent:'center',
              position:'relative', overflow:'hidden' },
  catBody:  { padding:'14px 16px', flex:1, display:'flex', flexDirection:'column', gap:10 },
  catName:  { fontWeight:700, color:'#0f172a', fontSize:15, lineHeight:1.4 },
  catDesc:  { fontSize:13, color:'#64748b', lineHeight:1.5,
              overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2,
              WebkitBoxOrient:'vertical' },

  chip:     (bg, color) => ({
    display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px',
    borderRadius:20, fontSize:11, fontWeight:600, background:bg, color,
  }),
  chips:    { display:'flex', flexWrap:'wrap', gap:5 },

  btnStart: { width:'100%', padding:'10px', background:'#2563eb', color:'#fff',
              border:'none', borderRadius:10, fontSize:14, fontWeight:700,
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 },
  btnNA:    { width:'100%', padding:'10px', background:'transparent', color:'#cbd5e1',
              border:'2px dashed #e2e8f0', borderRadius:10, fontSize:14, cursor:'not-allowed' },

  quizCard: { background:'#fff', borderRadius:16, border:'1px solid #e2e8f0',
              boxShadow:'0 1px 4px rgba(0,0,0,.06)', overflow:'hidden',
              display:'flex', flexDirection:'column', cursor:'pointer', padding:'16px' },
  quizIcon: { height:112, background:'linear-gradient(135deg,#2563eb,#4f46e5)',
              borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:40, marginBottom:12 },

  footer:   { borderTop:'1px solid #e2e8f0', background:'#fff', marginTop:8 },
  ftrInner: { maxWidth:1024, margin:'0 auto', padding:'28px 16px',
              display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 },
  ftrBtn:   { display:'flex', flexDirection:'column', alignItems:'center', gap:4,
              padding:'16px', borderRadius:12, cursor:'pointer', border:'none',
              background:'transparent', fontFamily:"'Anuphan','Sarabun',sans-serif' ",
              transition:'background .15s' },
  ftrIcon:  { fontSize:28, marginBottom:2 },
  ftrLbl:   { fontSize:14, fontWeight:600, color:'#1e293b' },
  ftrDesc:  { fontSize:11, color:'#94a3b8' },

  empty:    { textAlign:'center', padding:'64px 0', color:'#94a3b8' },
};

function CategoryCard({ cat, quiz, onStart, onNoQuiz }) {
  const cm = CM[cat.color] || CM.blue;
  const hasQuiz = !!quiz;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ ...s.catCard(hasQuiz), boxShadow: hovered && hasQuiz ? '0 4px 16px rgba(0,0,0,.1)' : '0 1px 4px rgba(0,0,0,.06)',
               borderColor: hovered && hasQuiz ? '#bfdbfe' : hasQuiz ? '#e2e8f0' : '#f1f5f9' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => hasQuiz ? onStart() : null}
    >
      {/* Banner */}
      <div style={{
        ...s.catBanner,
        ...(cat.banner_url
          ? { backgroundImage:`url(${cat.banner_url})`, backgroundSize:'cover', backgroundPosition:'center' }
          : { background:`linear-gradient(135deg, ${cm.g1}, ${cm.g2})` }),
      }}>
        {!cat.banner_url && (
          <i className={`ti ti-${cat.icon || 'book'}`}
            style={{ fontSize:72, color:'rgba(255,255,255,.15)', position:'absolute' }} />
        )}
        <div style={{ position:'absolute', top:8, right:8 }}>
          {hasQuiz
            ? <span style={s.chip('#ecfdf5', '#065f46')}>✅ มีแบบทดสอบ</span>
            : <span style={s.chip('#f1f5f9', '#64748b')}>⏳ ยังไม่มีแบบทดสอบ</span>
          }
        </div>
      </div>

      {/* Content */}
      <div style={s.catBody}>
        <div>
          <div style={s.catName}>{cat.name}</div>
          {cat.description && <div style={{ ...s.catDesc, marginTop:4 }}>{cat.description}</div>}
        </div>

        {hasQuiz && (
          <div style={s.chips}>
            <span style={s.chip('#eff6ff', '#1d4ed8')}>📝 {quiz.questions_count} ข้อ</span>
            <span style={s.chip('#fffbeb', '#92400e')}>🎯 ผ่าน {quiz.pass_percent}%</span>
            {quiz.time_limit_min > 0 && (
              <span style={s.chip('#f1f5f9', '#475569')}>⏱ {quiz.time_limit_min} นาที</span>
            )}
          </div>
        )}

        <div style={{ marginTop:'auto' }}>
          {hasQuiz
            ? <button onClick={e => { e.stopPropagation(); onStart(); }} style={s.btnStart}>📝 เริ่มทำแบบทดสอบ →</button>
            : <button disabled style={s.btnNA}>ยังไม่มีแบบทดสอบ</button>
          }
        </div>
      </div>
    </div>
  );
}

function QuizCard({ course, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ ...s.quizCard, boxShadow: hovered ? '0 4px 16px rgba(0,0,0,.1)' : '0 1px 4px rgba(0,0,0,.06)',
               borderColor: hovered ? '#bfdbfe' : '#e2e8f0' }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={s.quizIcon}>📋</div>
      <div style={{ fontWeight:700, color:'#0f172a', fontSize:15, marginBottom:6 }}>{course.name}</div>
      {course.description && (
        <div style={{ fontSize:13, color:'#64748b', marginBottom:10, lineHeight:1.5,
                      overflow:'hidden', display:'-webkit-box',
                      WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
          {course.description}
        </div>
      )}
      <div style={{ ...s.chips, marginBottom:12 }}>
        <span style={s.chip('#eff6ff', '#1d4ed8')}>📝 {course.questions_count} ข้อ</span>
        <span style={s.chip('#fffbeb', '#92400e')}>🎯 ผ่าน {course.pass_percent}%</span>
      </div>
      <button style={s.btnStart}>เริ่มทำแบบทดสอบ →</button>
    </div>
  );
}

export default function Home() {
  const [settings, setSettings]     = useState({});
  const [categories, setCategories] = useState([]);
  const [courseMap, setCourseMap]   = useState({});
  const [standaloneQuiz, setStandalone] = useState([]);
  const [loading, setLoading]       = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [stg, cats, quizCourses] = await Promise.all([
          getSettings(), getTrainingCategories(), getCoursesWithCategory(),
        ]);
        setSettings(stg);
        const map = {};
        const standalone = [];
        for (const c of quizCourses) {
          if (c.category_ids?.length) {
            c.category_ids.forEach(catId => { map[catId] = c; });
          } else {
            standalone.push(c);
          }
        }
        setCategories(cats);
        setCourseMap(map);
        setStandalone(standalone);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const trainingUrl = settings.training_base_url || '#';

  return (
    <div style={s.page}>
      <Navbar siteName={settings.site_name} />

      {/* Hero */}
      <div style={s.inner}>
        <div style={s.hero}>
          <div style={s.heroTag}>📝 ระบบแบบทดสอบออนไลน์</div>
          <h1 style={s.heroTitle}>{settings.site_name || 'BMS Training'}</h1>
          <p style={s.heroSub}>เลือกหลักสูตรอบรมที่ต้องการทำแบบทดสอบ รับใบรับรองทันทีเมื่อผ่านเกณฑ์</p>
        </div>

        <div style={{ paddingBottom:48 }}>
          {loading ? (
            <InlineLoader text="กำลังโหลดหลักสูตร..." />
          ) : (
            <>
              {/* Training categories — grouped by location (สาขา) */}
              {categories.length > 0 && (() => {
                // build location groups
                const locGroups = {};
                const locOrder  = [];
                categories.forEach(cat => {
                  const key = cat.location?.code || '__none__';
                  if (!locGroups[key]) {
                    locGroups[key] = { loc: cat.location, cats: [] };
                    locOrder.push(key);
                  }
                  locGroups[key].cats.push(cat);
                });
                const multiLoc = locOrder.length > 1;
                return locOrder.map(key => {
                  const { loc, cats } = locGroups[key];
                  return (
                    <div key={key} style={s.section}>
                      <div style={s.secHd}>
                        <div style={s.secTitle}>
                          <span style={{ fontSize:22 }}>🏫</span>
                          {multiLoc && loc
                            ? <>{loc.name}<span style={{ fontSize:13, fontWeight:500, color:'#64748b', marginLeft:6 }}>({loc.code})</span></>
                            : 'หลักสูตรอบรม'
                          }
                        </div>
                        {trainingUrl !== '#' && key === locOrder[0] && (
                          <a href={trainingUrl} style={s.secLink}>← กลับระบบลงทะเบียน</a>
                        )}
                      </div>
                      <div style={s.grid3}>
                        {cats.map(cat => {
                          const quiz = courseMap[cat.id];
                          return (
                            <CategoryCard
                              key={cat.id} cat={cat} quiz={quiz}
                              onStart={() => quiz && navigate(`/register/${quiz.id}`)}
                              onNoQuiz={() => navigate(`/category/${cat.id}`)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Standalone quiz courses */}
              {standaloneQuiz.length > 0 && (
                <div style={s.section}>
                  <div style={s.secHd}>
                    <div style={s.secTitle}><span style={{ fontSize:22 }}>📋</span> แบบทดสอบอื่นๆ</div>
                  </div>
                  <div style={s.grid3}>
                    {standaloneQuiz.map(c => (
                      <QuizCard key={c.id} course={c} onClick={() => navigate(`/register/${c.id}`)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty */}
              {categories.length === 0 && standaloneQuiz.length === 0 && (
                <div style={s.empty}>
                  <div style={{ fontSize:56, marginBottom:12 }}>📚</div>
                  <div style={{ fontSize:16 }}>ยังไม่มีแบบทดสอบ</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Quick links footer */}
      <div style={s.footer}>
        <div style={s.ftrInner}>
          {[
            { icon:'🔍', label:'ค้นหาผลสอบ',       desc:'ค้นหาจากชื่อหรืออีเมล', to:'/history' },
            { icon:'📄', label:'ขอส่งใบรับรองใหม่', desc:'แก้ไขอีเมลและส่งซ้ำ',   to:'/resend'  },
            { icon:'🛡️', label:'ตรวจสอบใบรับรอง',  desc:'ตรวจสอบ Cert ID / QR',   to:'/verify'  },
          ].map(item => (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              style={s.ftrBtn}
              onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={s.ftrIcon}>{item.icon}</span>
              <span style={s.ftrLbl}>{item.label}</span>
              <span style={s.ftrDesc}>{item.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
