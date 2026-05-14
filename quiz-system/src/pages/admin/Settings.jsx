import { useState, useEffect, useRef } from 'react';
import { InlineLoader } from '../../components/Loading';
import { useToast } from '../../contexts/ToastContext';
import { getSettings, saveSetting } from '../../lib/supabase';
import CertPreviewCard from '../../components/CertPreviewCard';

const FIELDS_GENERAL = [
  { key: 'site_name',       label: 'ชื่อระบบ',            placeholder: 'BMS Training' },
  { key: 'org_name',        label: 'ชื่อองค์กร',          placeholder: 'บริษัท BMS จำกัด' },
  { key: 'cert_title',      label: 'หัวข้อใบรับรอง',      placeholder: 'ใบรับรองการผ่านการทดสอบ' },
  { key: 'cert_prefix',     label: 'Prefix Cert ID',       placeholder: 'BMS' },
  { key: 'verify_base_url', label: 'URL ตรวจสอบใบรับรอง', placeholder: 'https://your-domain.com/quiz/#/verify' },
];

const FIELDS_EMAIL = [
  { key: 'emailjs_service_id',  label: 'EmailJS Service ID',  placeholder: 'service_xxxxxxx' },
  { key: 'emailjs_template_id', label: 'EmailJS Template ID', placeholder: 'template_xxxxxxx' },
  { key: 'emailjs_public_key',  label: 'EmailJS Public Key',  placeholder: 'xxxxxxxxxxxxxxxxxxxx', type: 'password' },
];

const TEMPLATES = [
  {
    id: 'classic', label: 'Classic Blue', desc: 'ไล่สีฟ้า กรอบสองชั้น', defaultColor: '#1e3a8a',
    mini: (c) => (
      <div style={{ height: 60, background: 'linear-gradient(135deg,#f0f9ff,#fff)', border: `2px solid ${c}`, boxShadow: `inset 0 0 0 3px ${c}20`, borderRadius: 4, padding: '7px 9px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <div style={{ width: 9, height: 9, background: c, borderRadius: 2 }}></div>
          <div style={{ flex: 1, height: 2, background: c, opacity: 0.5, borderRadius: 1 }}></div>
        </div>
        {[80, 60, 70].map((w, i) => <div key={i} style={{ height: 2, background: i === 0 ? c+'40' : '#e5e7eb', width: `${w}%`, borderRadius: 1, margin: '3px 0' }}></div>)}
      </div>
    ),
  },
  {
    id: 'modern', label: 'Modern', desc: 'แถบสีด้านบน เรียบสะอาด', defaultColor: '#0369a1',
    mini: (c) => (
      <div style={{ height: 60, background: '#fff', border: `2px solid ${c}`, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: 14, background: c, marginBottom: 5 }}></div>
        <div style={{ padding: '0 9px' }}>
          {[70, 90, 50].map((w, i) => <div key={i} style={{ height: 2, background: i === 0 ? '#374151' : '#e5e7eb', width: `${w}%`, borderRadius: 1, margin: '3px 0' }}></div>)}
        </div>
      </div>
    ),
  },
  {
    id: 'elegant', label: 'Elegant Gold', desc: 'พื้นครีม ขอบทองคลาสสิก', defaultColor: '#b45309',
    mini: (c) => (
      <div style={{ height: 60, background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: `2px solid ${c}`, boxShadow: `inset 0 0 0 3px ${c}30`, borderRadius: 4, padding: '8px 10px', position: 'relative' }}>
        {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h],i) => (
          <div key={i} style={{ position: 'absolute', [v]: 4, [h]: 4, width: 7, height: 7, [`border${v.charAt(0).toUpperCase()+v.slice(1)}`]: `1.5px solid ${c}`, [`border${h.charAt(0).toUpperCase()+h.slice(1)}`]: `1.5px solid ${c}` }}></div>
        ))}
        <div style={{ textAlign: 'center' }}>
          <div style={{ height: 2, background: c, width: '40%', borderRadius: 1, margin: '0 auto 4px' }}></div>
          {[70, 50].map((w, i) => <div key={i} style={{ height: 2, background: '#c4a57a', width: `${w}%`, borderRadius: 1, margin: '3px auto' }}></div>)}
        </div>
      </div>
    ),
  },
  {
    id: 'minimal', label: 'Minimal', desc: 'เรียบ ทันสมัย แถบซ้าย', defaultColor: '#1f2937',
    mini: (c) => (
      <div style={{ height: 60, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: 5, background: c, flexShrink: 0 }}></div>
        <div style={{ padding: '8px 9px', flex: 1 }}>
          <div style={{ height: 3, background: c, width: '45%', borderRadius: 1, marginBottom: 5 }}></div>
          {[80, 60, 70].map((w, i) => <div key={i} style={{ height: 2, background: '#e5e7eb', width: `${w}%`, borderRadius: 1, margin: '3px 0' }}></div>)}
        </div>
      </div>
    ),
  },
];

