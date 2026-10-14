import { dueInMs, elapsedMs, formatSpanParts } from '../lib/time';
import { sfSymbolForIcon } from '../data/appGroup';
import { tLocale } from '../i18n';
import { monogramLetter } from '../lib/suggestIcon';
import { dueStatus } from '../lib/today';
import { formatReminderLabel } from '../lib/reminderSchedule';

const LOCK_FAMILIES = new Set(['accessoryCircular', 'accessoryRectangular', 'accessoryInline']);

export function isLockFamily(family) {
  return LOCK_FAMILIES.has(family);
}

export function pickWidgetItems(activities, {
  family = 'systemSmall',
  selectedIds,
  configuration,
  now = Date.now(),
} = {}) {
  const list = (activities || []).filter((a) => a && !a.deletedAt);
  if (!list.length) return [];
  const sorted = [...list].sort((a, b) => {
    const da = dueInMs(a, now);
    const db = dueInMs(b, now);
    if (da !== db) return da - db;
    return String(a.title || '').localeCompare(String(b.title || ''));
  });
  const configId = configuration?.itemId && configuration.itemId !== 'auto'
    ? configuration.itemId
    : null;
  const one = family === 'systemMedium' ? 3 : 1;

  if (family === 'systemMedium') {
    const pinned = Array.isArray(selectedIds?.medium) ? selectedIds.medium : [];
    if (pinned.length) {
      const found = pinned.map((id) => list.find((a) => a.id === id)).filter(Boolean);
      if (found.length) return found.slice(0, 3);
    }
    if (configId) {
      const first = list.find((a) => a.id === configId);
      const rest = sorted.filter((a) => a.id !== configId);
      return [first, ...rest].filter(Boolean).slice(0, 3);
    }
    return sorted.slice(0, 3);
  }

  const want = configId
    || (selectedIds?.small && selectedIds.small !== 'auto' ? selectedIds.small : null);
  if (want) {
    const found = list.find((a) => a.id === want);
    if (found) return [found];
  }
  return sorted.slice(0, one);
}

export function dueClassOf(item, now = Date.now()) {
  const due = dueInMs(item, now);
  const st = dueStatus(due, now);
  if (st === 'overdue') return 'od';
  if (st === 'today') return 'soon';
  if (due < 2 * 864e5) return 'soon';
  return '';
}

export function formatWidgetDays(item, now = Date.now(), locale) {
  const ms = elapsedMs(item, now);
  if (ms == null) return { daysNum: null, daysUnit: '', daysText: '—' };
  const part = formatSpanParts(ms, 1, locale)[0];
  return {
    daysNum: part.n,
    daysUnit: part.unit,
    daysText: `${part.n}${part.unit}`,
  };
}

export function toWidgetItem(activity, { now = Date.now(), iconUris = {}, locale } = {}) {
  const days = formatWidgetDays(activity, now, locale);
  return {
    id: activity.id,
    title: activity.title,
    icon: activity.icon || 'brush',
    lastDoneAt: activity.lastDoneAt ?? null,
    reminderDays: activity.reminderDays ?? null,
    reminderLabel: formatReminderLabel(activity, locale),
    dueClass: dueClassOf(activity, now),
    daysNum: days.daysNum,
    daysUnit: days.daysUnit,
    daysText: days.daysText,
    iconUri: activity.icon === 'mono' ? null : (iconUris[activity.icon || 'brush'] || null),
    sfSymbol: sfSymbolForIcon(activity.icon || 'brush'),
    monoLetter: activity.icon === 'mono' ? monogramLetter(activity.title) : '',
  };
}

export function buildWidgetProps(snapshot, {
  now = Date.now(),
  iconUris = {},
  logoUri = null,
  locale = 'zh',
} = {}) {
  const isPro = !!snapshot?.proUnlocked;
  const upgradeLabel = tLocale(locale, 'widget.upgrade');
  const labels = {
    undo: tLocale(locale, 'widget.undo'),
    empty: tLocale(locale, 'widget.empty'),
    logged: tLocale(locale, 'widget.logged'),
  };
  const selectedIds = snapshot?.selectedIds || { small: 'auto', medium: [] };
  if (!isPro) {
    return {
      isPro: false,
      locale,
      items: [],
      selectedSmall: 'auto',
      selectedMedium: [],
      pending: null,
      logoUri,
      upgradeLabel,
      labels,
    };
  }
  return {
    isPro: true,
    locale,
    items: (snapshot.activities || []).map((a) => toWidgetItem(a, { now, iconUris, locale })),
    selectedSmall: selectedIds.small || 'auto',
    selectedMedium: selectedIds.medium || [],
    pending: null,
    logoUri,
    upgradeLabel,
    labels,
  };
}

export function nextMidnight(now = Date.now()) {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d;
}

export function timelineForProps(props, snapshot, extras) {
  const now = extras?.now ?? Date.now();
  const midnight = nextMidnight(now);
  const later = buildWidgetProps(snapshot, { ...extras, now: midnight.getTime() });
  return [
    { date: new Date(now), props },
    { date: midnight, props: { ...later, pending: null } },
  ];
}
