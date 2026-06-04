import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { getLocations } from '../../services/locations.service';
import { getSettings, saveSetting } from '../../services/settings.service';

// ─── Thai numeral converter ───────────────────────────────────────────────────
const TD = ['๐','๑','๒','๓','๔','๕','๖','๗','๘','๙'];
const toThai = n => String(n).split('').map(d => TD[+d] ?? d).join('');

// ─── Default document titles ──────────────────────────────────────────────────
const DEFAULT_TITLES = [
  'ใบลงชื่อ Stand by การใช้งานระบบงาน โปรแกรม BMS-HOSxP XE',
  'ใบลงชื่อเข้าร่วมประชุมสรุป Flow การใช้งานโปรแกรม BMS-INVENTORY ครั้งที่ ๑/๒',
  'ใบลงชื่อเข้าร่วมประชุมสรุปปัญหาการใช้งานโปรแกรม BMS-INVENTORY',
  'ใบลงชื่อเข้าร่วมการจำลองคู่ขนาน SIT (System Integration Testing)',
  'ใบเซ็นชื่อคีย์ยอดตั้งต้นคลังย่อย โปรแกรม BMS-INVENTORY',
];

// ─── Title Management Modal ───────────────────────────────────────────────────
function TitleModal({ open, titles, onClose, onSave }) {
  const [list, setList]       = useState([]);
  const [editing, setEditing] = useState(null); // { index, value }
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    if (open) { setList([...titles]); setEditing(null); setNewTitle(''); }
  }, [open]);

  if (!open) return null;

  function add() {
    if (!newTitle.trim()) return;
    setList(p => [...p, newTitle.trim()]);
    setNewTitle('');
  }

  function del(i) {
    setList(p => p.filter((_, idx) => idx !== i));
    if (editing?.index === i) setEditing(null);
  }

  function confirmEdit() {
    if (!editing?.value.trim()) return;
    setList(p => p.map((t, i) => i === editing.index ? editing.value.trim() : t));
    setEditing(null);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col" style={{ maxHeight: '85vh' }}>

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="font-bold text-slate-900">📋 จัดการหัวข้อเอกสาร</div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 text-lg leading-none">
            ✕
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {list.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-10">ยังไม่มีหัวข้อ กรุณาเพิ่มด้านล่าง</p>
          )}
          {list.map((t, i) => (
            <div key={i} className="border border-slate-200 rounded-lg p-3">
              {editing?.index === i ? (
                <div className="space-y-2">
                  <textarea
                    className="form-input text-sm resize-none w-full"
                    rows={3}
                    value={editing.value}
                    onChange={e => setEditing(p => ({ ...p, value: e.target.value }))}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditing(null)} className="btn btn-ghost btn-sm">ยกเลิก</button>
                    <button onClick={confirmEdit} className="btn btn-primary btn-sm">บันทึก</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <span className="flex-1 text-sm text-slate-700 leading-relaxed">{t}</span>
                  <button onClick={() => setEditing({ index: i, value: t })}
                    className="shrink-0 text-slate-400 hover:text-blue-500 px-1 text-base">✏️</button>
                  <button onClick={() => del(i)}
                    className="shrink-0 text-slate-400 hover:text-red-500 px-1 text-base">🗑</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add new + save */}
        <div className="p-4 border-t border-slate-100 space-y-3 shrink-0">
          <div className="flex gap-2">
            <textarea
              className="form-input flex-1 text-sm resize-none"
              rows={2}
              placeholder="พิมพ์หัวข้อใหม่แล้วกด + เพิ่ม..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
            <button onClick={add} className="btn btn-primary self-end shrink-0">+ เพิ่ม</button>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="btn btn-ghost">ยกเลิก</button>
            <button onClick={() => onSave(list)} className="btn btn-primary">💾 บันทึกทั้งหมด</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Printable Document ───────────────────────────────────────────────────────
function PrintDoc({ title, hospital, date, showOfficer, rowCount, leftName, leftPos, rightName, rightPos, rightInstitution }) {
  const rows = Array.from({ length: rowCount }, (_, i) => i + 1);

  const cellStyle = {
    border: '1px solid #000',
    padding: '3px 6px',
  };
  const centerCell = {
    ...cellStyle,
    textAlign: 'center',
  };

  return (
    <div style={{ fontFamily: "'Sarabun', 'TH Sarabun New', sans-serif", fontSize: '14px', color: '#000', background: '#fff', width: '100%' }}>

      {/* Company header */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '6px' }}>
        <div style={{
          width: '74px', height: '74px', border: '2px solid #000', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 'bold', fontSize: '22px', letterSpacing: '1px',
        }}>BMS</div>
        <div style={{ fontSize: '13px', lineHeight: '1.65' }}>
          <div style={{ fontWeight: 'bold' }}>บริษัท บางกอก เมดิคอล ซอฟต์แวร์ จำกัด (สำนักงานใหญ่)</div>
          <div>เลขที่ 2 ชั้น 2 ซ.สุขสวัสดิ์ 33 แขวง/เขต ราษฎร์บูรณะ กรุงเทพมหานคร</div>
          <div>โทรศัพท์ 0-2427-9991 โทรสาร 0-2873-0292</div>
          <div>เลขที่ประจำตัวผู้เสียภาษี 0105548152334</div>
        </div>
      </div>

      {/* Main table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '42px' }} />
          <col style={{ width: '32%' }} />
          <col style={{ width: '20%' }} />
          <col />
          <col style={{ width: '20%' }} />
        </colgroup>
        <tbody>

          {/* Title row */}
          <tr>
            <td colSpan={5} style={{ ...centerStyle, fontWeight: 'bold', fontSize: '14px', padding: '5px 8px' }}>
              {title || '(กรุณาเลือกหัวข้อเอกสาร)'}
            </td>
          </tr>

          {/* Info row */}
          <tr>
            <td colSpan={3} style={{ ...cellStyle, fontSize: '13px' }}>
              สถานพยาบาล : {hospital || '...........'}
            </td>
            <td colSpan={2} style={{ ...cellStyle, fontSize: '13px' }}>
              <div>วันที่ : {date}</div>
              {showOfficer && <div>เจ้าหน้าที่ :</div>}
            </td>
          </tr>

          {/* Column headers */}
          <tr>
            {[
              { label: 'ลำดับ' },
              { label: 'ชื่อ – นามสกุล' },
              { label: 'ตำแหน่ง' },
              { label: 'แผนก' },
              { label: 'ลายมือชื่อ' },
            ].map(({ label }) => (
              <th key={label} style={{
                ...centerStyle, fontWeight: 'bold', fontSize: '13px',
                padding: '4px 6px', background: '#f5f5f5',
              }}>
                {label}
              </th>
            ))}
          </tr>

          {/* Data rows */}
          {rows.map(n => (
            <tr key={n}>
              <td style={{ ...centerStyle, fontSize: '13px', height: '22px' }}>{toThai(n)}</td>
              <td style={cellStyle} />
              <td style={cellStyle} />
              <td style={cellStyle} />
              <td style={cellStyle} />
            </tr>
          ))}
        </tbody>
      </table>

      {/* Signatures */}
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '28px' }}>
        <div style={{ textAlign: 'center', fontSize: '13px', lineHeight: '1.9' }}>
          <div>.....................................................</div>
          <div>({leftName || 'ชื่อ-สกุล'})</div>
          <div>ตำแหน่ง {leftPos || '.........'}</div>
          <div>บริษัท บางกอก เมดิคอล ซอฟต์แวร์ จำกัด</div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '13px', lineHeight: '1.9' }}>
          <div>.....................................................</div>
          <div>({rightName || 'ชื่อ-สกุล'})</div>
          <div>ตำแหน่ง {rightPos || '.........'}</div>
          {rightInstitution && <div>{rightInstitution}</div>}
        </div>
      </div>
    </div>
  );
}

