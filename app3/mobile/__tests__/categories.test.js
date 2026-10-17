import fs from 'fs';
import path from 'path';
import {
  OTHER_ID, OTHER_ICON, MAX_CATEGORIES, CATEGORIES_STATE_VERSION, DEFAULT_KEYWORDS, seedCategories, seedKeywords, matchCategory,
  migrateCategories, normalizeCategory, normalizeKeywords, categoryName, filterByCategory, keywordsForLocale, iconForItem,
} from '../src/lib/categories';
import * as repo from '../src/data/repository';
import { STATE_KEY } from '../src/data/storage';
import { ICON_KINDS } from '../src/data/models';
import { activitySchema, categorySchema } from '../src/data/schema';
import { chipList } from '../src/components/CategoryChips';
import en from '../languages/en.json';
import zh from '../languages/zh-Hant.json';
import ja from '../languages/ja.json';

const read = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8');
const ts = '2026-10-01T00:00:00.000Z';
const row = (id, title, extra = {}) => ({
  id, title, icon: 'brush', notes: '', history: [], lastDoneAt: null, reminderDays: null,
  reminderTime: '09:00', snoozeEnabled: true, createdAt: ts, updatedAt: ts, deletedAt: null, ...extra,
});

describe('default categories', () => {
  it('seeds 7 defaults from explicit per-locale lists, not from icons', () => {
    const cats = seedCategories();
    expect(cats.map((c) => c.id)).toEqual(['clean', 'care', 'pet', 'plant', 'car', 'health', 'appl']);
    const src = read('../src/lib/categories.js');
    expect(src).not.toMatch(/ICON_TO_CATEGORY|iconKeywords/);
    const kw = seedKeywords();
    expect(kw.pet).toContain('貓砂');
    expect(kw.plant).toContain('澆花');
    expect(kw.care).toContain('牙刷');
    expect(kw.clean).not.toContain('牙刷');
    expect(kw.clean).toContain('倒垃圾');
    expect(kw.appl).not.toContain('倒垃圾');
    expect(kw.appl).toContain('濾水器');
    expect(cats.find((c) => c.id === 'appl').icon).toBe('plug');
    for (const id of cats.map((c) => c.id)) {
      for (const loc of ['en', 'zh-Hant', 'ja']) {
        expect(DEFAULT_KEYWORDS[id][loc].length).toBeGreaterThan(0);
      }
    }
  });
  it('names follow the system language until renamed', () => {
    const t = (k) => k.split('.').reduce((o, p) => o?.[p], zh);
    const pet = seedCategories().find((c) => c.id === 'pet');
    expect(categoryName(pet, t)).toBe(zh.category.defaults.pet);
    expect(categoryName({ ...pet, name: 'Cats' }, t)).toBe('Cats');
    expect(categoryName({ id: OTHER_ID }, t)).toBe(zh.category.other);
  });
  it('does not put the same keyword in two defaults', () => {
    const seen = new Map();
    for (const [id, table] of Object.entries(DEFAULT_KEYWORDS)) {
      for (const loc of Object.keys(table)) {
        for (const k of table[loc]) {
          const fold = k.toLowerCase();
          expect(seen.has(fold) ? seen.get(fold) : id).toBe(id);
          seen.set(fold, id);
        }
      }
    }
  });
});

describe('matching', () => {
  const cats = [
    { id: 'a', keywords: ['cat', '貓'] },
    { id: 'b', keywords: ['dog', '貓'] },
    { id: 'c', keywords: ['貓砂'] },
  ];
  it('longest keyword wins', () => {
    expect(matchCategory('換貓砂', cats)).toBe('c');
  });
  it('equal length: earlier category wins', () => {
    expect(matchCategory('餵貓', cats)).toBe('a');
    expect(matchCategory('餵貓', [cats[1], cats[0]])).toBe('b');
  });
  it('no match falls back to Other; latin keys need word boundaries', () => {
    expect(matchCategory('報稅', cats)).toBe(OTHER_ID);
    expect(matchCategory('', cats)).toBe(OTHER_ID);
    expect(matchCategory('catalog', cats)).toBe(OTHER_ID);
    expect(matchCategory('feed the cat', cats)).toBe('a');
  });
  it('normalizes keywords (trim, dedupe case-insensitively)', () => {
    expect(normalizeKeywords([' Cat ', 'cat', '', '貓'])).toEqual(['Cat', '貓']);
  });
  it('classifies representative titles from the explicit defaults', () => {
    const cats = seedCategories();
    expect(matchCategory('倒垃圾', cats)).toBe('clean');
    expect(matchCategory('take out trash', cats)).toBe('clean');
    expect(matchCategory('ゴミ出し', cats)).toBe('clean');
    expect(matchCategory('toothbrush', cats)).toBe('care');
    expect(matchCategory('litter box', cats)).toBe('pet');
    expect(matchCategory('watering plants', cats)).toBe('plant');
    expect(matchCategory('filter', cats)).toBe('appl');
    expect(matchCategory('cabin filter', cats)).toBe('car');
  });
});

