import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { InlineLoader } from '../components/Loading';
import { getSettings, getTrainingCategories, getCoursesWithCategory } from '../lib/supabase';

const COLORS = {
  blue:   { g1: '#1e3a8a', g2: '#2563eb' },
  teal:   { g1: '#0f766e', g2: '#0d9488' },
  amber:  { g1: '#b45309', g2: '#d97706' },
  red:    { g1: '#9f1239', g2: '#e11d48' },
  purple: { g1: '#4c1d95', g2: '#7c3aed' },
  green:  { g1: '#14532d', g2: '#16a34a' },
};

function CategoryCard({ cat, quiz, onStart }) {
  const cm = COLORS[cat.color] || COLORS.blue;
  const hasQuiz = !!quiz;
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col transition-all duration-200 ${
        hasQuiz ? 'cursor-pointer hover:shadow-md hover:border-blue-200' : 'opacity-75'
      }`}
      onClick={() => hasQuiz && onStart()}
    >
      {/* Banner */}
      <div
        className="h-28 flex items-center justify-center relative overflow-hidden"
        style={cat.banner_url
          ? { backgroundImage: `url(${cat.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: `linear-gradient(135deg,${cm.g1},${cm.g2})` }
        }
      >
        <div className="absolute top-2 right-2">
          <span className={hasQuiz ? 'badge badge-pass' : 'badge badge-gray'}>
            {hasQuiz ? '✅ มีแบบทดสอบ' : '⏳ ยังไม่มีแบบทดสอบ'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col gap-2.5">
        <div>
          <div className="font-bold text-gray-900 text-sm leading-snug">{cat.name}</div>
          {cat.description && (
            <div className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{cat.description}</div>
          )}
        </div>

        {hasQuiz && (
          <div className="flex flex-wrap gap-1.5">
            <span className="badge badge-info">📝 {quiz.questions_count} ข้อ</span>
            <span className="badge badge-amber">🎯 ผ่าน {quiz.pass_percent}%</span>
            {quiz.time_limit_min > 0 && <span className="badge badge-gray">⏱ {quiz.time_limit_min} นาที</span>}
          </div>
        )}

        <div className="mt-auto pt-1">
          {hasQuiz ? (
            <button
              onClick={e => { e.stopPropagation(); onStart(); }}
              className="btn btn-primary w-full justify-center text-sm py-2.5"
            >
              📝 เริ่มทำแบบทดสอบ →
            </button>
          ) : (
            <button disabled className="w-full py-2 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm cursor-not-allowed bg-transparent">
              ยังไม่มีแบบทดสอบ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuizCard({ course, onClick }) {
  return (
    <div className="card-hover flex flex-col" onClick={onClick}>
      <div className="h-28 rounded-xl flex items-center justify-center text-4xl mb-3 bg-gradient-to-br from-blue-600 to-indigo-600">
        📋
      </div>
      <div className="font-bold text-gray-900 text-sm mb-1.5">{course.name}</div>
      {course.description && (
        <div className="text-xs text-gray-500 mb-2.5 leading-relaxed line-clamp-2">{course.description}</div>
      )}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="badge badge-info">📝 {course.questions_count} ข้อ</span>
        <span className="badge badge-amber">🎯 ผ่าน {course.pass_percent}%</span>
      </div>
      <button className="btn btn-primary w-full justify-center text-sm mt-auto">เริ่มทำแบบทดสอบ →</button>
    </div>
  );
}

export default function Home() {
  const [settings, setSettings]     = useState({});
  const [categories, setCategories] = useState([]);
  const [courseMap, setCourseMap]   = useState({});
  const [standalone, setStandalone] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [locGroups, setLocGroups]   = useState({});
  const [locOrder, setLocOrder]     = useState([]);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSite = searchParams.get('site') || '';

  useEffect(() => {
    async function load() {
      try {
        const [stg, cats, quizCourses] = await Promise.all([
          getSettings(), getTrainingCategories(), getCoursesWithCategory(),
        ]);
        setSettings(stg);

        const map = {}, solo = [];
        for (const c of quizCourses) {
          if (c.category_ids?.length) {
            c.category_ids.forEach(id => { map[id] = c; });
          } else {
            solo.push(c);
          }
        }

        const groups = {}, order = [];
        cats.forEach(cat => {
          const key = cat.location?.code || '__none__';
          if (!groups[key]) { groups[key] = { loc: cat.location, cats: [] }; order.push(key); }
          groups[key].cats.push(cat);
        });

        setCategories(cats);
        setCourseMap(map);
        setStandalone(solo);
        setLocGroups(groups);
        setLocOrder(order);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const trainingUrl = settings.training_base_url || '#';
  const multiLoc    = locOrder.length > 1;

  const visibleKeys = activeSite
    ? locOrder.filter(k => locGroups[k]?.loc?.code === activeSite)
    : locOrder;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <Navbar siteName={settings.site_name} />

      <div className="max-w-4xl mx-auto px-4">
        {/* Hero */}
        <div className="text-center pt-10 pb-6">
          <div className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            📝 ระบบแบบทดสอบออนไลน์
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2.5">{settings.site_name || 'BMS Training'}</h1>
          <p className="text-gray-500 text-base max-w-md mx-auto">
            เลือกหลักสูตรอบรมที่ต้องการทำแบบทดสอบ รับใบรับรองทันทีเมื่อผ่านเกณฑ์
          </p>
        </div>

        <div className="pb-12">
          {loading ? (
            <InlineLoader text="กำลังโหลดหลักสูตร..." />
          ) : (
            <>
              {/* Location filter tabs */}
              {multiLoc && (
                <div className="flex gap-2 flex-wrap mb-5">
                  <button
                    onClick={() => setSearchParams({})}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                      !activeSite ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    🌐 ทั้งหมด
                  </button>
                  {locOrder.map(key => {
                    const { loc } = locGroups[key];
                    if (!loc) return null;
                    const isActive = activeSite === loc.code;
                    return (
                      <button
                        key={key}
                        onClick={() => setSearchParams({ site: loc.code })}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                          isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        🏫 {loc.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Category sections */}
              {visibleKeys.map((key, idx) => {
                const { loc, cats } = locGroups[key];
                return (
                  <div key={key} className="mb-9">
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <span className="text-2xl">🏫</span>
                        {multiLoc && loc
                          ? <>{loc.name}<span className="text-sm font-medium text-gray-400 ml-1.5">({loc.code})</span></>
                          : 'หลักสูตรอบรม'
                        }
                      </div>
                      {trainingUrl !== '#' && idx === 0 && (
                        <a href={trainingUrl} className="text-sm text-blue-600 no-underline hover:underline">
                          ← กลับระบบลงทะเบียน
                        </a>
                      )}
                    </div>
                    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
                      {cats.map(cat => (
                        <CategoryCard
                          key={cat.id}
                          cat={cat}
                          quiz={courseMap[cat.id]}
                          onStart={() => courseMap[cat.id] && navigate(`/register/${courseMap[cat.id].id}`, { state: { locationId: cat.location?.id ?? null, locationName: cat.location?.name ?? null } })}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Standalone quizzes */}
              {standalone.length > 0 && (
                <div className="mb-9">
                  <div className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3.5">
                    <span className="text-2xl">📋</span> แบบทดสอบอื่นๆ
                  </div>
                  <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
                    {standalone.map(c => (
                      <QuizCard key={c.id} course={c} onClick={() => navigate(`/register/${c.id}`)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {categories.length === 0 && standalone.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-5xl mb-3">📚</div>
                  <div className="text-base">ยังไม่มีแบบทดสอบ</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
