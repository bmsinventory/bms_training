// ─── Date / Time ──────────────────────────────────────────
export function fmtDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function fmtDateTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fmtDateLong(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

// ─── Cert ID generator (client side for preview) ──────────
export function makeCertId(prefix = 'BMS') {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `${prefix}-${year}-${rand}`;
}

// ─── Grade quiz ────────────────────────────────────────────
export function gradeQuiz(questions, answers) {
  let correct = 0;
  const details = questions.map(q => {
    const userChoiceId = answers[q.id];
    const correctChoice = q.choices.find(c => c.is_correct);
    const userChoice = q.choices.find(c => c.id === userChoiceId);
    const isCorrect = userChoiceId === correctChoice?.id;
    if (isCorrect) correct++;
    return {
      question: q.question,
      explanation: q.explanation,
      userChoice: userChoice?.choice_text || '(ไม่ได้ตอบ)',
      correctChoice: correctChoice?.choice_text || '',
      isCorrect,
    };
  });

  const total = questions.length;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  return { correct, total, percent, details };
}

// ─── Validation ───────────────────────────────────────────
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isThaiName(str) {
  return str.trim().length >= 2;
}

// ─── Misc ─────────────────────────────────────────────────
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function clsx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function truncate(str, len = 80) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// ─── XLSX export ──────────────────────────────────────────
export function exportToExcel(rows, filename = 'export.xlsx') {
  import('xlsx').then(({ utils, writeFile }) => {
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Sheet1');
    writeFile(wb, filename);
  });
}