// shared border style for table cells
const centerStyle = { border: '1px solid #000', textAlign: 'center', padding: '3px 6px' };

// ─── Label helper ──────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500 mb-1">{label}</div>
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Documents() {
  const toast = useToast();
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [locations, setLocations] = useState([]);
  const [titles, setTitles]     = useState(DEFAULT_TITLES);
  const [showModal, setShowModal] = useState(false);

  // Document config state
  const [title, setTitle]               = useState('');
  const [locationId, setLocationId]     = useState('');
  const [date, setDate]                 = useState('');
  const [showOfficer, setShowOfficer]   = useState(false);
  const [rowCount, setRowCount]         = useState(25);
  const [leftName, setLeftName]         = useState('');
  const [leftPos, setLeftPos]           = useState('');
  const [rightName, setRightName]       = useState('');
  const [rightPos, setRightPos]         = useState('');
  const [rightInstitution, setRightInstitution] = useState('');

  useEffect(() => {
    // default Thai date
    const d = new Date();
    const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    setDate(`${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`);

    Promise.all([getLocations(), getSettings()])
      .then(([locs, stg]) => {
        setLocations(locs);
        if (stg.doc_titles) {
          try { setTitles(JSON.parse(stg.doc_titles)); } catch {}
        }
        if (stg.doc_left_name)  setLeftName(stg.doc_left_name);
        if (stg.doc_left_pos)   setLeftPos(stg.doc_left_pos);
        if (stg.doc_right_name) setRightName(stg.doc_right_name);
        if (stg.doc_right_pos)  setRightPos(stg.doc_right_pos);
        if (stg.doc_right_inst) setRightInstitution(stg.doc_right_inst);
      })
      .catch(() => toast.error('โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, []);

  // Auto-fill right institution when location changes
  useEffect(() => {
    if (!locationId) return;
    const loc = locations.find(l => l.id === Number(locationId));
    if (loc) setRightInstitution(loc.name);
  }, [locationId, locations]);

  async function handleSaveTitles(list) {
    setSaving(true);
    try {
      await saveSetting('doc_titles', JSON.stringify(list));
      setTitles(list);
      setShowModal(false);
      toast.success('บันทึกหัวข้อสำเร็จ');
    } catch { toast.error('บันทึกไม่สำเร็จ'); }
    finally { setSaving(false); }
  }

  async function handleSaveSignatories() {
    setSaving(true);
    try {
      await Promise.all([
        saveSetting('doc_left_name', leftName),
        saveSetting('doc_left_pos', leftPos),
        saveSetting('doc_right_name', rightName),
        saveSetting('doc_right_pos', rightPos),
        saveSetting('doc_right_inst', rightInstitution),
      ]);
      toast.success('บันทึกผู้ลงนามเป็นค่าเริ่มต้นแล้ว');
    } catch { toast.error('บันทึกไม่สำเร็จ'); }
    finally { setSaving(false); }
  }

  const selectedLoc = locations.find(l => l.id === Number(locationId));
  const hospital    = selectedLoc?.name || '';

  const docProps = { title, hospital, date, showOfficer, rowCount, leftName, leftPos, rightName, rightPos, rightInstitution };

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-slate-400">
      <div className="text-sm">กำลังโหลด...</div>
    </div>
  );

  return (
    <>
      <TitleModal
        open={showModal}
        titles={titles}
        onClose={() => setShowModal(false)}
        onSave={handleSaveTitles}
      />

      {/* Print-only area — hidden on screen, shown on print */}
      <div className="hidden print:block" style={{ padding: '0' }}>
        <PrintDoc {...docProps} />
      </div>

      {/* Screen UI — hidden on print */}
      <div className="print:hidden max-w-7xl mx-auto">

        {/* Page header */}
        <div className="flex flex-wrap items-start justify-between gap-2 mb-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link to="/admin/courses" className="text-blue-600 no-underline hover:underline">Admin</Link>
              <span>›</span>
              <span>พิมพ์เอกสาร</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 m-0">🖨️ พิมพ์เอกสาร</h1>
            <p className="text-sm text-slate-500 mt-0.5 mb-0">ใบลงชื่อสำหรับการอบรมและการประชุม BMS</p>
          </div>
          <button onClick={() => window.print()} className="btn btn-primary gap-2 shrink-0">
            🖨️ พิมพ์เอกสาร
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 items-start">

          {/* ─── Config panel ─── */}
          <div className="space-y-4">

            {/* Document title */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">หัวข้อเอกสาร</div>

              <Field label="เลือกจากรายการ">
                <select className="form-input text-sm" value={title} onChange={e => setTitle(e.target.value)}>
                  <option value="">— เลือกหัวข้อ —</option>
                  {titles.map((t, i) => (
                    <option key={i} value={t}>{t.length > 52 ? t.slice(0, 52) + '…' : t}</option>
                  ))}
                </select>
              </Field>

              <div className="mt-2.5">
                <Field label="หรือพิมพ์หัวข้อเอง">
                  <textarea
                    className="form-input text-sm resize-none"
                    rows={3}
                    placeholder="พิมพ์หัวข้อที่ต้องการ..."
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </Field>
              </div>

              <button onClick={() => setShowModal(true)}
                className="btn btn-ghost btn-sm mt-2.5 w-full text-slate-600">
                ✏️ จัดการหัวข้อ (เพิ่ม / แก้ไข / ลบ)
              </button>
            </div>

            {/* Document info */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">ข้อมูลเอกสาร</div>
              <div className="space-y-2.5">

                <Field label="สถานพยาบาล">
                  <select className="form-input text-sm" value={locationId} onChange={e => setLocationId(e.target.value)}>
                    <option value="">— เลือกสาขา —</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.code ? `${l.code} : ${l.name}` : l.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="วันที่ (แสดงในเอกสาร)">
                  <input className="form-input text-sm" value={date} onChange={e => setDate(e.target.value)}
                    placeholder="เช่น ๒๑ พฤษภาคม ๒๕๖๙" />
                </Field>

                <Field label="จำนวนแถวลงชื่อ">
                  <div className="flex items-center gap-2">
                    <input type="number" min={5} max={100}
                      className="form-input text-sm w-24"
                      value={rowCount}
                      onChange={e => setRowCount(Math.max(5, Math.min(100, Number(e.target.value))))} />
                    <span className="text-xs text-slate-400">แถว (5–100)</span>
                  </div>
                </Field>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" className="rounded accent-blue-600"
                    checked={showOfficer} onChange={e => setShowOfficer(e.target.checked)} />
                  <span className="text-sm text-slate-600">แสดงช่อง "เจ้าหน้าที่"</span>
                </label>

              </div>
            </div>

            {/* Signatories */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">ผู้ลงนาม</div>
              <div className="space-y-3">

                <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                  <div className="text-xs font-semibold text-blue-700">ซ้าย — BMS</div>
                  <input className="form-input text-sm" placeholder="ชื่อ-นามสกุล"
                    value={leftName} onChange={e => setLeftName(e.target.value)} />
                  <input className="form-input text-sm" placeholder="ตำแหน่ง"
                    value={leftPos} onChange={e => setLeftPos(e.target.value)} />
                  <div className="text-xs text-blue-400">บริษัท บางกอก เมดิคอล ซอฟต์แวร์ จำกัด</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                  <div className="text-xs font-semibold text-slate-600">ขวา — สถานพยาบาล</div>
                  <input className="form-input text-sm" placeholder="ชื่อ-นามสกุล"
                    value={rightName} onChange={e => setRightName(e.target.value)} />
                  <input className="form-input text-sm" placeholder="ตำแหน่ง"
                    value={rightPos} onChange={e => setRightPos(e.target.value)} />
                  <input className="form-input text-sm" placeholder="ชื่อหน่วยงาน / โรงพยาบาล"
                    value={rightInstitution} onChange={e => setRightInstitution(e.target.value)} />
                </div>

                <button onClick={handleSaveSignatories} disabled={saving}
                  className="btn btn-ghost btn-sm w-full text-slate-600">
                  💾 บันทึกเป็นค่าเริ่มต้น
                </button>
              </div>
            </div>

          </div>

          {/* ─── Preview panel ─── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">ตัวอย่างเอกสาร</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">A4 · {rowCount} แถว</span>
                <button onClick={() => window.print()} className="btn btn-primary btn-sm">
                  🖨️ พิมพ์
                </button>
              </div>
            </div>
            <div className="p-5 overflow-auto" style={{ maxHeight: '82vh' }}>
              <PrintDoc {...docProps} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
