import { setLocale } from '../src/i18n';
import { parseRules } from '../src/lib/ai/ruleParser';
import { parseIntent } from '../src/lib/ai/parseIntent';
import { __setNativeForTests } from '../src/lib/ai/foundationModels';
import { fuzzyMatchItem } from '../src/lib/ai/matchItem';
import { draftFromCreate, itemsDueThisWeek, sinceCopy, formatNextShort } from '../src/lib/ai/apply';
import { seedCategories } from '../src/lib/categories';
import {
  resetRepositoryForTests,
  addActivity,
  addCategory,
  getVisibleActivities,
  logActivityNow,
  FREE_ACTIVITY_LIMIT,
} from '../src/data/repository';
import * as ent from '../src/lib/entitlements';
import fs from 'fs';
import path from 'path';

const NOW = new Date(2026, 9, 17, 15, 0, 0);

function parse(text, locale) {
  setLocale(locale);
  return parseRules(text, { locale, now: NOW });
}

describe('rule parser zh-Hant', () => {
  beforeEach(() => setLocale('zh-Hant'));

  const creates = [
    '每兩週換濾心，上次是昨天',
    '每2週換濾心 上次是昨天',
    '記一下換濾心，每兩週',
    '新增每天吃維他命',
    '每月洗車',
    '每三個月換牙刷',
    '每週倒垃圾',
  ];
  it.each(creates)('creates from %# %s', (text) => {
    const r = parse(text, 'zh-Hant');
    expect(r.type).toBe('create');
    expect(r.name.length).toBeGreaterThan(0);
  });

  it('parses filter create with last-done and reminder', () => {
    const r = parse('每兩週換濾心，上次是昨天', 'zh-Hant');
    expect(r.name).toMatch(/濾心/);
    expect(r.reminderDays).toBe(14);
    expect(r.lastDoneDaysAgo).toBe(1);
    expect(new Date(r.lastDoneAt).getDate()).toBe(16);
  });

  const since = [
    '我多久沒換床單了？',
    '多久沒換床單了',
    '換床單多久沒做了',
    '上次換床單是什麼時候',
  ];
  it.each(since)('query since %# %s', (text) => {
    expect(parse(text, 'zh-Hant').type).toBe('query_since');
    expect(parse(text, 'zh-Hant').name).toMatch(/床單/);
  });

  const weeks = ['這週要做什麼？', '這週有什麼', '本週要做', '這星期要做什麼'];
  it.each(weeks)('query week %# %s', (text) => {
    expect(parse(text, 'zh-Hant').type).toBe('query_week');
  });

  const logs = ['剛剛洗了車', '剛洗了車', '剛才澆花', '做完倒垃圾'];
  it.each(logs)('log %# %s', (text) => {
    const r = parse(text, 'zh-Hant');
    expect(r.type).toBe('log');
    expect(r.name.length).toBeGreaterThan(0);
  });
});

describe('rule parser en', () => {
  const creates = [
    'change the water filter every 2 weeks, last time was yesterday',
    'add take out trash every week',
    'wash sheets biweekly',
    'monthly car wash, last done a week ago',
    'replace toothbrush every 3 months',
    'water the plants every 3 days',
    'daily vitamin',
  ];
  it.each(creates)('creates from %# %s', (text) => {
    const r = parse(text, 'en');
    expect(r.type).toBe('create');
    expect(r.name.length).toBeGreaterThan(1);
  });

  it('parses filter create', () => {
    const r = parse('change the water filter every 2 weeks, last time was yesterday', 'en');
    expect(r.name.toLowerCase()).toMatch(/filter/);
    expect(r.reminderDays).toBe(14);
    expect(r.lastDoneDaysAgo).toBe(1);
  });

  const since = [
    'how long since I washed the sheets?',
    'how long have I gone without a haircut?',
    'when did I last wash the car?',
    'how many days since I watered the plants?',
  ];
  it.each(since)('query since %# %s', (text) => {
    expect(parse(text, 'en').type).toBe('query_since');
  });

  const weeks = [
    "what's due this week?",
    'what is due this week',
    "this week's tasks",
    'what should I do this week',
  ];
  it.each(weeks)('query week %# %s', (text) => {
    expect(parse(text, 'en').type).toBe('query_week');
  });

  const logs = ['just washed the car', 'I just watered the plants', 'just did the dishes', 'finished the laundry'];
  it.each(logs)('log %# %s', (text) => {
    expect(parse(text, 'en').type).toBe('log');
  });
});