describe('migration', () => {
  it('seeds categories and classifies existing items, falling back to Other', () => {
    const out = migrateCategories({ version: 1, activities: [row('1', '換貓砂'), row('2', '報稅'), row('3', '澆花')] });
    expect(out.categories).toHaveLength(7);
    expect(out.version).toBe(CATEGORIES_STATE_VERSION);
    expect(out.activities.map((a) => a.categoryId)).toEqual(['pet', OTHER_ID, 'plant']);
  });
  it('keeps valid categories, re-homes stale ids, never reseeds', () => {
    const cats = [{ id: 'mine', name: 'Mine', icon: 'mono', keywords: ['tax'] }];
    const out = migrateCategories({
      categories: cats,
      activities: [row('1', '換貓砂', { categoryId: 'mine' }), row('2', 'tax', { categoryId: 'gone' }), row('3', 'x')],
    });
    expect(out.categories.map((c) => c.id)).toEqual(['mine']);
    expect(out.activities.map((a) => a.categoryId)).toEqual(['mine', 'mine', OTHER_ID]);
  });
  it('runs on launch from storage and persists', async () => {
    await repo.repositoryStorageForTests.setItem(STATE_KEY, JSON.stringify({ version: 1, activities: [row('1', '換貓砂'), row('2', '報稅')] }));
    await repo.reloadRepositoryForTests();
    const list = repo.getVisibleActivities();
    expect(list.map((a) => a.categoryId)).toEqual(['pet', OTHER_ID]);
    expect(repo.getCategories()).toHaveLength(7);
    const saved = JSON.parse(await repo.repositoryStorageForTests.getItem(STATE_KEY));
    expect(saved.categories).toHaveLength(7);
    expect(saved.version).toBe(CATEGORIES_STATE_VERSION);
    expect(saved.activities[0].categoryId).toBe('pet');
    for (const a of saved.activities) expect(() => activitySchema.parse(a)).not.toThrow();
    for (const c of saved.categories) expect(() => categorySchema.parse(c)).not.toThrow();
  });
  it('does not rewrite stored v2 keywords or reclassify valid ids', () => {
    const cats = [{ id: 'appl', key: 'appl', name: null, icon: 'plug', keywords: ['倒垃圾', '濾水器'] }];
    const out = migrateCategories({
      version: 2,
      categories: cats,
      activities: [row('1', '倒垃圾', { categoryId: 'appl' })],
    });
    expect(out.categories[0].keywords).toEqual(['倒垃圾', '濾水器']);
    expect(out.activities[0].categoryId).toBe('appl');
    expect(out.version).toBe(3);
    expect(out.activities[0].icon).toBe('plug');
  });
  it('v3 sets each item icon from its category and never drops history', () => {
    const hist = [{ at: '2026-01-01T00:00:00.000Z' }, { at: '2025-12-01T00:00:00.000Z' }];
    const out = migrateCategories({
      version: 2,
      categories: seedCategories(),
      activities: [
        row('1', '換貓砂', { categoryId: 'pet', icon: 'brush', notes: 'keep', history: hist, lastDoneAt: hist[0].at }),
        row('2', '報稅', { categoryId: OTHER_ID, icon: 'leaf' }),
        row('3', 'x', { icon: 'car' }),
      ],
    });
    expect(out.version).toBe(CATEGORIES_STATE_VERSION);
    expect(CATEGORIES_STATE_VERSION).toBe(3);
    expect(out.activities[0].icon).toBe('paw');
    expect(out.activities[0].notes).toBe('keep');
    expect(out.activities[0].history).toHaveLength(2);
    expect(out.activities[0].history[0].at).toBe('2026-01-01T00:00:00.000Z');
    expect(out.activities[1].icon).toBe(OTHER_ICON);
    expect(out.activities[2].categoryId).toBe(OTHER_ID);
    expect(out.activities[2].icon).toBe(OTHER_ICON);
  });
  it('iconForItem uses the default when there is no category or no icon', () => {
    expect(iconForItem({}, [])).toBe('brush');
    expect(iconForItem({ categoryId: 'gone' }, [])).toBe('brush');
    expect(iconForItem({ categoryId: 'mine' }, [{ id: 'mine', icon: null }])).toBe('brush');
    expect(iconForItem({ categoryId: 'pet' }, seedCategories())).toBe('paw');
    expect(iconForItem({ categoryId: OTHER_ID }, [])).toBe(OTHER_ICON);
  });
  it('filters invalid categories out of storage', async () => {
    expect(normalizeCategory(null)).toBeNull();
    expect(normalizeCategory({ name: 'noid', icon: 'mono', keywords: [] })).toBeNull();
    expect(normalizeCategory({ id: OTHER_ID, name: 'Nope', icon: 'dots', keywords: [] })).toBeNull();
    await repo.repositoryStorageForTests.setItem(STATE_KEY, JSON.stringify({
      version: 2,
      categories: [
        { id: 'keep', name: 'Keep', icon: 'paw', keywords: ['ok'] },
        { id: OTHER_ID, name: 'Nope', icon: 'dots', keywords: [] },
        { name: 'noid', icon: 'mono', keywords: [] },
        null,
        'bad',
      ],
      activities: [row('1', 'x', { categoryId: 'gone' }), row('2', 'y', { categoryId: 'keep' })],
    }));
    await repo.reloadRepositoryForTests();
    expect(repo.getCategories().map((c) => c.id)).toEqual(['keep']);
    expect(repo.getVisibleActivities().map((a) => a.categoryId)).toEqual([OTHER_ID, 'keep']);
    for (const c of repo.getCategories()) expect(() => categorySchema.parse(c)).not.toThrow();
  });
});

