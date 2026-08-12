/** 6-digit room code — easier for older adults to read and type. */
export function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += String(Math.floor(Math.random() * 10));
  }
  return code;
}

export function normalizeRoomCode(raw) {
  return String(raw || '')
    .replace(/\D/g, '')
    .slice(0, 6);
}

export function isValidRoomCode(code) {
  return /^\d{6}$/.test(code);
}
