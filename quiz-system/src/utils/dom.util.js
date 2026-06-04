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
