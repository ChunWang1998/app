import { dueInMs, elapsedMs, formatSpanParts } from '../lib/time';
import { sfSymbolForIcon } from '../data/appGroup';

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
  if (due < 0) return 'od';
  if (due < 2 * 864e5) return 'soon';
  return '';
}

export function formatWidgetDays(item, now = Date.now()) {
  const ms = elapsedMs(item, now);
  if (ms == null) return { daysNum: null, daysUnit: '', daysText: '—' };
  const part = formatSpanParts(ms, 1)[0];
  return {
    daysNum: part.n,
    daysUnit: part.unit,
    daysText: `${part.n}${part.unit}`,
  };
}

export function toWidgetItem(activity, { now = Date.now(), iconUris = {} } = {}) {
  const days = formatWidgetDays(activity, now);
  return {
    id: activity.id,
    title: activity.title,
    icon: activity.icon || 'brush',
    lastDoneAt: activity.lastDoneAt ?? null,
    reminderDays: activity.reminderDays ?? null,
    dueClass: dueClassOf(activity, now),
    daysNum: days.daysNum,
    daysUnit: days.daysUnit,
    daysText: days.daysText,
    iconUri: iconUris[activity.icon || 'brush'] || null,
    sfSymbol: sfSymbolForIcon(activity.icon || 'brush'),
  };
}

export function buildWidgetProps(snapshot, {
  now = Date.now(),
  iconUris = {},
  logoUri = null,
  locale = 'zh',
} = {}) {
  const isPro = !!snapshot?.proUnlocked;
  const upgradeLabel = locale === 'en' ? 'Upgrade to use' : '升級就能用';
  const selectedIds = snapshot?.selectedIds || { small: 'auto', medium: [] };
  const hideLockNames = !!selectedIds.hideLockNames;
  const hideHomeNames = !!selectedIds.hideHomeNames;
  if (!isPro) {
    return {
      isPro: false,
      locale,
      items: [],
      selectedSmall: 'auto',
      selectedMedium: [],
      hideLockNames,
      hideHomeNames,
      pending: null,
      logoUri,
      upgradeLabel,
    };
  }
  return {
    isPro: true,
    locale,
    items: (snapshot.activities || []).map((a) => toWidgetItem(a, { now, iconUris })),
    selectedSmall: selectedIds.small || 'auto',
    selectedMedium: selectedIds.medium || [],
    hideLockNames,
    hideHomeNames,
    pending: null,
    logoUri,
    upgradeLabel,
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
