export default function Modal({ open, onClose, title, sub, children, footer, maxWidth = 520 }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      {/* Mobile: slide up from bottom; Desktop: center dialog */}
      <div
        className="bg-white w-full flex flex-col overflow-hidden
          rounded-t-2xl sm:rounded-2xl shadow-2xl
          max-h-[92dvh] sm:max-h-[90vh]"
        style={{ maxWidth: `min(${maxWidth}px, 100%)` }}
      >
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {title && (
          <div className="px-5 py-3.5 shrink-0" style={{ background: 'linear-gradient(135deg,#1a3a6b,#1a56a0)' }}>
            <div className="text-white font-bold text-sm sm:text-base">{title}</div>
            {sub && <div className="text-white/70 text-xs mt-0.5">{sub}</div>}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>

        {footer && (
          <div className="px-4 sm:px-6 py-3 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end shrink-0
            pb-[calc(12px+env(safe-area-inset-bottom,0px))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
