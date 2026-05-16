import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { InlineLoader } from '../components/Loading';
import { useToast } from '../contexts/ToastContext';
import { searchAttempts } from '../lib/supabase';
import { fmtDateTime } from '../lib/utils';

function AttemptCard({ attempt }) {
  const isPassed = attempt.status === 'PASS';
  const isFailed = attempt.status === 'FAIL';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-2.5">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-bold text-slate-900">{attempt.full_name}</div>
          <div className="text-xs text-slate-400 mt-0.5">{attempt.email}</div>
        </div>
        <span className={isPassed ? 'badge badge-pass' : isFailed ? 'badge badge-fail' : 'badge badge-gray'}>
          {isPassed ? '✅ PASS' : isFailed ? '❌ FAIL' : '⏳ กำลังสอบ'}
        </span>
      </div>

      <div className="text-xs text-slate-500 mb-2">
        📚 {attempt.courses?.name || '-'} &nbsp;·&nbsp; 🕐 {fmtDateTime(attempt.completed_at || attempt.created_at)}
      </div>

      {attempt.status !== 'started' && (
        <div className="text-sm text-slate-700 mb-3">
          คะแนน: <strong>{attempt.score}/{attempt.total}</strong>
          {' '}({Math.round(attempt.percent)}%)
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {isPassed && (
          <Link to={`/certificate/${attempt.id}`} className="btn btn-sm btn-success">
            🏆 ดูใบรับรอง
          </Link>
        )}
        <Link to="/resend" className="btn btn-sm btn-ghost">📧 ส่งใหม่</Link>
      </div>
    </div>
  );
}

export default function History() {
  const toast = useToast();
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(false);
    try {
      const data = await searchAttempts(query);
      setResults(data);
    } catch {
      toast.error('ค้นหาไม่สำเร็จ');
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  const canSearch = !loading && query.trim();

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />

      <div className="max-w-xl mx-auto px-4 py-7 pb-12">
        {/* Hero */}
        <div className="text-center mb-7">
          <div className="text-5xl mb-2.5">🔍</div>
          <div className="text-2xl font-extrabold text-slate-900 mb-1">ค้นหาผลสอบ</div>
          <div className="text-sm text-slate-500">ค้นหาด้วยชื่อ-นามสกุล หรืออีเมล</div>
        </div>

        {/* Search box */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 mb-4">
          <form onSubmit={handleSearch} className="flex gap-2.5">
            <input
              className="form-input flex-1"
              placeholder="พิมพ์ชื่อหรืออีเมล..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            <button type="submit" disabled={!canSearch}
              className="btn btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? '⏳' : '🔍 ค้นหา'}
            </button>
          </form>
        </div>

        {loading && <InlineLoader text="กำลังค้นหา..." />}

        {searched && !loading && results.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <div className="text-4xl mb-2.5">🤷</div>
            <p>ไม่พบข้อมูล กรุณาตรวจสอบชื่อหรืออีเมล</p>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="text-sm text-slate-500 mb-2.5">พบ {results.length} รายการ</div>
            {results.map(att => (
              <AttemptCard key={att.id} attempt={att} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
