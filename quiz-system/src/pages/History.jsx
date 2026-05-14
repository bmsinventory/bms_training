import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { InlineLoader } from '../components/Loading';
import { useToast } from '../contexts/ToastContext';
import { searchAttempts } from '../lib/supabase';
import { fmtDateTime } from '../lib/utils';

const s = {
  page:   { fontFamily:"'Anuphan','Sarabun',sans-serif", minHeight:'100vh', background:'#f1f5f9' },
  wrap:   { maxWidth:640, margin:'0 auto', padding:'28px 16px 48px' },

  hero:   { textAlign:'center', marginBottom:28 },
  heroIcon:{ fontSize:44, marginBottom:10 },
  heroTitle:{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:4 },
  heroSub:{ fontSize:14, color:'#64748b' },

  searchCard:{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0',
               boxShadow:'0 1px 3px rgba(0,0,0,.07)', padding:'16px 18px', marginBottom:16 },
  searchRow:{ display:'flex', gap:10 },
  input:  { flex:1, padding:'10px 14px', border:'1px solid #e2e8f0', borderRadius:9,
            fontFamily:"'Anuphan','Sarabun',sans-serif", fontSize:14, color:'#0f172a',
            background:'#fff', outline:'none' },
  btnSearch:{ padding:'10px 20px', background:'#2563eb', color:'#fff', border:'none',
              borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer',
              display:'flex', alignItems:'center', gap:6 },
  btnSearchDis:{ padding:'10px 20px', background:'#93c5fd', color:'#fff', border:'none',
                  borderRadius:9, fontSize:14, fontWeight:600, cursor:'not-allowed',
                  display:'flex', alignItems:'center', gap:6 },

  countRow:{ fontSize:13, color:'#64748b', marginBottom:10 },

  card:   { background:'#fff', borderRadius:12, border:'1px solid #e2e8f0',
            boxShadow:'0 1px 3px rgba(0,0,0,.07)', padding:'16px 18px', marginBottom:10 },
  cardTop:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 },
  name:   { fontWeight:700, color:'#0f172a', fontSize:15 },
  email:  { fontSize:12, color:'#94a3b8', marginTop:1 },
  meta:   { fontSize:12, color:'#64748b', marginBottom:8 },
  score:  { fontSize:13, color:'#374151', marginBottom:12 },

  badgePass:{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:20,
              fontSize:11, fontWeight:600, background:'#ecfdf5', color:'#065f46' },
  badgeFail:{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:20,
              fontSize:11, fontWeight:600, background:'#fef2f2', color:'#991b1b' },
  badgeGray:{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:20,
              fontSize:11, fontWeight:600, background:'#f1f5f9', color:'#64748b' },

  actions:{ display:'flex', gap:8, flexWrap:'wrap' },
  btnGreen:{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 14px',
             background:'#ecfdf5', color:'#065f46', border:'1px solid #a7f3d0',
             borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', textDecoration:'none' },
  btnBlue: { display:'inline-flex', alignItems:'center', gap:5, padding:'6px 14px',
             background:'#eff6ff', color:'#1d4ed8', border:'1px solid #bfdbfe',
             borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', textDecoration:'none' },
  btnGhost:{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 14px',
             background:'transparent', color:'#64748b', border:'1px solid #e2e8f0',
             borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', textDecoration:'none' },

  empty:  { textAlign:'center', padding:'48px 0', color:'#94a3b8' },
  emptyIcon:{ fontSize:40, marginBottom:10 },
};

function AttemptCard({ attempt }) {
  const isPassed = attempt.status === 'PASS';
  const isFailed = attempt.status === 'FAIL';
  const certId   = attempt.certificates?.[0]?.cert_id;

  return (
    <div style={s.card}>
      <div style={s.cardTop}>
        <div>
          <div style={s.name}>{attempt.full_name}</div>
          <div style={s.email}>{attempt.email}</div>
        </div>
        <span style={isPassed ? s.badgePass : isFailed ? s.badgeFail : s.badgeGray}>
          {isPassed ? '✅ PASS' : isFailed ? '❌ FAIL' : '⏳ กำลังสอบ'}
        </span>
      </div>

      <div style={s.meta}>
        📚 {attempt.courses?.name || '-'} &nbsp;·&nbsp; 🕐 {fmtDateTime(attempt.completed_at || attempt.created_at)}
      </div>

      {attempt.status !== 'started' && (
        <div style={s.score}>
          คะแนน: <strong>{attempt.score}/{attempt.total}</strong>
          {' '}({Math.round(attempt.percent)}%)
        </div>
      )}

      <div style={s.actions}>
        {isPassed && (
          <Link to={`/certificate/${attempt.id}`} style={s.btnGreen}>🏆 ดูใบรับรอง</Link>
        )}
        <Link to="/resend" style={s.btnGhost}>📧 ส่งใหม่</Link>
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
    <div style={s.page}>
      <Navbar />

      <div style={s.wrap}>
        <div style={s.hero}>
          <div style={s.heroIcon}>🔍</div>
          <div style={s.heroTitle}>ค้นหาผลสอบ</div>
          <div style={s.heroSub}>ค้นหาด้วยชื่อ-นามสกุล หรืออีเมล</div>
        </div>

        <div style={s.searchCard}>
          <form onSubmit={handleSearch} style={s.searchRow}>
            <input
              style={s.input}
              placeholder="พิมพ์ชื่อหรืออีเมล..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            <button type="submit" disabled={!canSearch}
              style={canSearch ? s.btnSearch : s.btnSearchDis}>
              {loading ? '⏳' : '🔍 ค้นหา'}
            </button>
          </form>
        </div>

        {loading && <InlineLoader text="กำลังค้นหา..." />}

        {searched && !loading && results.length === 0 && (
          <div style={s.empty}>
            <div style={s.emptyIcon}>🤷</div>
            <p>ไม่พบข้อมูล กรุณาตรวจสอบชื่อหรืออีเมล</p>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div style={s.countRow}>พบ {results.length} รายการ</div>
            {results.map(att => (
              <AttemptCard key={att.id} attempt={att} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
