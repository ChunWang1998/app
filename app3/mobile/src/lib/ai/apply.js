import { matchCategory } from '../categories';
import {
  firstDueInstant,
  formatReminderLabel,
  reminderConfigFromActivity,
  reminderFieldsFromConfig,
  configFromChipDays,
  hasReminder,
} from '../reminderSchedule';
import { dueInMs, localCalendarDays } from '../time';
import { dueStatus, isDueToday } from '../today';
import { fuzzyMatchItem } from './matchItem';
import { getLocale, t, tLocale } from '../../i18n';

function endOfLocalWeek(now) {
  const d = new Date(now);
  const untilSunday = (7 - d.getDay()) % 7;
  d.setDate(d.getDate() + untilSunday);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function itemsDueThisWeek(activities, now = Date.now()) {
  const end = endOfLocalWeek(now);
  return (activities || [])
    .filter((a) => {
      if (!hasReminder(a)) return false;
      const due = firstDueInstant(a, reminderConfigFromActivity(a), now);
      return due && due.getTime() <= end;
    })
    .sort((a, b) => dueInMs(a, now) - dueInMs(b, now));
}

export function itemsDueToday(activities, now = Date.now()) {
  return (activities || [])
    .filter((a) => isDueToday(a, now))
    .sort((a, b) => dueInMs(a, now) - dueInMs(b, now));
}

function daysOnlySpan(days, locale) {
  const loc = locale || getLocale();
  const n = Math.max(0, Math.round(Number(days) || 0));
  if (n <= 0) return tLocale(loc, 'common.today');
  return `${n}\u2009${tLocale(loc, 'time.day')}`;
}

export function formatNextShort(item, now = Date.now(), locale) {
  const due = firstDueInstant(item, reminderConfigFromActivity(item), now);
  if (!due) return { text: '—', red: false, rel: Infinity };
  const ms = due.getTime() - now;
  const ds = dueStatus(ms, now);
  // Cards match the prototype: overdue and due-today both read as “today”.
  if (ds === 'overdue' || ds === 'today') {
    return { text: t('common.today'), red: true, rel: ms };
  }
  const wd = t(`reminder.wdName${due.getDay()}`);
  const date = `${due.getMonth() + 1}/${due.getDate()}`;
  return { text: t('ai.nextDate', { date, wd }), red: false, rel: ms };
}

/** Week list keeps overdue remaining, like Home. */
export function formatWeekDue(item, now = Date.now(), locale) {
  const due = firstDueInstant(item, reminderConfigFromActivity(item), now);
  if (!due) return { text: '—', red: false };
  const ms = due.getTime() - now;
  const ds = dueStatus(ms, now);
  if (ds === 'overdue') {
    const days = Math.max(1, localCalendarDays(due, now));
    return { text: `${t('home.overdue')}\u2009${daysOnlySpan(days, locale)}`, red: true };
  }
  if (ds === 'today') return { text: t('common.today'), red: true };
  const wd = t(`reminder.wdName${due.getDay()}`);
  const date = `${due.getMonth() + 1}/${due.getDate()}`;
  return { text: t('ai.nextDate', { date, wd }), red: false };
}

export function formatLastDoneChip(iso, now = Date.now()) {
  if (!iso) return t('home.neverLogged');
  const a = new Date(iso);
  const b = new Date(now);
  const startA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const startB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  const days = Math.round((startB - startA) / 864e5);
  if (days <= 0) return t('common.today');
  if (days === 1) return t('common.yesterday');
  if (days === 7) return t('date.weekAgo');
  return `${a.getMonth() + 1}/${a.getDate()}`;
}

/** In-memory create card. Does not write until the user taps add. */
export function draftFromCreate(intent, { categories, reminderTime } = {}) {
  const title = String(intent?.name || '').trim();
  const categoryId = matchCategory(title, categories);
  const reminderDays = intent?.reminderDays ?? null;
  const cfg = configFromChipDays(reminderDays, { time: reminderTime });
  const fields = reminderFieldsFromConfig(cfg);
  return {
    title,
    categoryId,
    lastDoneAt: intent?.lastDoneAt ?? null,
    reminderDays: fields.reminderDays,
    ...fields,
  };
}

export function reminderLabelForDraft(draft, locale) {
  return formatReminderLabel(draft, locale);
}

export function resolveItem(name, items) {
  return fuzzyMatchItem(name, items);
}

/**
 * Future plans map an existing item without logging, or draft a new one
 * with last-done left empty. Does not write.
 */
export function cardFromCreateIntent(intent, { activities, categories, reminderTime } = {}) {
  if (intent?.future) {
    const existing = resolveItem(intent.name, activities);
    if (existing) return { item: existing, state: 'view', mapped: true };
  }
  return { item: draftFromCreate(intent, { categories, reminderTime }), state: 'new', mapped: false };
}

export function sinceCopy(item, now = Date.now(), locale) {
  if (!item?.lastDoneAt) return t('home.neverLogged');
  const days = Math.max(0, localCalendarDays(item.lastDoneAt, now));
  const span = daysOnlySpan(days, locale);
  if (!hasReminder(item)) return t('ai.sinceOnly', { span });
  const due = firstDueInstant(item, reminderConfigFromActivity(item), now);
  if (!due) return t('ai.sinceOnly', { span });
  const ms = due.getTime() - now;
  const ds = dueStatus(ms, now);
  const next = (ds === 'overdue' || ds === 'today')
    ? t('common.today')
    : `${due.getMonth() + 1}/${due.getDate()}`;
  return t('ai.sinceNext', { span, next });
}
