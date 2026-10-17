import PHRASES from './phrases.json';

function fold(s) {
  let out = String(s || '')
    .toLowerCase()
    .replace(/[\s?!.,']/g, '');
  for (const ch of PHRASES.foldStrip || []) out = out.split(ch).join('');
  return out;
}

function foldNoise(s) {
  let out = fold(s);
  for (const n of PHRASES.nameNoise || []) {
    const next = out.split(String(n).toLowerCase()).join('');
    if (next.length >= 2) out = next;
  }
  return out;
}

const STOP = new Set(['the', 'a', 'an', 'to', 'my', 'i', 'and', 'of', 'for']);

function latinTokens(s) {
  return String(s || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((w) => w.replace(/(ed|ing|s)$/, ''))
    .filter((w) => w.length > 1 && !STOP.has(w));
}

function tokenScore(query, title) {
  const q = latinTokens(query);
  const t = latinTokens(title);
  if (!q.length || !t.length) return 0;
  let hit = 0;
  for (const w of t) {
    if (q.some((x) => x === w || x.startsWith(w) || w.startsWith(x))) hit += 1;
  }
  return hit / Math.max(q.length, t.length);
}

function charOverlap(a, b) {
  const short = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;
  if (short.length < 2) return 0;
  let hit = 0;
  for (const ch of short) if (long.includes(ch)) hit += 1;
  return hit / short.length;
}

export function matchScore(query, title) {
  const q = fold(query);
  const t = fold(title);
  if (!q || !t) return 0;
  if (q === t) return 1;
  const qn = foldNoise(query);
  const tn = foldNoise(title);
  if (qn && tn && qn === tn) return 0.95;
  if (t.includes(q) || q.includes(t) || (qn && tn && (tn.includes(qn) || qn.includes(tn)))) {
    return 0.85 + 0.15 * (Math.min(q.length, t.length) / Math.max(q.length, t.length));
  }
  const tok = tokenScore(query, title);
  if (tok >= 0.5) return 0.5 + tok * 0.4;
  const ov = charOverlap(q, t);
  if (ov >= 0.8) return 0.55 + ov * 0.3;
  return 0;
}

/** Best existing item for a spoken/typed name, or null. */
export function fuzzyMatchItem(query, items, min = 0.5) {
  const q = String(query || '').trim();
  if (!q) return null;
  let best = null;
  let bestScore = min;
  for (const item of items || []) {
    const s = matchScore(q, item?.title);
    if (s > bestScore) {
      best = item;
      bestScore = s;
    }
  }
  return best;
}
