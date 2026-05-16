export default function Modal({ open, onClose, title, sub, children, footer, maxWidth = 520 }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden" style={{ maxWidth, maxHeight: '90vh' }}>
        {title && (
          <div className="px-6 py-4 shrink-0" style={{ background: 'linear-gradient(135deg,#1a3a6b,#1a56a0)' }}>
            <div className="text-white font-bold text-base">{title}</div>
            {sub && <div className="text-white/70 text-xs mt-0.5">{sub}</div>}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}
