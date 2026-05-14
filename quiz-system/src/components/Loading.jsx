export default function Loading({ text = 'กำลังโหลด...' }) {
  return (
    <div style={{
      minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', gap:16, background:'#f1f5f9',
      fontFamily:"'Anuphan','Sarabun',sans-serif",
    }}>
      <div className="spinner" />
      <p style={{ color:'#94a3b8', fontSize:14 }}>{text}</p>
    </div>
  );
}

export function InlineLoader({ text = '' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, padding:'48px 0' }}>
      <div className="spinner" style={{ width:28, height:28, borderWidth:3 }} />
      {text && <span style={{ color:'#94a3b8', fontSize:14 }}>{text}</span>}
    </div>
  );
}
