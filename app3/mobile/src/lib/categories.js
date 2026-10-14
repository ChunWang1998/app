import DEFAULT_KEYWORDS from './categoryKeywords.json';
import { hasKey } from './suggestIcon';
import { ICON_KINDS } from '../data/models';
import { categorySchema } from '../data/schema';
import { resolveLocale } from '../i18n';
import en from '../../languages/en.json';
import zhHant from '../../languages/zh-Hant.json';
import ja from '../../languages/ja.json';

/** Fixed fallback category. Not stored, cannot be renamed or deleted, always last. */
export const OTHER_ID = 'other';
export const OTHER_ICON = 'dots';
export const MAX_CATEGORIES = 30;
/** Persist marker after the categories migration. */
export const CATEGORIES_STATE_VERSION = 2;

const LOCALES = [en, zhHant, ja];

function foldName(s) {
  return String(s || '').trim().slice(0, 40).toLowerCase();
}

export function normalizeCategoryIcon(icon) {
  return ICON_KINDS.includes(icon) ? icon : 'mono';
}

/** True if `name` collides with another category or Other, in any locale. */
export function categoryNameTaken(name, categories, { exceptId } = {}) {
  const n = foldName(name);
  if (!n) return false;
  for (const loc of LOCALES) {
    if (foldName(loc.category.other) === n) return true;
  }
  for (const c of categories || []) {
    if (exceptId && c.id === exceptId) continue;
    if (c.name != null && foldName(c.name) === n) return true;
    if (!c.name && c.key) {
      for (const loc of LOCALES) {
        const d = loc.category.defaults?.[c.key];
        if (d && foldName(d) === n) return true;
      }
    }
  }
  return false;
}

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

export { DEFAULT_KEYWORDS };

const KEYWORD_LOCALES = ['en', 'zh-Hant', 'ja'];

/**
 * Defaults are an explicit per-locale keyword table, not derived from icons.
 * Item glyphs are suggested separately. Mapping the water-drop glyph to
 * appliances used to put trash titles in appliances because they share that
 * glyph with filters. Matching still uses every language (flattened lists).
 *
 * Existing installs already migrated to CATEGORIES_STATE_VERSION (2). Launch
 * migration never reseeds stored categories or reclassifies valid categoryIds,
 * so this table applies to new installs (and new items on those installs) only.
 */
export function seedKeywords() {
  const out = {};
  for (const c of DEFAULT_CATEGORIES) {
    const table = DEFAULT_KEYWORDS[c.id] || {};
    const all = [];
    for (const loc of KEYWORD_LOCALES) {
      for (const raw of table[loc] || []) {
        const k = String(raw);
        if (k && !all.some((x) => x.toLowerCase() === k.toLowerCase())) all.push(k);
      }
    }
    out[c.id] = all;
  }
  return out;
}

/**
 * Built-in edit screens show the current system language plus user-added chips.
 * Other-locale defaults stay in storage so matching still uses every language.
 * Custom categories (no default key) show the full list.
 */
export function keywordsForLocale(keywords, { key, locale } = {}) {
  const list = Array.isArray(keywords) ? keywords : [];
  const table = key ? DEFAULT_KEYWORDS[key] : null;
  if (!table) return list;
  const loc = resolveLocale(locale);
  const fold = (s) => String(s).toLowerCase();
  const current = new Set((table[loc] || []).map(fold));
  const other = new Set();
  for (const [lang, keys] of Object.entries(table)) {
    if (lang === loc) continue;
    for (const k of keys || []) other.add(fold(k));
  }
  return list.filter((k) => current.has(fold(k)) || !other.has(fold(k)));
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
  const candidate = {
    id: String(raw.id).slice(0, 64),
    key: raw.key ? String(raw.key).slice(0, 64) : null,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 40) : null,
    icon: normalizeCategoryIcon(raw.icon),
    keywords: normalizeKeywords(raw.keywords),
  };
  const parsed = categorySchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
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
 * If `state.categories` is already an array (v2 installs), keywords are only
 * normalized — default keyword fixes do not rewrite stored lists.
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
  return { ...state, version: CATEGORIES_STATE_VERSION, categories, activities };
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
