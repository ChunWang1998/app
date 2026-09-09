/** Taiwan-ish phone as stable login_key. No OTP. */
export function normalizeLoginKey(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('886') && digits.length >= 11) {
    return `0${digits.slice(3)}`;
  }
  return digits;
}

export function accountIdFromKey(loginKey) {
  return `u_${loginKey}`;
}
