import fs from 'fs';
import path from 'path';
import {
  OTHER_ID, seedCategories, seedKeywords, matchCategory, migrateCategories, normalizeKeywords, categoryName, filterByCategory,
} from '../src/lib/categories';
import * as repo from '../src/data/repository';
import { STATE_KEY } from '../src/data/storage';
import { sfSymbolForIcon } from '../src/data/appGroup';
import { ICON_KINDS } from '../src/data/models';
import { activitySchema } from '../src/data/schema';
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
  it('seeds 7 defaults with keywords from iconKeywords', () => {
    const cats = seedCategories();
    expect(cats.map((c) => c.id)).toEqual(['clean', 'care', 'pet', 'plant', 'car', 'health', 'appl']);
    const kw = seedKeywords();
    expect(kw.pet).toContain('貓砂');
    expect(kw.plant).toContain('澆花');
    expect(kw.care).toContain('牙刷');
    expect(kw.clean).not.toContain('牙刷');
    expect(kw.appl).toContain('濾水器');
    expect(cats.find((c) => c.id === 'appl').icon).toBe('plug');
  });
  it('names follow the system language until renamed', () => {
    const t = (k) => k.split('.').reduce((o, p) => o?.[p], zh);
    const pet = seedCategories().find((c) => c.id === 'pet');
    expect(categoryName(pet, t)).toBe(zh.category.defaults.pet);
    expect(categoryName({ ...pet, name: 'Cats' }, t)).toBe('Cats');
    expect(categoryName({ id: OTHER_ID }, t)).toBe(zh.category.other);
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
});

describe('migration', () => {
  it('seeds categories and classifies existing items, falling back to Other', () => {
    const out = migrateCategories({ version: 1, activities: [row('1', '換貓砂'), row('2', '報稅'), row('3', '澆花')] });
    expect(out.categories).toHaveLength(7);
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
    expect(saved.activities[0].categoryId).toBe('pet');
    for (const a of saved.activities) expect(() => activitySchema.parse(a)).not.toThrow();
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
    expect(await repo.deleteCategory(OTHER_ID)).toBe(0);
  });
  it('category code has no Pro gate', () => {
    const src = read('../src/data/repository.js');
    const body = src.slice(src.indexOf('// ---- Categories'));
    expect(body).not.toMatch(/isProUnlocked|FREE_LIMIT/);
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

describe('icons and widgets', () => {
  it('plug and dots are glyphs with SF Symbol fallbacks', () => {
    expect(ICON_KINDS).toEqual(expect.arrayContaining(['plug', 'dots']));
    const glyph = read('../src/components/ItemGlyph.js');
    expect(glyph).toMatch(/kind === 'plug'/);
    expect(glyph).toMatch(/kind === 'dots'/);
    expect(sfSymbolForIcon('plug')).toBe('powerplug');
    expect(sfSymbolForIcon('dots')).toBe('ellipsis');
  });
  it('widgets do not filter by category', () => {
    expect(read('../src/widgets/pick.js')).not.toMatch(/categoryId/);
  });
});

describe('strings', () => {
  it('category keys exist in en / zh-Hant / ja', () => {
    for (const l of [en, zh, ja]) {
      for (const k of ['title', 'all', 'other', 'newCategory', 'name', 'keywords', 'deleteMoved', 'auto']) expect(l.category[k]).toBeTruthy();
      for (const k of ['clean', 'care', 'pet', 'plant', 'car', 'health', 'appl']) expect(l.category.defaults[k]).toBeTruthy();
    }
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
