export default function ConfirmDialog({ open, title, desc, danger = true, onOk, onCancel, loading, okLabel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45">
      <div className="bg-white rounded-2xl p-7 max-w-sm w-[90%] shadow-2xl">
        <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
        {desc && <p className="text-sm text-gray-500 mb-5 leading-relaxed whitespace-pre-line">{desc}</p>}
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} disabled={loading} className="btn btn-secondary btn-sm">ยกเลิก</button>
          <button onClick={onOk} disabled={loading}
            className={`btn btn-sm disabled:opacity-60 ${danger ? 'btn-danger' : 'btn-primary'}`}>
            {loading ? '⏳ กำลังดำเนินการ...' : (okLabel || 'ยืนยัน')}
          </button>
        </div>
      </div>
    </div>
  );
}