describe('repository categories (free)', () => {
  beforeEach(() => repo.resetRepositoryForTests());
  it('auto-classifies new items, or uses the chosen category', async () => {
    const a = await repo.addActivity({ title: '換貓砂' });
    expect(a.categoryId).toBe('pet');
    const b = await repo.addActivity({ title: '換貓砂', categoryId: 'plant' });
    expect(b.categoryId).toBe('plant');
    const c = await repo.addActivity({ title: 'x', categoryId: 'nope' });
    expect(c.categoryId).toBe(OTHER_ID);
  });
  it('keyword edits only affect items added afterwards', async () => {
    const a = await repo.addActivity({ title: '報稅' });
    expect(a.categoryId).toBe(OTHER_ID);
    const cat = await repo.addCategory({ name: '稅', icon: 'mono', keywords: ['報稅'] });
    await repo.updateCategory(cat.id, { keywords: ['報稅', '保險'] });
    expect(repo.getVisibleActivities().find((x) => x.id === a.id).categoryId).toBe(OTHER_ID);
    const b = await repo.addActivity({ title: '報稅' });
    expect(b.categoryId).toBe(cat.id);
  });
  it('new categories go last, so earlier defaults win ties', async () => {
    await repo.addCategory({ name: 'Mine', keywords: ['貓砂'] });
    expect((await repo.addActivity({ title: '換貓砂' })).categoryId).toBe('pet');
  });
  it('rename keeps id; delete moves items to Other', async () => {
    const a = await repo.addActivity({ title: '換貓砂' });
    await repo.updateCategory('pet', { name: 'Cats' });
    expect(repo.getCategories().find((c) => c.id === 'pet').name).toBe('Cats');
    const moved = await repo.deleteCategory('pet');
    expect(moved).toBe(1);
    expect(repo.getCategories().some((c) => c.id === 'pet')).toBe(false);
    expect(repo.getVisibleActivities().find((x) => x.id === a.id).categoryId).toBe(OTHER_ID);
    expect(repo.getVisibleActivities().find((x) => x.id === a.id).icon).toBe(OTHER_ICON);
    expect(await repo.deleteCategory(OTHER_ID)).toBe(0);
  });
  it('item icon follows the category, including after the category icon changes', async () => {
    const a = await repo.addActivity({ title: '換貓砂' });
    expect(a.icon).toBe('paw');
    await repo.updateCategory('pet', { icon: 'leaf' });
    expect(repo.getVisibleActivities().find((x) => x.id === a.id).icon).toBe('leaf');
    await repo.updateActivity(a.id, { categoryId: 'car', icon: 'brush' });
    expect(repo.getVisibleActivities().find((x) => x.id === a.id).icon).toBe('car');
    expect(repo.getVisibleActivities().find((x) => x.id === a.id).categoryId).toBe('car');
  });
  it('category code has no Pro gate', () => {
    const src = read('../src/data/repository.js');
    const body = src.slice(src.indexOf('// ---- Categories'));
    expect(body).not.toMatch(/isProUnlocked|FREE_LIMIT/);
  });
  it('rejects a 31st category', async () => {
    const n = MAX_CATEGORIES - repo.getCategories().length;
    for (let i = 0; i < n; i++) await repo.addCategory({ name: `Extra ${i}` });
    expect(repo.getCategories()).toHaveLength(MAX_CATEGORIES);
    await expect(repo.addCategory({ name: 'Nope' })).rejects.toHaveProperty('code', 'CATEGORY_LIMIT');
    expect(repo.getCategories()).toHaveLength(MAX_CATEGORIES);
  });
  it('rejects duplicate names, including Other in every locale', async () => {
    await expect(repo.addCategory({ name: ' pets ' })).rejects.toHaveProperty('code', 'CATEGORY_DUP');
    await expect(repo.addCategory({ name: '寵物' })).rejects.toHaveProperty('code', 'CATEGORY_DUP');
    await expect(repo.addCategory({ name: 'Other' })).rejects.toHaveProperty('code', 'CATEGORY_DUP');
    await expect(repo.addCategory({ name: '其他' })).rejects.toHaveProperty('code', 'CATEGORY_DUP');
    await expect(repo.addCategory({ name: 'その他' })).rejects.toHaveProperty('code', 'CATEGORY_DUP');
    const cat = await repo.addCategory({ name: 'Mine' });
    await expect(repo.addCategory({ name: 'mine' })).rejects.toHaveProperty('code', 'CATEGORY_DUP');
    await expect(repo.updateCategory(cat.id, { name: 'Cleaning' })).rejects.toHaveProperty('code', 'CATEGORY_DUP');
    await repo.updateCategory(cat.id, { name: 'Mine' });
    expect(repo.getCategories().find((c) => c.id === cat.id).name).toBe('Mine');
    const forty = 'n'.repeat(40);
    await repo.addCategory({ name: forty });
    await expect(repo.addCategory({ name: forty + 'Z' })).rejects.toHaveProperty('code', 'CATEGORY_DUP');
  });
  it('unknown icons fall back to mono', async () => {
    expect(normalizeCategory({ id: 'x', name: 'X', icon: 'evil' }).icon).toBe('mono');
    const cat = await repo.addCategory({ name: 'Zed', icon: 'not-an-icon' });
    expect(cat.icon).toBe('mono');
    expect(() => categorySchema.parse(cat)).not.toThrow();
    await repo.updateCategory(cat.id, { icon: 'javascript:alert(1)' });
    expect(repo.getCategories().find((c) => c.id === cat.id).icon).toBe('mono');
    await repo.updateCategory(cat.id, { icon: 'paw' });
    expect(repo.getCategories().find((c) => c.id === cat.id).icon).toBe('paw');
  });
  it('edit screen shows a short error on limit and duplicate', () => {
    const src = read('../src/screens/CategoryEditScreen.js');
    expect(src).toMatch(/CATEGORY_LIMIT/);
    expect(src).toMatch(/CATEGORY_DUP/);
    expect(src).toMatch(/category\.limit/);
    expect(src).toMatch(/category\.duplicate/);
  });
  it('edit screen uses a dashed add-keyword chip that becomes an input', () => {
    const src = read('../src/screens/CategoryEditScreen.js');
    expect(src).toMatch(/keywordsForLocale/);
    expect(src).toMatch(/category\.addKeyword/);
    expect(src).toMatch(/testID="cat-kw-add"/);
    expect(src).toMatch(/borderStyle: 'dashed'/);
    expect(src).not.toMatch(/placeholder="\+"/);
  });
});

