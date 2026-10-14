const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/** Neutralize spreadsheet formula injection and quote fields that need it. */
export function csvEscape(value) {
  let s = value == null ? '' : String(value);
  if (FORMULA_PREFIX.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportFileName(kind, now = new Date()) {
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  return kind === 'csv' ? `been-ages-${stamp}.csv` : `been-ages-${stamp}.json`;
}
