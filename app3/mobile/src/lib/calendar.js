import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';

const MEMORY_KEY = 'beenages/calendarAdded/v1';
export const CALENDAR_NOTE = '從好久沒了加入';
export const CALENDAR_ALERT_HOUR = 9;

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function dateKey(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Next due local calendar day = last (or created) + reminderDays. Null if no interval. */
export function nextDueDate(item, now = new Date()) {
  if (!item?.reminderDays) return null;
  const startRaw = item.lastDoneAt || item.createdAt;
  if (!startRaw) return null;
  const start = new Date(startRaw);
  if (Number.isNaN(start.getTime())) return null;
  const due = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  due.setDate(due.getDate() + item.reminderDays);
  void now;
  return due;
}

export function eventTitle(item, locale = 'zh') {
  const name = String(item?.title || '').trim() || (locale === 'en' ? 'Item' : '項目');
  return locale === 'en' ? `${name} | Been Ages` : `${name}｜好久沒了`;
}

export function eventPayload(item, locale = 'zh') {
  const due = nextDueDate(item);
  if (!due) return null;
  const end = new Date(due);
  end.setDate(end.getDate() + 1);
  const alertAt = new Date(due.getFullYear(), due.getMonth(), due.getDate(), CALENDAR_ALERT_HOUR, 0, 0);
  return {
    title: eventTitle(item, locale),
    startDate: due,
    endDate: end,
    allDay: true,
    notes: CALENDAR_NOTE,
    alarms: [{ absoluteDate: alertAt.toISOString() }],
    recurrenceRule: undefined,
    dateKey: dateKey(due),
  };
}

export async function loadCalendarMemory() {
  try {
    const raw = await AsyncStorage.getItem(MEMORY_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

export async function rememberCalendarAdd(itemId, key) {
  const mem = await loadCalendarMemory();
  mem[itemId] = key;
  await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(mem));
}

export async function wasCalendarAdded(itemId, key) {
  const mem = await loadCalendarMemory();
  return mem[itemId] === key;
}

export async function requestWriteOnlyCalendar() {
  const Calendar = require('expo-calendar');
  const res = await Calendar.requestCalendarPermissions(true);
  return res;
}

export async function writeDueEvent(payload) {
  const Calendar = require('expo-calendar');
  const calendar = Calendar.getDefaultCalendarSync();
  if (!calendar?.createEvent) {
    throw new Error('calendar write unavailable');
  }
  return calendar.createEvent({
    title: payload.title,
    startDate: payload.startDate,
    endDate: payload.endDate,
    allDay: true,
    notes: payload.notes,
    alarms: payload.alarms,
  });
}

/**
 * @returns {{ status: 'added'|'duplicate'|'denied'|'no-interval'|'error', dateKey?: string, error?: string }}
 */
export async function addNextDueToCalendar(item, { force = false, locale = 'zh' } = {}) {
  const payload = eventPayload(item, locale);
  if (!payload) return { status: 'no-interval' };
  if (!force && await wasCalendarAdded(item.id, payload.dateKey)) {
    return { status: 'duplicate', dateKey: payload.dateKey };
  }
  const perm = await requestWriteOnlyCalendar();
  const granted = perm?.status === 'granted' || perm?.granted === true || perm?.writeOnly;
  if (!granted) return { status: 'denied' };
  await writeDueEvent(payload);
  await rememberCalendarAdd(item.id, payload.dateKey);
  return { status: 'added', dateKey: payload.dateKey };
}

export function openSystemSettings() {
  return Linking.openSettings().catch(() => {});
}