describe('keyword locale filter', () => {
  it('shows only the current language on built-ins; matching still uses every language', () => {
    const cats = seedCategories();
    const clean = cats.find((c) => c.id === 'clean');
    expect(keywordsForLocale(clean.keywords, { key: 'clean', locale: 'en' })).toEqual(
      expect.arrayContaining(['take out trash', 'trash']),
    );
    expect(keywordsForLocale(clean.keywords, { key: 'clean', locale: 'en' })).not.toContain('倒垃圾');
    expect(keywordsForLocale(clean.keywords, { key: 'clean', locale: 'en' })).not.toContain('ゴミ出し');
    expect(keywordsForLocale(clean.keywords, { key: 'clean', locale: 'zh-Hant' })).toEqual(
      expect.arrayContaining(['倒垃圾', '垃圾']),
    );
    expect(keywordsForLocale(clean.keywords, { key: 'clean', locale: 'zh-Hant' })).not.toContain('take out trash');
    expect(keywordsForLocale(clean.keywords, { key: 'clean', locale: 'ja' })).toContain('ゴミ出し');
    expect(matchCategory('倒垃圾', cats)).toBe('clean');
    expect(matchCategory('take out trash', cats)).toBe('clean');
    expect(matchCategory('ゴミ出し', cats)).toBe('clean');
  });
  it('keeps user-added chips and shows every keyword on custom categories', () => {
    const seeded = seedKeywords().clean;
    const withExtra = [...seeded, 'custom'];
    expect(keywordsForLocale(withExtra, { key: 'clean', locale: 'en' })).toContain('custom');
    expect(keywordsForLocale(['foo', '倒垃圾'], {})).toEqual(['foo', '倒垃圾']);
    expect(keywordsForLocale(['foo', '倒垃圾'], { key: 'mine', locale: 'en' })).toEqual(['foo', '倒垃圾']);
  });
});

