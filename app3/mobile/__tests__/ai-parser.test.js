import { setLocale } from '../src/i18n';
import { parseRules } from '../src/lib/ai/ruleParser';
import { parseIntent } from '../src/lib/ai/parseIntent';
import { __setNativeForTests } from '../src/lib/ai/foundationModels';
import { fuzzyMatchItem } from '../src/lib/ai/matchItem';
import { hydrateIntent } from '../src/lib/ai/ruleParser';
import { draftFromCreate, cardFromCreateIntent, itemsDueThisWeek, sinceCopy, formatNextShort } from '../src/lib/ai/apply';
import { seedCategories } from '../src/lib/categories';
import {
  resetRepositoryForTests,
  addActivity,
  addCategory,
  updateActivity,
  getVisibleActivities,
  logActivityNow,
  logActivityOnDay,
  FREE_ACTIVITY_LIMIT,
  FREE_HISTORY_LIMIT,
} from '../src/data/repository';
import * as ent from '../src/lib/entitlements';
import { sameLocalDay } from '../src/lib/today';
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

describe('rule parser de', () => {
  const creates = [
    'Filter alle 2 Wochen wechseln, letztes Mal gestern',
    'Müll rausbringen jede Woche',
    'Autowäsche monatlich, letztes Mal vor einer Woche',
    'Zahnbürste alle 3 Monate',
    'Pflanzen alle 3 Tage gießen',
    'täglich Vitamin',
    'füge hinzu Bettwäsche alle 2 Wochen',
  ];
  it.each(creates)('creates from %# %s', (text) => {
    const r = parse(text, 'de');
    expect(r.type).toBe('create');
    expect(r.name.length).toBeGreaterThan(0);
  });

  it('parses filter create with last-done and reminder', () => {
    const r = parse('Filter alle 2 Wochen wechseln, letztes Mal gestern', 'de');
    expect(r.name.toLowerCase()).toMatch(/filter/);
    expect(r.reminderDays).toBe(14);
    expect(r.lastDoneDaysAgo).toBe(1);
  });

  const since = [
    'Wie lange her, dass ich die Bettwäsche gewaschen habe?',
    'Wie lange ist es her, dass ich die Bettwäsche gewaschen habe?',
    'Wann habe ich zuletzt die Bettwäsche gewaschen?',
    'Seit wann habe ich die Bettwäsche nicht mehr gewaschen?',
    'Wie lange her, Bettwäsche?',
  ];
  it.each(since)('query since %# %s', (text) => {
    const r = parse(text, 'de');
    expect(r.type).toBe('query_since');
    expect(r.name.toLowerCase()).toMatch(/bettwäsche|bettwasche/);
  });

  const weeks = [
    'Was steht diese Woche an?',
    'Was soll ich diese Woche tun?',
    'Was ist diese Woche fällig?',
    'Plan für diese Woche',
  ];
  it.each(weeks)('query week %# %s', (text) => {
    expect(parse(text, 'de').type).toBe('query_week');
  });

  const logs = [
    'Gerade das Auto gewaschen',
    'Ich habe gerade die Pflanzen gegossen',
    'Eben den Müll rausgebracht',
    'Soeben abgespült',
  ];
  it.each(logs)('log %# %s', (text) => {
    const r = parse(text, 'de');
    expect(r.type).toBe('log');
    expect(r.name.length).toBeGreaterThan(0);
  });
});

