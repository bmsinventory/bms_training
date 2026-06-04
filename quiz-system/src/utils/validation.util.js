export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isThaiName(str) {
  return str.trim().length >= 2;
}