const PREVIEW_CERT = {
  full_name: 'นายตัวอย่าง ใบรับรอง', course_name: 'หลักสูตรฝึกอบรมตัวอย่าง',
  score: 85, total: 100, percent: 85, issued_at: new Date().toISOString(), cert_id: 'BMS-2024-001234',
};

const IMG_FIELDS = [
  { key: 'name',    label: 'ชื่อ-นามสกุล',  sample: 'นายตัวอย่าง ใบรับรอง',   color: '#2563eb' },
  { key: 'course',  label: 'หลักสูตร',        sample: 'หลักสูตรฝึกอบรมตัวอย่าง', color: '#7c3aed' },
  { key: 'score',   label: 'คะแนน',           sample: '85/100',                  color: '#059669' },
  { key: 'percent', label: 'เปอร์เซ็นต์',    sample: '85%',                     color: '#059669' },
  { key: 'date',    label: 'วันที่',           sample: '14 พฤษภาคม 2568',         color: '#d97706' },
  { key: 'certid',  label: 'Cert ID',          sample: 'BMS-2024-001234',          color: '#6b7280' },
  { key: 'qr',      label: 'QR Code',          sample: '▦ QR',                   color: '#111827' },
  { key: 'org',     label: 'ชื่อองค์กร',     sample: 'บริษัท BMS จำกัด',        color: '#374151' },
  { key: 'sig',     label: 'ลายมือชื่อ',     sample: '——— ผู้อำนวยการ ———',   color: '#374151' },
];

const DEFAULT_POS = {
  name:    { x: 50, y: 43 }, course:  { x: 50, y: 55 },
  score:   { x: 33, y: 67 }, percent: { x: 50, y: 67 },
  date:    { x: 67, y: 67 }, certid:  { x: 12, y: 92 },
  qr:      { x: 88, y: 88 }, org:     { x: 12, y: 87 },
  sig:     { x: 50, y: 87 },
};

const DEFAULT_STYLE = {
  name:    { size: 38, color: '#111827', bold: true },
  course:  { size: 20, color: '#2563eb', bold: true },
  score:   { size: 28, color: '#059669', bold: true },
  percent: { size: 28, color: '#059669', bold: true },
  date:    { size: 13, color: '#374151', bold: false },
  certid:  { size: 11, color: '#6b7280', bold: false },
  qr:      { size: 72, color: '#1e3a8a' },
  org:     { size: 13, color: '#374151', bold: false },
  sig:     { size: 13, color: '#374151', bold: false },
};