describe('rule parser ja', () => {
  const creates = [
    '2週間ごとにフィルターを交換、前回は昨日',
    '毎週ゴミを出す',
    '毎月洗車',
    '3か月ごとに歯ブラシを交換',
    '毎日ビタミン',
  ];
  it.each(creates)('creates from %# %s', (text) => {
    expect(parse(text, 'ja').type).toBe('create');
  });

  it('parses filter create', () => {
    const r = parse('2週間ごとにフィルターを交換、前回は昨日', 'ja');
    expect(r.reminderDays).toBe(14);
    expect(r.lastDoneDaysAgo).toBe(1);
    expect(r.name.length).toBeGreaterThan(0);
  });

  const since = ['シーツを洗ってからどのくらい？', '最後に洗車したのはいつ', '散髪してどれくらい'];
  it.each(since)('query since %# %s', (text) => {
    expect(parse(text, 'ja').type).toBe('query_since');
  });

  const weeks = ['今週やることは？', '今週の予定', '今週は何'];
  it.each(weeks)('query week %# %s', (text) => {
    expect(parse(text, 'ja').type).toBe('query_week');
  });

  const logs = ['さっき車を洗った', '植木に水をやった', 'たった今ゴミを出した'];
  it.each(logs)('log %# %s', (text) => {
    expect(parse(text, 'ja').type).toBe('log');
  });
});

describe('fuzzy match', () => {
  const items = [
    { id: '1', title: '洗床單' },
    { id: '2', title: '洗車' },
    { id: '3', title: 'Wash sheets' },
    { id: '4', title: 'Wash the car' },
    { id: '5', title: 'シーツを洗う' },
  ];
  it('matches zh log/query names', () => {
    expect(fuzzyMatchItem('洗了車', items).id).toBe('2');
    expect(fuzzyMatchItem('換床單', items).id).toBe('1');
  });
  it('matches en', () => {
    expect(fuzzyMatchItem('washed the car', items).title).toMatch(/car/i);
    expect(fuzzyMatchItem('I washed the sheets', items).title).toMatch(/sheet/i);
  });
  it('matches ja', () => {
    expect(fuzzyMatchItem('車を洗った', items).id).toBe('2');
    expect(fuzzyMatchItem('シーツ', items).id).toBe('5');
  });
});

describe('create draft uses category keywords', () => {
  it('guesses appliances for a filter', () => {
    const d = draftFromCreate({ name: '換濾心', reminderDays: 14, lastDoneAt: NOW.toISOString() }, { categories: seedCategories() });
    expect(d.categoryId).toBe('appl');
    expect(d.icon).toBe('drop');
  });
});

describe('foundation models fallback', () => {
  afterEach(() => __setNativeForTests(undefined));

  it('uses rules when native is missing', async () => {
    __setNativeForTests(null);
    const r = await parseIntent("what's due this week?", { locale: 'en', now: NOW });
    expect(r.type).toBe('query_week');
    expect(r.source).toBe('rules');
  });

  it('uses FM when it returns a structured intent, and still computes dates in JS', async () => {
    __setNativeForTests({
      parseIntent: async () => ({
        ok: true,
        kind: 'create',
        name: 'water filter',
        lastDonePhrase: 'yesterday',
        reminderPhrase: 'every 2 weeks',
      }),
    });
    const r = await parseIntent('ignore this', { locale: 'en', now: NOW });
    expect(r.source).toBe('fm');
    expect(r.type).toBe('create');
    expect(r.reminderDays).toBe(14);
    expect(r.lastDoneDaysAgo).toBe(1);
  });

  it('falls back on guardrail / context / unavailable', async () => {
    __setNativeForTests({ parseIntent: async () => ({ ok: false, reason: 'guardrail' }) });
    const r = await parseIntent('just washed the car', { locale: 'en', now: NOW });
    expect(r.source).toBe('rules');
    expect(r.type).toBe('log');
  });
});

