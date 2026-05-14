import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const toast = {
    success: (msg, dur)  => addToast(msg, 'success', dur),
    error:   (msg, dur)  => addToast(msg, 'error', dur),
    info:    (msg, dur)  => addToast(msg, 'info', dur),
    warning: (msg, dur)  => addToast(msg, 'warning', dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={id => setToasts(p => p.filter(t => t.id !== id))} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

const icons = {
  success: '✅',
  error:   '❌',
  info:    'ℹ️',
  warning: '⚠️',
};

const bgColors = {
  success: '#059669',
  error:   '#dc2626',
  info:    '#2563eb',
  warning: '#d97706',
};

function ToastContainer({ toasts, onRemove }) {
  return (
    <div style={{
      position:'fixed', bottom:20, right:20, zIndex:9999,
      display:'flex', flexDirection:'column', gap:8, maxWidth:360, width:'100%',
      fontFamily:"'Anuphan','Sarabun',sans-serif",
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          className="toast-enter"
          style={{
            display:'flex', alignItems:'flex-start', gap:10,
            padding:'12px 16px', borderRadius:12,
            boxShadow:'0 4px 16px rgba(0,0,0,.18)',
            background: bgColors[t.type], color:'#fff',
          }}
        >
          <span style={{ fontSize:16, flexShrink:0 }}>{icons[t.type]}</span>
          <span style={{ fontSize:14, fontWeight:500, flex:1 }}>{t.message}</span>
          <button
            onClick={() => onRemove(t.id)}
            style={{ background:'none', border:'none', color:'rgba(255,255,255,.8)',
                     fontSize:18, cursor:'pointer', flexShrink:0, lineHeight:1 }}
          >×</button>
        </div>
      ))}
    </div>
  );
}