/* ── shared inline style tokens ── */
const t = {
  input: { width:'100%', padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:8,
           fontFamily:"'Anuphan','Sarabun',sans-serif", fontSize:13, color:'#0f172a',
           background:'#fff', boxSizing:'border-box', outline:'none' },
  label: { display:'block', fontSize:13, fontWeight:600, color:'#334155', marginBottom:5 },
  fGroup: { marginBottom:14 },
  btnPrimary: { background:'#2563eb', color:'#fff', border:'none', borderRadius:8,
                padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer' },
  btnGhost:   { background:'transparent', color:'#64748b', border:'1px solid #e2e8f0',
                borderRadius:7, padding:'5px 12px', fontSize:12, cursor:'pointer' },
  btnDanger:  { background:'transparent', color:'#dc2626', border:'1px solid #fecaca',
                borderRadius:7, padding:'5px 12px', fontSize:12, cursor:'pointer' },
  btnSm:      { padding:'4px 10px', fontSize:12 },
};

/* ── Draggable field builder for image mode ── */
function ImageCertBuilder({ settings, onPosChange, onStyleChange }) {
  const containerRef = useRef(null);
  const dragRef      = useRef(null);
  const [localPos, setLocalPos]       = useState({});
  const [activeField, setActiveField] = useState(null);

  let savedPos = {};
  let savedStyle = {};
  try { savedPos   = JSON.parse(settings.cert_field_positions || '{}'); } catch {}
  try { savedStyle = JSON.parse(settings.cert_field_styles   || '{}'); } catch {}

  function gp(k) { return { ...DEFAULT_POS[k], ...(savedPos[k] || {}), ...(localPos[k] || {}) }; }
  function gs(k) { return { ...DEFAULT_STYLE[k], ...(savedStyle[k] || {}) }; }

  function onMouseDown(e, key) {
    e.preventDefault();
    const p = gp(key);
    dragRef.current = { key, startX: e.clientX, startY: e.clientY, startPX: p.x, startPY: p.y };
    setActiveField(key);

    function onMove(ev) {
      const d = dragRef.current;
      if (!d) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = ((ev.clientX - d.startX) / rect.width)  * 100;
      const dy = ((ev.clientY - d.startY) / rect.height) * 100;
      const nx = Math.round(Math.min(97, Math.max(3, d.startPX + dx)) * 10) / 10;
      const ny = Math.round(Math.min(97, Math.max(3, d.startPY + dy)) * 10) / 10;
      setLocalPos(p => ({ ...p, [d.key]: { x: nx, y: ny } }));
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      dragRef.current = null;
      setLocalPos(lp => {
        const merged = { ...savedPos };
        Object.keys(lp).forEach(k => {
          merged[k] = { ...(DEFAULT_POS[k] || {}), ...(savedPos[k] || {}), ...lp[k] };
        });
        onPosChange(JSON.stringify(merged));
        return lp;
      });
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function updateStyle(key, prop, value) {
    const ns = { ...savedStyle, [key]: { ...gs(key), [prop]: value } };
    onStyleChange(JSON.stringify(ns));
  }

  function resetField(key) {
    const np = { ...savedPos }; delete np[key];
    const ns = { ...savedStyle }; delete ns[key];
    onPosChange(JSON.stringify(np));
    onStyleChange(JSON.stringify(ns));
    setLocalPos(p => { const q = { ...p }; delete q[key]; return q; });
  }

  const activeF = IMG_FIELDS.find(f => f.key === activeField);

  return (
    <div>
      {/* Canvas */}
      <div
        ref={containerRef}
        style={{
          position: 'relative', width: '100%', paddingBottom: `${(794 / 1123) * 100}%`,
          backgroundImage: settings.cert_bg_image_url ? `url(${settings.cert_bg_image_url})` : 'none',
          backgroundSize: 'cover', backgroundPosition: 'center',
          backgroundColor: settings.cert_bg_image_url ? 'transparent' : '#f3f4f6',
          border: '2px dashed #d1d5db', borderRadius: 8, overflow: 'hidden',
        }}
      >
        {!settings.cert_bg_image_url && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', gap: 8 }}>
            <div style={{ fontSize: 32 }}>🖼️</div>
            <div style={{ fontSize: 14 }}>ใส่ URL รูปภาพ Background ด้านบนก่อน</div>
          </div>
        )}
        {IMG_FIELDS.map(f => {
          const pos = gp(f.key);
          const sty = gs(f.key);
          const isAct = activeField === f.key;
          return (
            <div
              key={f.key}
              onMouseDown={e => onMouseDown(e, f.key)}
              onClick={() => setActiveField(f.key)}
              style={{
                position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)', cursor: 'move', userSelect: 'none',
                padding: '2px 6px', borderRadius: 4,
                border: `2px dashed ${isAct ? f.color : f.color + '70'}`,
                background: isAct ? f.color + '25' : f.color + '10',
                color: sty.color || '#111827',
                fontSize: `${(sty.size || 14) * 0.42}px`,
                fontWeight: sty.bold ? 700 : 500, whiteSpace: 'nowrap',
                transition: 'border-color 0.15s, background 0.15s',
                zIndex: isAct ? 10 : 1,
              }}
              title={`ลาก ${f.label}`}
            >
              {f.sample}
            </div>
          );
        })}
      </div>

      <p style={{ fontSize:12, color:'#94a3b8', marginTop:8, marginBottom:16 }}>
        💡 คลิกเลือก field → ลากไปวางตำแหน่ง · ปรับขนาด/สีที่แผง "ปรับแต่ง" ด้านล่าง
      </p>

      {/* Field chips */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
        {IMG_FIELDS.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setActiveField(prev => prev === f.key ? null : f.key)}
            style={{
              border: `2px solid ${activeField === f.key ? f.color : f.color + '50'}`,
              background: activeField === f.key ? f.color + '15' : 'transparent',
              color: f.color, padding:'3px 12px', borderRadius:20,
              fontSize:12, fontWeight:600, cursor:'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Style panel */}
      {activeField && activeField !== 'qr' && (
        <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:16, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>
              ✏️ ปรับแต่ง: <span style={{ color: activeF?.color }}>{activeF?.label}</span>
            </div>
            <button type="button" onClick={() => resetField(activeField)}
              style={{ background:'none', border:'none', color:'#ef4444', fontSize:12, cursor:'pointer' }}>↩ รีเซ็ต</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <div style={t.fGroup}>
              <label style={t.label}>ขนาดตัวอักษร (px)</label>
              <input type="number" style={t.input} min={8} max={120}
                value={gs(activeField).size || 14}
                onChange={e => updateStyle(activeField, 'size', Number(e.target.value))} />
            </div>
            <div style={t.fGroup}>
              <label style={t.label}>สีตัวอักษร</label>
              <div style={{ display:'flex', gap:8 }}>
                <input type="color"
                  style={{ width:38, height:38, borderRadius:8, border:'1px solid #e2e8f0', padding:2, cursor:'pointer', flexShrink:0 }}
                  value={gs(activeField).color || '#111827'}
                  onChange={e => updateStyle(activeField, 'color', e.target.value)} />
                <input type="text" style={{ ...t.input, fontFamily:'monospace', flex:1 }}
                  value={gs(activeField).color || '#111827'}
                  onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) updateStyle(activeField, 'color', e.target.value); }} />
              </div>
            </div>
            <div style={t.fGroup}>
              <label style={t.label}>น้ำหนัก</label>
              <button
                type="button"
                onClick={() => updateStyle(activeField, 'bold', !gs(activeField).bold)}
                style={{
                  width:'100%', height:38, borderRadius:8, fontSize:13, cursor:'pointer',
                  border: gs(activeField).bold ? '2px solid #2563eb' : '2px solid #e2e8f0',
                  background: gs(activeField).bold ? '#eff6ff' : '#fff',
                  color: gs(activeField).bold ? '#1d4ed8' : '#64748b',
                  fontWeight: gs(activeField).bold ? 700 : 400,
                }}
              >
                B {gs(activeField).bold ? 'หนา' : 'ปกติ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeField === 'qr' && (
        <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:16, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>✏️ ปรับแต่ง: QR Code</div>
            <button type="button" onClick={() => resetField('qr')}
              style={{ background:'none', border:'none', color:'#ef4444', fontSize:12, cursor:'pointer' }}>↩ รีเซ็ต</button>
          </div>
          <div style={{ ...t.fGroup, maxWidth:200 }}>
            <label style={t.label}>ขนาด QR (px)</label>
            <input type="number" style={t.input} min={40} max={200}
              value={gs('qr').size || 72}
              onChange={e => updateStyle('qr', 'size', Number(e.target.value))} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Settings Component ── */

export default function AdminSettings() {
  const toast = useToast();

  const [settings, setSettings] = useState({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [changed, setChanged]   = useState({});
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    getSettings()
      .then(s => setSettings(s))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleChange(key, value) {
    setSettings(p => ({ ...p, [key]: value }));
    setChanged(p => ({ ...p, [key]: true }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all(Object.keys(changed).map(k => saveSetting(k, settings[k] || '')));
      setChanged({});
      toast.success('บันทึกการตั้งค่าสำเร็จ');
    } catch {
      toast.error('บันทึกไม่สำเร็จ');
    } finally { setSaving(false); }
  }

  if (loading) return <InlineLoader />;

  const hasChanges     = Object.keys(changed).length > 0;
  const isImageMode    = settings.cert_design_mode === 'image';
  const activeTemplate = settings.cert_template || 'classic';
  const activeTpl      = TEMPLATES.find(t => t.id === activeTemplate) || TEMPLATES[0];
  const previewColor   = settings.cert_primary_color || activeTpl.defaultColor;

  const s = {
    page:    { fontFamily:"'Anuphan','Sarabun',sans-serif", fontSize:14 },
    card:    { background:'#fff', borderRadius:12, border:'1px solid #e2e8f0',
               boxShadow:'0 1px 3px rgba(0,0,0,.07)', marginBottom:14, overflow:'hidden' },
    cardHd:  { background:'linear-gradient(135deg,#1a3a6b,#1a56a0)', padding:'14px 20px' },
    cardTitle:{ fontSize:15, fontWeight:700, color:'#fff' },
    cardSub:  { fontSize:12, color:'rgba(255,255,255,.7)', marginTop:2 },
    cardBody: { padding:'20px' },
    sectionHd:{ fontSize:14, fontWeight:700, color:'#1e293b', marginBottom:12,
                display:'flex', alignItems:'center', gap:8 },
    grid2:   { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 },
    grid3:   { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 },
    notice:  { background:'#fffbeb', border:'1px solid #fde68a', borderRadius:9,
               padding:'12px 14px', fontSize:13, color:'#92400e', marginBottom:16 },
    noticeBlue:{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:9,
                  padding:'12px 14px', fontSize:13, color:'#1e40af', marginBottom:16 },
    divider: { borderTop:'1px solid #f1f5f9', margin:'16px 0' },
    modeBtn: (active) => ({
      padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:600,
      cursor:'pointer', border:'none',
      background: active ? '#fff' : 'transparent',
      color: active ? '#2563eb' : '#64748b',
      boxShadow: active ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
    }),
    tplCard: (active) => ({
      borderRadius:10, border: active ? '2px solid #2563eb' : '2px solid #e2e8f0',
      overflow:'hidden', cursor:'pointer', background:'#fff',
      boxShadow: active ? '0 0 0 3px rgba(37,99,235,.1)' : 'none',
    }),
  };

  return (
    <div style={s.page}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color:'#1e293b' }}>⚙️ ตั้งค่าระบบ</div>
          <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>กำหนดชื่อระบบ ออกแบบใบรับรอง และการส่งอีเมล</div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          style={{ ...t.btnPrimary, opacity: saving || !hasChanges ? 0.6 : 1,
                   cursor: saving || !hasChanges ? 'not-allowed' : 'pointer' }}
        >
          {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกการตั้งค่า'}
        </button>
      </div>

      {/* ── Section 1: ทั่วไป ── */}
      <div style={s.card}>
        <div style={s.cardHd}>
          <div style={s.cardTitle}>🔧 ทั่วไป</div>
          <div style={s.cardSub}>ชื่อระบบ องค์กร และ URL สำหรับใบรับรอง</div>
        </div>
        <div style={s.cardBody}>
          <div style={s.grid2}>
            {FIELDS_GENERAL.map(f => (
              <div key={f.key} style={t.fGroup}>
                <label style={t.label}>
                  {f.label}
                  {changed[f.key] && <span style={{ color:'#f59e0b', marginLeft:6, fontSize:11 }}>● แก้ไขแล้ว</span>}
                </label>
                <input style={t.input} type="text" placeholder={f.placeholder}
                  value={settings[f.key] || ''} onChange={e => handleChange(f.key, e.target.value)} />
              </div>
            ))}
          </div>
          {hasChanges && (
            <div style={{ ...s.notice, marginBottom:0, marginTop:8 }}>
              ⚠️ มีการแก้ไขที่ยังไม่ได้บันทึก — คลิก "บันทึกการตั้งค่า" ด้านบน
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: ออกแบบใบรับรอง ── */}
      <div style={s.card}>
        <div style={s.cardHd}>
          <div style={s.cardTitle}>🎨 ออกแบบใบรับรอง</div>
          <div style={s.cardSub}>เลือกรูปแบบใบรับรองสำหรับ PDF</div>
        </div>
        <div style={s.cardBody}>

          {/* Mode toggle */}
          <div style={{ display:'flex', gap:4, padding:4, background:'#f1f5f9', borderRadius:10, width:'fit-content', marginBottom:20 }}>
            <button type="button" onClick={() => handleChange('cert_design_mode', 'template')}
              style={s.modeBtn(!isImageMode)}>
              📄 Template สำเร็จรูป
            </button>
            <button type="button" onClick={() => handleChange('cert_design_mode', 'image')}
              style={s.modeBtn(isImageMode)}>
              🖼️ ใช้รูปภาพ Background เอง
            </button>
          </div>

          {/* ── Template mode ── */}
          {!isImageMode && (
            <>
              <div style={s.sectionHd}>รูปแบบ (Template)</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
                {TEMPLATES.map(tpl => {
                  const isActive = activeTemplate === tpl.id;
                  const tplColor = settings.cert_primary_color || tpl.defaultColor;
                  return (
                    <div key={tpl.id} style={s.tplCard(isActive)}
                      onClick={() => handleChange('cert_template', tpl.id)}>
                      <div style={{ padding:8 }}>{tpl.mini(tplColor)}</div>
                      <div style={{ padding:'8px 10px', borderTop: isActive ? '1px solid #bfdbfe' : '1px solid #f1f5f9',
                                    background: isActive ? '#eff6ff' : '#fff' }}>
                        <div style={{ fontSize:12, fontWeight:700, color: isActive ? '#1d4ed8' : '#374151' }}>
                          {isActive && '✓ '}{tpl.label}
                        </div>
                        <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{tpl.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={s.grid2}>
                {/* Primary color */}
                <div style={t.fGroup}>
                  <label style={t.label}>
                    สีหลัก
                    {changed.cert_primary_color && <span style={{ color:'#f59e0b', marginLeft:6, fontSize:11 }}>● แก้ไขแล้ว</span>}
                  </label>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <input type="color"
                      style={{ width:38, height:38, borderRadius:8, border:'1px solid #e2e8f0', padding:2, cursor:'pointer', flexShrink:0 }}
                      value={settings.cert_primary_color || activeTpl.defaultColor}
                      onChange={e => handleChange('cert_primary_color', e.target.value)} />
                    <input type="text" style={{ ...t.input, fontFamily:'monospace', flex:1 }}
                      placeholder={activeTpl.defaultColor}
                      value={settings.cert_primary_color || ''}
                      onChange={e => {
                        const v = e.target.value;
                        if (/^#?[0-9a-fA-F]{0,6}$/.test(v)) handleChange('cert_primary_color', v.startsWith('#') ? v : '#' + v);
                      }} />
                    {settings.cert_primary_color && (
                      <button type="button" onClick={() => handleChange('cert_primary_color', '')}
                        style={{ background:'none', border:'none', color:'#94a3b8', fontSize:12, cursor:'pointer', flexShrink:0 }}>✕ รีเซ็ต</button>
                    )}
                  </div>
                </div>

                {/* Logo URL */}
                <div style={t.fGroup}>
                  <label style={t.label}>
                    URL โลโก้
                    {changed.cert_logo_url && <span style={{ color:'#f59e0b', marginLeft:6, fontSize:11 }}>● แก้ไขแล้ว</span>}
                  </label>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <input type="text" style={{ ...t.input, flex:1 }}
                      placeholder="https://...logo.png (เว้นว่าง = ใช้ตัวอักษร)"
                      value={settings.cert_logo_url || ''}
                      onChange={e => handleChange('cert_logo_url', e.target.value)} />
                    {settings.cert_logo_url && (
                      <img src={settings.cert_logo_url} alt="logo"
                        style={{ width:32, height:32, objectFit:'contain', borderRadius:6, border:'1px solid #e2e8f0', flexShrink:0 }}
                        onError={e => e.target.style.display = 'none'} />
                    )}
                  </div>
                </div>

                {/* Logo text */}
                <div style={t.fGroup}>
                  <label style={t.label}>
                    ตัวอักษรโลโก้
                    {changed.cert_logo_text && <span style={{ color:'#f59e0b', marginLeft:6, fontSize:11 }}>● แก้ไขแล้ว</span>}
                  </label>
                  <input type="text" style={t.input}
                    placeholder={`${(settings.site_name || 'BMS')[0]} (ใช้เมื่อไม่มี URL โลโก้)`}
                    value={settings.cert_logo_text || ''}
                    onChange={e => handleChange('cert_logo_text', e.target.value.slice(0, 3))} maxLength={3} />
                </div>

                {/* Signature name */}
                <div style={t.fGroup}>
                  <label style={t.label}>
                    ชื่อผู้ลงนาม
                    {changed.cert_signature_name && <span style={{ color:'#f59e0b', marginLeft:6, fontSize:11 }}>● แก้ไขแล้ว</span>}
                  </label>
                  <input type="text" style={t.input} placeholder="ผู้อำนวยการฝึกอบรม"
                    value={settings.cert_signature_name || ''}
                    onChange={e => handleChange('cert_signature_name', e.target.value)} />
                </div>

                {/* Signature image */}
                <div style={{ ...t.fGroup, gridColumn:'1 / -1' }}>
                  <label style={t.label}>
                    URL รูปลายมือชื่อ (ไม่บังคับ)
                    {changed.cert_signature_url && <span style={{ color:'#f59e0b', marginLeft:6, fontSize:11 }}>● แก้ไขแล้ว</span>}
                  </label>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <input type="text" style={{ ...t.input, flex:1 }}
                      placeholder="https://...signature.png (เว้นว่าง = ไม่แสดงรูปลายมือชื่อ)"
                      value={settings.cert_signature_url || ''}
                      onChange={e => handleChange('cert_signature_url', e.target.value)} />
                    {settings.cert_signature_url && (
                      <img src={settings.cert_signature_url} alt="sig"
                        style={{ height:32, maxWidth:80, objectFit:'contain', borderRadius:6, border:'1px solid #e2e8f0', flexShrink:0 }}
                        onError={e => e.target.style.display = 'none'} />
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Image Background mode ── */}
          {isImageMode && (
            <>
              <div style={{ ...s.noticeBlue, flexDirection:'column' }}>
                <div style={{ fontWeight:700, marginBottom:6 }}>🖼️ วิธีใช้ Background รูปภาพ</div>
                <ol style={{ margin:0, paddingLeft:18, lineHeight:1.8 }}>
                  <li>ออกแบบ certificate template ด้วย Canva / PowerPoint / Photoshop (แนะนำขนาด 1123×794 px แนวนอน)</li>
                  <li>Export เป็น PNG/JPG และอัปโหลดไว้ที่ใดก็ได้ (Google Drive, Cloudinary, Imgbb, GitHub ฯลฯ)</li>
                  <li>วาง URL ในช่องด้านล่าง แล้วลากช่องข้อมูลไปวางตำแหน่งที่ว่างไว้ในภาพ</li>
                </ol>
              </div>

              <div style={t.fGroup}>
                <label style={t.label}>
                  URL รูปภาพ Background
                  {changed.cert_bg_image_url && <span style={{ color:'#f59e0b', marginLeft:6, fontSize:11 }}>● แก้ไขแล้ว</span>}
                </label>
                <div style={{ display:'flex', gap:8 }}>
                  <input type="text" style={{ ...t.input, flex:1 }}
                    placeholder="https://...certificate-template.png"
                    value={settings.cert_bg_image_url || ''}
                    onChange={e => handleChange('cert_bg_image_url', e.target.value)} />
                  {settings.cert_bg_image_url && (
                    <button type="button" onClick={() => handleChange('cert_bg_image_url', '')}
                      style={{ ...t.btnDanger, ...t.btnSm }}>✕ ลบ</button>
                  )}
                </div>
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>รองรับ PNG, JPG — แนะนำให้เว้นพื้นที่ว่างไว้สำหรับข้อมูลแต่ละช่อง</div>
              </div>

              <div style={{ ...s.grid2, marginBottom:16 }}>
                <div style={t.fGroup}>
                  <label style={t.label}>ชื่อผู้ลงนาม</label>
                  <input type="text" style={t.input} placeholder="ผู้อำนวยการฝึกอบรม"
                    value={settings.cert_signature_name || ''}
                    onChange={e => handleChange('cert_signature_name', e.target.value)} />
                </div>
                <div style={t.fGroup}>
                  <label style={t.label}>URL รูปลายมือชื่อ (ไม่บังคับ)</label>
                  <input type="text" style={t.input} placeholder="https://...signature.png"
                    value={settings.cert_signature_url || ''}
                    onChange={e => handleChange('cert_signature_url', e.target.value)} />
                </div>
              </div>

              <div style={t.label}>ลากวางตำแหน่งข้อมูลบนภาพ</div>
              <div style={{ marginTop:8 }}>
                <ImageCertBuilder
                  settings={settings}
                  onPosChange={v => handleChange('cert_field_positions', v)}
                  onStyleChange={v => handleChange('cert_field_styles', v)}
                />
              </div>
            </>
          )}

          {/* Preview */}
          <div style={s.divider} />
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#374151' }}>ตัวอย่าง PDF</div>
            <button type="button" onClick={() => setShowPreview(p => !p)}
              style={{ ...t.btnGhost, fontSize:12 }}>
              {showPreview ? '▲ ซ่อน' : '▼ แสดงตัวอย่าง PDF'}
            </button>
          </div>
          {showPreview && (
            <div style={{ display:'flex', justifyContent:'center', overflowX:'auto', padding:'8px 0' }}>
              <CertPreviewCard cert={PREVIEW_CERT} settings={settings} scale={0.43} />
            </div>
          )}
          {!showPreview && (
            <p style={{ fontSize:12, color:'#94a3b8' }}>คลิก "แสดงตัวอย่าง PDF" เพื่อดูผลลัพธ์ที่จะออกมาเป็น PDF จริง</p>
          )}
        </div>
      </div>

      {/* ── Section 3: EmailJS ── */}
      <div style={s.card}>
        <div style={s.cardHd}>
          <div style={s.cardTitle}>📧 ตั้งค่าส่งอีเมลใบรับรอง (EmailJS)</div>
          <div style={s.cardSub}>ใช้ Gmail ส่งได้เลย ไม่ต้อง domain พิเศษ ฟรี 200 อีเมล/เดือน</div>
        </div>
        <div style={s.cardBody}>

          <div style={s.noticeBlue}>
            <div style={{ fontWeight:700, marginBottom:8 }}>📋 วิธีตั้งค่า (ทำครั้งเดียว ~5 นาที)</div>
            <ol style={{ margin:0, paddingLeft:18, lineHeight:1.9 }}>
              <li>ไปที่ <a href="https://www.emailjs.com" target="_blank" rel="noopener noreferrer" style={{ fontWeight:700, color:'#1d4ed8' }}>emailjs.com</a> → สมัครฟรีด้วย Google</li>
              <li><strong>Add New Service</strong> → เลือก <strong>Gmail</strong> → เชื่อม Google account → คัดลอก <strong>Service ID</strong></li>
              <li><strong>Email Templates</strong> → <strong>Create New Template</strong> → คัดลอก <strong>Template ID</strong></li>
              <li>ในหน้า Template: <strong>To Email:</strong> <code style={{ background:'#dbeafe', padding:'1px 5px', borderRadius:4 }}>{'{{to_email}}'}</code> · <strong>Subject:</strong> <code style={{ background:'#dbeafe', padding:'1px 5px', borderRadius:4 }}>{'ใบรับรอง – {{course_name}}'}</code></li>
              <li>ไปที่ <strong>Account → General → Public Key</strong> → คัดลอก <strong>Public Key</strong></li>
            </ol>
          </div>

          <details style={{ marginBottom:16 }}>
            <summary style={{ cursor:'pointer', fontSize:13, fontWeight:600, color:'#374151', userSelect:'none', padding:'8px 0' }}>
              📄 คลิกเพื่อดู HTML Template สำหรับ EmailJS
            </summary>
            <div style={{ marginTop:8, position:'relative' }}>
              <pre style={{ background:'#1e293b', color:'#e2e8f0', fontSize:11, borderRadius:10, padding:16, overflowX:'auto', maxHeight:200, lineHeight:1.6, margin:0 }}>{`<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:24px;text-align:center;">
    <div style="color:#fff;font-size:18px;font-weight:700;">{{site_name}}</div>
    <div style="color:rgba(255,255,255,0.8);font-size:12px;">CERTIFICATE OF ACHIEVEMENT</div>
  </div>
  <div style="padding:24px;">
    <p style="color:#374151;">สวัสดีคุณ <strong>{{to_name}}</strong>,</p>
    <p style="color:#6b7280;">ขอแสดงความยินดีที่ผ่านการทดสอบ <strong style="color:#1d4ed8;">{{course_name}}</strong></p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;text-align:center;margin:16px 0;">
      <div style="font-size:40px;font-weight:900;color:#15803d;">{{percent}}%</div>
      <div style="color:#16a34a;">{{score}} จาก {{total}} ข้อ · ✅ PASS</div>
    </div>
    <table style="width:100%;border:1px solid #e5e7eb;border-radius:10px;border-collapse:collapse;">
      <tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;">Cert ID</td>
          <td style="padding:8px 12px;font-weight:700;color:#1d4ed8;font-family:monospace;">{{cert_id}}</td></tr>
      <tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;">วันที่ออก</td>
          <td style="padding:8px 12px;font-size:13px;">{{issued_date}}</td></tr>
    </table>
    <div style="margin-top:16px;">
      <a href="{{verify_url}}" style="display:block;background:#2563eb;color:#fff;text-decoration:none;text-align:center;padding:12px;border-radius:8px;font-weight:600;">🛡️ ตรวจสอบใบรับรองออนไลน์</a>
    </div>
  </div>
  <div style="background:#f9fafb;padding:16px;text-align:center;font-size:12px;color:#9ca3af;">
    {{site_name}} · {{org_name}}
  </div>
</div>`}</pre>
              <button
                onClick={() => { navigator.clipboard.writeText(document.querySelector('pre').textContent).then(() => alert('คัดลอกแล้ว!')); }}
                style={{ position:'absolute', top:8, right:8, background:'#475569', color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', fontSize:12, cursor:'pointer' }}>
                📋 คัดลอก
              </button>
            </div>
          </details>

          <div style={s.grid3}>
            {FIELDS_EMAIL.map(f => (
              <div key={f.key} style={t.fGroup}>
                <label style={t.label}>
                  {f.label}
                  {changed[f.key] && <span style={{ color:'#f59e0b', marginLeft:6, fontSize:11 }}>● แก้ไขแล้ว</span>}
                </label>
                <input type={f.type || 'text'} style={t.input} placeholder={f.placeholder}
                  value={settings[f.key] || ''} onChange={e => handleChange(f.key, e.target.value)} />
              </div>
            ))}
          </div>

          {settings.emailjs_service_id && settings.emailjs_template_id && settings.emailjs_public_key && (
            <div style={{ background:'#ecfdf5', border:'1px solid #a7f3d0', borderRadius:9,
                           padding:'10px 14px', fontSize:13, color:'#065f46', display:'flex', alignItems:'center', gap:8 }}>
              ✅ ตั้งค่า EmailJS ครบแล้ว พร้อมส่งอีเมล
            </div>
          )}
        </div>
      </div>


    </div>
  );
}