describe('since copy stays short', () => {
  it('uses today when the next due is overdue', () => {
    setLocale('zh-Hant');
    const item = {
      title: '洗床單',
      lastDoneAt: new Date(2026, 9, 8, 15, 0, 0).toISOString(),
      reminderDays: 7,
    };
    const text = sinceCopy(item, NOW.getTime(), 'zh-Hant');
    expect(text).toMatch(/天/);
    expect(text).toMatch(/今天/);
    expect(text).not.toMatch(/逾期/);
    expect(formatNextShort(item, NOW.getTime(), 'zh-Hant').text).toBe('今天');
  });
});

describe('week list uses reminder due dates', () => {
  it('includes overdue and due-by-Sunday items', async () => {
    await resetRepositoryForTests();
    const overdue = await addActivity({ title: 'A', reminderDays: 7, lastDoneAt: new Date(2026, 8, 1).toISOString() });
    const later = await addActivity({ title: 'B', reminderDays: 90, lastDoneAt: NOW.toISOString() });
    const list = itemsDueThisWeek([overdue, later], NOW.getTime());
    expect(list.map((x) => x.title)).toContain('A');
    expect(list.map((x) => x.title)).not.toContain('B');
  });
});

describe('repository write queue and free limit', () => {
  afterEach(() => jest.restoreAllMocks());

  it('serializes concurrent item and category creates', async () => {
    await resetRepositoryForTests();
    jest.spyOn(ent, 'isProUnlocked').mockResolvedValue(true);
    await Promise.all([
      addActivity({ title: 'One' }),
      addActivity({ title: 'Two' }),
      addCategory({ name: 'QueueCat', icon: 'brush' }),
    ]);
    expect(getVisibleActivities()).toHaveLength(2);
  });

  it('create via addActivity still hits the free cap', async () => {
    await resetRepositoryForTests();
    jest.spyOn(ent, 'isProUnlocked').mockResolvedValue(false);
    for (let i = 0; i < FREE_ACTIVITY_LIMIT; i++) await addActivity({ title: `N${i}` });
    await expect(addActivity({ title: 'overflow' })).rejects.toHaveProperty('code', 'FREE_LIMIT');
  });

  it('log goes through logActivityAt so undo works', async () => {
    await resetRepositoryForTests();
    const a = await addActivity({ title: 'Car', lastDoneAt: '2026-09-01T00:00:00.000Z' });
    const logged = await logActivityNow(a.id);
    expect(logged.previousHistory).toHaveLength(1);
    expect(getVisibleActivities()[0].history.length).toBe(2);
  });
});

describe('ai source contracts', () => {
  const read = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8');

  it('keeps conversation in memory on AiChatScreen', () => {
    const src = read('../src/screens/AiChatScreen.js');
    expect(src).toMatch(/useState\(\[\]\)/);
    expect(src).not.toMatch(/AsyncStorage/);
    expect(src).toMatch(/setMsgs\(\[\]\)/);
  });

  it('home keeps manual add and adds a composer', () => {
    const home = read('../src/screens/HomeScreen.js');
    expect(home).toMatch(/handleAdd/);
    expect(home).toMatch(/AiComposer/);
    expect(home).toMatch(/navigate\('AiChat'/);
  });

  it('does not touch IAP or reminderSchedule', () => {
    const iap = read('../src/lib/iap.js');
    expect(iap).toMatch(/expo-iap/);
    const swift = read('../modules/apple-foundation-models/ios/AppleFoundationModelsModule.swift');
    expect(swift).toMatch(/if #available\(iOS 26/);
    expect(swift).toMatch(/SystemLanguageModel\.default/);
    expect(swift).toMatch(/supportsLocale/);
    expect(swift).toMatch(/availability/);
    expect(swift).not.toMatch(/PrivateCloudComputeLanguageModel/);
  });

  it('speech prefers on-device recognition', () => {
    const src = read('../src/lib/ai/speech.js');
    expect(src).toMatch(/requiresOnDeviceRecognition/);
    expect(src).toMatch(/supportsOnDeviceRecognition/);
  });
});
