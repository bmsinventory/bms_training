export default function Loading({ text = 'กำลังโหลด...' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
      <div className="spinner" />
      <p className="text-gray-400 text-sm">{text}</p>
    </div>
  );
}

export function InlineLoader({ text = '' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12">
      <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
      {text && <span className="text-gray-400 text-sm">{text}</span>}
    </div>
  );
}