describe('home', () => {
  it('filters by category and hides empty chips', () => {
    const items = [{ id: '1', categoryId: 'pet' }, { id: '2' }, { id: '3', categoryId: 'plant' }];
    expect(filterByCategory(items, 'all')).toHaveLength(3);
    expect(filterByCategory(items, OTHER_ID).map((x) => x.id)).toEqual(['2']);
    const chips = chipList(seedCategories(), { pet: 2, other: 1 });
    expect(chips.map((c) => c.id)).toEqual(['pet', OTHER_ID]);
  });
  it('adding an item never switches the filter', () => {
    const home = read('../src/screens/HomeScreen.js');
    expect(home).toMatch(/useState\('all'\)/);
    expect(read('../src/screens/EditScreen.js')).not.toMatch(/setFilter|filter:/);
  });
});

describe('icons', () => {
  it('plug and dots are glyphs', () => {
    expect(ICON_KINDS).toEqual(expect.arrayContaining(['plug', 'dots']));
    const glyph = read('../src/components/ItemGlyph.js');
    expect(glyph).toMatch(/kind === 'plug'/);
    expect(glyph).toMatch(/kind === 'dots'/);
  });
});

describe('strings', () => {
  it('category keys exist in en / zh-Hant / ja', () => {
    for (const l of [en, zh, ja]) {
      for (const k of ['title', 'all', 'other', 'newCategory', 'name', 'keywords', 'addKeyword', 'deleteMoved', 'limit', 'duplicate', 'auto']) expect(l.category[k]).toBeTruthy();
      for (const k of ['clean', 'care', 'pet', 'plant', 'car', 'health', 'appl']) expect(l.category.defaults[k]).toBeTruthy();
    }
    expect(en.category.addKeyword).toBe('+ Keyword');
    expect(zh.category.addKeyword).toBe('＋ 關鍵字');
    expect(ja.category.addKeyword).toBe('＋ キーワード');
  });
  it('zh-Hant uses natural category wording', () => {
    expect(zh.category.title).toBe('類型');
    expect(zh.category.all).toBe('全部');
    expect(zh.category.other).toBe('其他');
    expect(zh.category.newCategory).toBe('新類型');
    expect(zh.category.keywords).toBe('關鍵字');
    expect(zh.category.deleteMoved).toBe('{n} 件到其他');
    expect(zh.category.defaults).toEqual({
      clean: '清潔',
      care: '個人保養',
      pet: '寵物',
      plant: '植物',
      car: '車',
      health: '健康',
      appl: '家電',
    });
  });
});