describe('rule parser fr', () => {
  const creates = [
    'Changer le filtre toutes les 2 semaines, dernière fois hier',
    'Sortir les poubelles chaque semaine',
    'Lavage auto mensuel, dernière fois il y a une semaine',
    'Brosse à dents tous les 3 mois',
    'Arroser les plantes tous les 3 jours',
    'vitamine quotidienne',
    'ajoute laver les draps toutes les 2 semaines',
  ];
  it.each(creates)('creates from %# %s', (text) => {
    const r = parse(text, 'fr');
    expect(r.type).toBe('create');
    expect(r.name.length).toBeGreaterThan(0);
  });

  it('parses filter create with last-done and reminder', () => {
    const r = parse('Changer le filtre toutes les 2 semaines, dernière fois hier', 'fr');
    expect(r.name.toLowerCase()).toMatch(/filtre/);
    expect(r.reminderDays).toBe(14);
    expect(r.lastDoneDaysAgo).toBe(1);
  });

  const since = [
    "Ça fait combien que j'ai lavé les draps ?",
    'Ça fait combien de temps que j’ai lavé les draps ?',
    "Quand j'ai lavé les draps pour la dernière fois ?",
    'Depuis quand les draps ?',
    "Combien de jours depuis que j'ai lavé les draps ?",
  ];
  it.each(since)('query since %# %s', (text) => {
    const r = parse(text, 'fr');
    expect(r.type).toBe('query_since');
    expect(r.name.toLowerCase()).toMatch(/drap/);
  });

  const weeks = [
    'Quoi cette semaine ?',
    "Qu'est-ce qu'il y a cette semaine",
    'Quoi faire cette semaine',
    'Prévoir cette semaine',
  ];
  it.each(weeks)('query week %# %s', (text) => {
    expect(parse(text, 'fr').type).toBe('query_week');
  });

  const logs = [
    'Je viens de laver la voiture',
    "Je viens d'arroser les plantes",
    'Viens de faire la vaisselle',
    'Je viens juste de sortir les poubelles',
  ];
  it.each(logs)('log %# %s', (text) => {
    const r = parse(text, 'fr');
    expect(r.type).toBe('log');
    expect(r.name.length).toBeGreaterThan(0);
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
    expect(d.icon).toBeUndefined();
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

  it('does not treat FM future plans as done today, even if kind is log', async () => {
    __setNativeForTests({
      parseIntent: async () => ({
        ok: true,
        kind: 'log',
        name: 'gym',
        lastDonePhrase: 'tomorrow',
        reminderPhrase: '',
      }),
    });
    const r = await parseIntent('I will go to the gym tomorrow', { locale: 'en', now: NOW });
    expect(r.source).toBe('fm');
    expect(r.type).toBe('create');
    expect(r.future).toBe(true);
    expect(r.lastDoneAt).toBeNull();
    expect(r.lastDoneDaysAgo).toBeNull();
    expect(r.reminderDays).toBeNull();
  });
});

describe('future plans are not logged as today', () => {
  const rows = [
    { locale: 'zh-Hant', text: '明天要去重訓', name: /重訓/ },
    { locale: 'zh-Hant', text: '下週要重訓', name: /重訓/ },
    { locale: 'zh-Hant', text: '打算重訓', name: /重訓/ },
    { locale: 'en', text: 'I will go to the gym tomorrow', name: /gym/i },
    { locale: 'en', text: 'going to the gym tomorrow', name: /gym/i },
    { locale: 'ja', text: '明日筋トレする', name: /筋トレ/ },
    { locale: 'de', text: 'Ich werde morgen trainieren', name: /trainieren/i },
    { locale: 'fr', text: 'Je vais à la gym demain', name: /gym/i },
  ];

  it.each(rows)('$locale $text', ({ locale, text, name }) => {
    const r = parse(text, locale);
    expect(r.type).toBe('create');
    expect(r.future).toBe(true);
    expect(r.name).toMatch(name);
    expect(r.lastDoneAt).toBeNull();
    expect(r.lastDoneDaysAgo).toBeNull();
    expect(r.reminderDays).toBeNull();
  });

  it('still treats cadence creates as done today', () => {
    const r = parse('每週倒垃圾', 'zh-Hant');
    expect(r.type).toBe('create');
    expect(r.future).toBeUndefined();
    expect(r.lastDoneDaysAgo).toBe(0);
    expect(r.reminderDays).toBe(7);
  });

  it('does not treat I will without a time word as a future plan', () => {
    const r = parse('I will go jogging', 'en');
    expect(r.future).toBeUndefined();
    expect(r.lastDoneAt == null).toBe(false);
  });

  it('does not treat ich will joggen as a future plan', () => {
    const r = parse('ich will joggen', 'de');
    expect(r.future).toBeUndefined();
    expect(r.lastDoneAt == null).toBe(false);
  });

  it('keeps will + time-word as future, without a bare will / ich will matcher', () => {
    const phrases = require('../src/lib/ai/phrases.json');
    expect(phrases.futureIntent.en).not.toContain('\\bwill\\b');
    expect(phrases.futureIntent.en).not.toContain('\\bi will\\b');
    expect(phrases.futureIntent.de).not.toContain('\\bich will\\b');
    expect(phrases.futureIntent.en.some((p) => p.includes('will') && p.includes('tomorrow'))).toBe(true);
    const r = parse('I will go to the gym tomorrow', 'en');
    expect(r.future).toBe(true);
    expect(r.lastDoneAt).toBeNull();
  });

  it('hydrates FM create phrases without a last-done date', () => {
    const r = hydrateIntent(
      { type: 'create', name: '重訓', lastDonePhrase: '', reminderPhrase: '', source: 'fm' },
      { locale: 'zh-Hant', now: NOW, text: '明天要去重訓' },
    );
    expect(r.type).toBe('create');
    expect(r.future).toBe(true);
    expect(r.lastDoneAt).toBeNull();
    expect(r.reminderDays).toBeNull();
    expect(r.name).toMatch(/重訓/);
  });

  it('maps an existing item without adding a log, and drafts a new one empty', () => {
    const existing = {
      id: 'a1',
      title: '重訓',
      lastDoneAt: '2026-01-01T00:00:00.000Z',
      reminderDays: 7,
    };
    const mapped = cardFromCreateIntent(
      { type: 'create', name: '重訓', future: true, lastDoneAt: null, reminderDays: null },
      { activities: [existing], categories: seedCategories() },
    );
    expect(mapped.mapped).toBe(true);
    expect(mapped.state).toBe('view');
    expect(mapped.item.lastDoneAt).toBe(existing.lastDoneAt);
    expect(mapped.item.reminderDays).toBe(7);

    const fresh = cardFromCreateIntent(
      { type: 'create', name: '重訓', future: true, lastDoneAt: null, reminderDays: null },
      { activities: [], categories: seedCategories() },
    );
    expect(fresh.mapped).toBe(false);
    expect(fresh.state).toBe('new');
    expect(fresh.item.lastDoneAt).toBeNull();
    expect(fresh.item.reminderDays).toBeNull();
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

  it('mentions days only, never hours', () => {
    setLocale('zh-Hant');
    const item = {
      title: '洗床單',
      lastDoneAt: new Date(2026, 9, 8, 9, 0, 0).toISOString(),
      reminderDays: 14,
    };
    const now = new Date(2026, 9, 20, 16, 0, 0).getTime();
    const text = sinceCopy(item, now, 'zh-Hant');
    expect(text).toMatch(/12\s*天/);
    expect(text).not.toMatch(/小時/);
    expect(text).not.toMatch(/hour/i);
    expect(text).not.toMatch(/時間/);
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

  it('log hits the per-item history cap', async () => {
    await resetRepositoryForTests();
    jest.spyOn(ent, 'isProUnlocked').mockResolvedValue(false);
    const a = await addActivity({ title: 'Car', lastDoneAt: '2026-01-01T00:00:00.000Z' });
    const hist = [];
    for (let i = 0; i < FREE_HISTORY_LIMIT; i++) {
      hist.push({ at: new Date(2026, 0, 2 + i).toISOString() });
    }
    await updateActivity(a.id, { history: hist });
    await expect(logActivityNow(a.id, '2026-10-17T00:00:00.000Z')).rejects.toMatchObject({
      code: 'FREE_LIMIT',
      kind: 'history',
    });
  });

  it('log goes through logActivityAt so undo works', async () => {
    await resetRepositoryForTests();
    const a = await addActivity({ title: 'Car', lastDoneAt: '2026-09-01T00:00:00.000Z' });
    const logged = await logActivityNow(a.id);
    expect(logged.previousHistory).toHaveLength(1);
    expect(getVisibleActivities()[0].history.length).toBe(2);
  });
});

describe('QA parser-results 38', () => {
  const QA_NOW = new Date(2026, 9, 20, 16, 0, 0);

  function qa(text, locale) {
    setLocale(locale);
    return parseRules(text, { locale, now: QA_NOW });
  }

  const rows = [
    { locale: 'zh-Hant', text: '每兩週換濾心，上次是昨天', type: 'create', name: /濾心/, reminderDays: 14, lastDoneDaysAgo: 1 },
    { locale: 'zh-Hant', text: '每週倒垃圾', type: 'create', name: /倒垃圾/, reminderDays: 7, lastDoneDaysAgo: 0 },
    { locale: 'zh-Hant', text: '每3個月換牙刷，上次是上個月', type: 'create', name: /牙刷/, reminderDays: 90, lastDoneDaysAgo: 30 },
    { locale: 'zh-Hant', text: '每天吃維他命', type: 'create', name: /維他命/, reminderDays: 1, lastDoneDaysAgo: 0 },
    { locale: 'zh-Hant', text: '提醒我每月繳房租', type: 'create', name: /^繳房租$/, reminderDays: 30, lastDoneDaysAgo: 0 },
    { locale: 'zh-Hant', text: '上週六洗床單，以後每兩週一次', type: 'create', name: /^洗床單$/, reminderDays: 14, lastDoneDaysAgo: 3 },
    { locale: 'zh-Hant', text: '我多久沒換床單了？', type: 'query_since', name: /床單/ },
    { locale: 'zh-Hant', text: '上次洗車是什麼時候', type: 'query_since', name: /洗車/ },
    { locale: 'zh-Hant', text: '這週要做什麼？', type: 'query_week' },
    { locale: 'zh-Hant', text: '今天有什麼要做', type: 'query_today' },
    { locale: 'zh-Hant', text: '剛剛洗了車', type: 'log', name: /^洗車$/ },
    { locale: 'zh-Hant', text: '我剛換了貓砂', type: 'log', name: /貓砂/ },
    { locale: 'zh-Hant', text: '昨天澆了花', type: 'log', name: /花/, lastDoneDaysAgo: 1 },
    { locale: 'zh-Hant', text: '洗好碗了', type: 'log', name: /碗/ },
    { locale: 'zh-Hant', text: '記一下剪頭髮', type: 'create', name: /剪頭髮/, reminderDays: 42, lastDoneDaysAgo: 0 },
    { locale: 'zh-Hant', text: '三天前換了床單', type: 'log', name: /床單/, lastDoneDaysAgo: 3 },
    { locale: 'zh-Hant', text: '每隔10天澆花', type: 'create', name: /^澆花$/, reminderDays: 10, lastDoneDaysAgo: 0 },
    { locale: 'en', text: 'change the filter every 2 weeks, last done yesterday', type: 'create', name: /filter/i, reminderDays: 14, lastDoneDaysAgo: 1 },
    { locale: 'en', text: 'take out the trash weekly', type: 'create', name: /trash/i, reminderDays: 7, lastDoneDaysAgo: 0 },
    { locale: 'en', text: 'water the plants every 3 days', type: 'create', name: /plant/i, reminderDays: 3, lastDoneDaysAgo: 0 },
    { locale: 'en', text: 'how long since I washed the sheets?', type: 'query_since', name: /sheet/i },
    { locale: 'en', text: 'when did I last wash the car', type: 'query_since', name: /car/i },
    { locale: 'en', text: 'what is due this week?', type: 'query_week' },
    { locale: 'en', text: 'what do I need to do today', type: 'query_today' },
    { locale: 'en', text: 'just washed the car', type: 'log', name: /car/i },
    { locale: 'en', text: 'I changed the litter', type: 'log', name: /litter/i },
    { locale: 'en', text: 'watered the plants yesterday', type: 'log', name: /plant/i, lastDoneDaysAgo: 1 },
    { locale: 'en', text: 'add haircut every 6 weeks', type: 'create', name: /haircut/i, reminderDays: 42, lastDoneDaysAgo: 0 },
    { locale: 'en', text: 'remind me to pay rent monthly', type: 'create', name: /rent/i, reminderDays: 30, lastDoneDaysAgo: 0 },
    { locale: 'ja', text: '2週間ごとにフィルター交換、前回は昨日', type: 'create', name: /^フィルター交換$/, reminderDays: 14, lastDoneDaysAgo: 1 },
    { locale: 'ja', text: '毎週ゴミ出し', type: 'create', name: /ゴミ出し/, reminderDays: 7, lastDoneDaysAgo: 0 },
    { locale: 'ja', text: '毎日ビタミンを飲む', type: 'create', name: /ビタミン/, reminderDays: 1, lastDoneDaysAgo: 0 },
    { locale: 'ja', text: 'シーツを最後に洗ったのはいつ？', type: 'query_since', name: /シーツ/ },
    { locale: 'ja', text: '今週は何をする？', type: 'query_week' },
    { locale: 'ja', text: 'さっき洗車した', type: 'log', name: /洗車/ },
    { locale: 'ja', text: '猫砂を替えた', type: 'log', name: /猫砂/ },
    { locale: 'ja', text: '昨日水やりした', type: 'log', name: /^水やり$/, lastDoneDaysAgo: 1 },
    { locale: 'ja', text: '3か月ごとに歯ブラシ交換', type: 'create', name: /^歯ブラシ交換$/, reminderDays: 90, lastDoneDaysAgo: 0 },
  ];

  it('covers all 38 QA sentences', () => {
    expect(rows).toHaveLength(38);
  });

  it.each(rows)('$locale $text', ({ locale, text, type, name, reminderDays, lastDoneDaysAgo }) => {
    const r = qa(text, locale);
    expect(r.type).toBe(type);
    if (name) expect(r.name).toMatch(name);
    else expect(r.name == null || r.name === '').toBe(true);
    if (reminderDays != null) expect(r.reminderDays).toBe(reminderDays);
    if (lastDoneDaysAgo != null) expect(r.lastDoneDaysAgo).toBe(lastDoneDaysAgo);
  });

  it('parses every-N days in all locales', () => {
    expect(qa('每隔10天澆花', 'zh-Hant').reminderDays).toBe(10);
    expect(qa('water the plants every 10 days', 'en').reminderDays).toBe(10);
    expect(qa('10日ごとに水やり', 'ja').reminderDays).toBe(10);
    expect(qa('Pflanzen alle 10 Tage gießen', 'de').reminderDays).toBe(10);
    expect(qa('Arroser les plantes tous les 10 jours', 'fr').reminderDays).toBe(10);
  });

  it('treats English past-tense + time-word as a log', () => {
    const cleaned = qa('I cleaned the windows yesterday', 'en');
    expect(cleaned.type).toBe('log');
    expect(cleaned.name).toMatch(/window/i);
    expect(cleaned.lastDoneDaysAgo).toBe(1);

    const vacuumed = qa('vacuumed the rug yesterday', 'en');
    expect(vacuumed.type).toBe('log');
    expect(vacuumed.lastDoneDaysAgo).toBe(1);

    const folded = qa('I folded the laundry last week', 'en');
    expect(folded.type).toBe('log');
    expect(folded.lastDoneDaysAgo).toBe(7);

    const wiped = qa('wiped the counters today', 'en');
    expect(wiped.type).toBe('log');
    expect(wiped.lastDoneDaysAgo).toBe(0);
  });

  it('two consecutive yesterday messages produce only 1 record', async () => {
    await resetRepositoryForTests();
    const item = await addActivity({
      title: 'water the plants',
      lastDoneAt: new Date(2026, 8, 1, 9, 0, 0).toISOString(),
    });
    const now1 = new Date(2026, 9, 20, 16, 0, 0, 0);
    const now2 = new Date(2026, 9, 20, 16, 0, 0, 80);
    const first = parseRules('watered the plants yesterday', { locale: 'en', now: now1 });
    const second = parseRules('watered the plants yesterday', { locale: 'en', now: now2 });
    expect(first.type).toBe('log');
    expect(second.type).toBe('log');
    expect(first.lastDoneAt).not.toBe(second.lastDoneAt);
    await logActivityOnDay(item.id, first.lastDoneAt);
    const skip = await logActivityOnDay(item.id, second.lastDoneAt);
    expect(skip.skipped).toBe(true);
    const row = getVisibleActivities()[0];
    expect(row.history.filter((e) => sameLocalDay(e.at, first.lastDoneAt))).toHaveLength(1);
  });

  it('recognizes due-today queries in ja/de/fr', () => {
    expect(qa('今日は何をする', 'ja').type).toBe('query_today');
    expect(qa('Was steht heute an?', 'de').type).toBe('query_today');
    expect(qa('was ist heute fällig', 'de').type).toBe('query_today');
    expect(qa("Quoi aujourd'hui ?", 'fr').type).toBe('query_today');
    expect(qa("qu'est-ce qu'il y a aujourd'hui", 'fr').type).toBe('query_today');
  });
});

describe('AiEditSheet now is stable', () => {
  it('does not default now to Date.now() in the props list', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../src/components/AiEditSheet.js'), 'utf8');
    expect(src).not.toMatch(/now\s*=\s*Date\.now\(\)/);
    expect(src).toMatch(/useRef/);
    expect(src).toMatch(/nowRef/);
  });
});

describe('AI chat future-plan card', () => {
  it('maps future creates in memory and still writes through addActivity', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/screens/AiChatScreen.js'), 'utf8');
    expect(src).toMatch(/cardFromCreateIntent/);
    expect(src).toMatch(/ai\.plannedIntro/);
    expect(src).toMatch(/itemKey=\{sheet\}/);
    expect(src).toMatch(/Keyboard\.dismiss/);
    expect(src).toMatch(/await addActivity/);
    expect(src).not.toMatch(/draftFromCreate/);
    const repo = fs.readFileSync(path.join(__dirname, '../src/data/repository.js'), 'utf8');
    expect(repo).toMatch(/function enqueueWrite/);
    expect(repo).toMatch(/return enqueueWrite\(async \(\) => \{/);
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
    expect(home).toMatch(/<UndoToast/);
    expect(home).not.toMatch(/expo-widgets/);
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

  it('speech requires on-device recognition and never starts without it', () => {
    const src = read('../src/lib/ai/speech.js');
    expect(src).toMatch(/requiresOnDeviceRecognition:\s*true/);
    expect(src).toMatch(/supportsOnDeviceSpeech/);
    expect(src).not.toMatch(/requiresOnDeviceRecognition:\s*onDevice/);
    const swift = read('../modules/apple-foundation-models/ios/AppleFoundationModelsModule.swift');
    expect(swift).toMatch(/import Speech/);
    expect(swift).toMatch(/supportsOnDeviceSpeech/);
    expect(swift).toMatch(/supportsOnDeviceRecognition/);
    expect(swift).toMatch(/isAvailable/);
  });
});
