import ICON_TABLE from './iconKeywords.json';
import { hasKey } from './suggestIcon';

/** Fixed fallback category. Not stored, cannot be renamed or deleted, always last. */
export const OTHER_ID = 'other';
export const OTHER_ICON = 'dots';

/** Default categories, in list order. Names come from i18n until the user renames one. */
export const DEFAULT_CATEGORIES = [
  { id: 'clean', key: 'clean', icon: 'brush' },
  { id: 'care', key: 'care', icon: 'scissors' },
  { id: 'pet', key: 'pet', icon: 'paw' },
  { id: 'plant', key: 'plant', icon: 'leaf' },
  { id: 'car', key: 'car', icon: 'car' },
  { id: 'health', key: 'health', icon: 'pill' },
  { id: 'appl', key: 'appl', icon: 'plug' },
];

/** iconKeywords icon → default category. */
const ICON_TO_CATEGORY = {
  brush: 'clean',
  bed: 'clean',
  drop: 'appl',
  scissors: 'care',
  eye: 'care',
  paw: 'pet',
  leaf: 'plant',
  car: 'car',
  pill: 'health',
};

/** iconKeywords rows that use a cleaning glyph but are personal care. */
const CARE_ROWS = new Set(['toothbrush', 'toothpaste', 'dental floss', 'mouthwash', 'razor']);

export function seedKeywords() {
  const out = Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c.id, []]));
  for (const row of ICON_TABLE) {
    const keys = (row.keys || []).map(String);
    const cat = CARE_ROWS.has(keys[0]) ? 'care' : ICON_TO_CATEGORY[row.icon];
    if (!cat) continue;
    for (const k of keys) if (!out[cat].includes(k)) out[cat].push(k);
  }
  return out;
}

export function seedCategories() {
  const kw = seedKeywords();
  return DEFAULT_CATEGORIES.map((c) => ({ id: c.id, key: c.key, name: null, icon: c.icon, keywords: kw[c.id] }));
}

export function normalizeKeywords(list) {
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const k = String(raw ?? '').trim().slice(0, 40);
    if (k && !out.some((x) => x.toLowerCase() === k.toLowerCase())) out.push(k);
  }
  return out.slice(0, 200);
}

export function normalizeCategory(raw) {
  if (!raw || typeof raw !== 'object' || !raw.id || raw.id === OTHER_ID) return null;
  return {
    id: String(raw.id),
    key: raw.key ? String(raw.key) : null,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 40) : null,
    icon: typeof raw.icon === 'string' ? raw.icon : 'mono',
    keywords: normalizeKeywords(raw.keywords),
  };
}

/**
 * Longest keyword wins. On equal length, the earlier category in list order wins.
 * Returns a category id, or OTHER_ID when nothing matches.
 */
export function matchCategory(title, categories) {
  const raw = String(title || '').trim();
  if (!raw) return OTHER_ID;
  let best = null;
  for (const c of categories || []) {
    for (const k of c.keywords || []) {
      if (best && k.length <= best.len) continue;
      if (hasKey(raw, k)) best = { id: c.id, len: k.length };
    }
  }
  return best ? best.id : OTHER_ID;
}

export function categoryExists(id, categories) {
  return id === OTHER_ID || (categories || []).some((c) => c.id === id);
}

/**
 * Load-time migration: seed categories once; classify items with no (or a stale) category.
 * Items that already have a valid category are never reclassified.
 */
export function migrateCategories(state) {
  const hadCategories = Array.isArray(state?.categories);
  const categories = hadCategories
    ? state.categories.map(normalizeCategory).filter(Boolean)
    : seedCategories();
  const activities = (state?.activities || []).map((a) => {
    if (!a || typeof a !== 'object') return a;
    if (a.categoryId && categoryExists(a.categoryId, categories)) return a;
    return { ...a, categoryId: matchCategory(a.title, categories) };
  });
  return { ...state, categories, activities };
}

export function newCategoryId() {
  return `cat_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;
}

/** Display name: user name, else the localized default. */
export function categoryName(cat, t) {
  if (!cat || cat.id === OTHER_ID) return t('category.other');
  return cat.name || (cat.key ? t(`category.defaults.${cat.key}`) : '');
}

/** Home list filter. 'all' keeps everything; items with no category count as Other. */
export function filterByCategory(items, filter) {
  if (!filter || filter === 'all') return items;
  return items.filter((a) => (a.categoryId || OTHER_ID) === filter);
}
