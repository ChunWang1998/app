import { nextDueDate, eventPayload, eventTitle, calendarNote, CALENDAR_ALERT_HOUR, rememberCalendarAdd, wasCalendarAdded, addNextDueToCalendar } from '../src/lib/calendar';

const ts = '2026-10-01T15:30:00.000Z';

describe('add to calendar', () => {
  it('builds an all-day next-due event with a 9:00 alert and no recurrence', () => {
    const start = new Date(2026, 9, 1, 12, 0, 0);
    const item = { id: 'a1', title: '換牙刷', lastDoneAt: start.toISOString(), reminderDays: 90, createdAt: start.toISOString() };
    const due = nextDueDate(item);
    expect(due.getFullYear()).toBe(2026);
    expect(due.getMonth()).toBe(11);
    expect(due.getDate()).toBe(30);
    const payload = eventPayload(item);
    expect(payload.allDay).toBe(true);
    expect(payload.recurrenceRule).toBeUndefined();
    expect(payload.notes).toBe(calendarNote('zh'));
    expect(payload.title).toBe('換牙刷｜好久沒了');
    const alert = new Date(payload.alarms[0].absoluteDate);
    expect(alert.getHours()).toBe(CALENDAR_ALERT_HOUR);
    expect(eventTitle({ title: 'Brush' }, 'en')).toBe('Brush | Been Ages');
    expect(eventTitle({ title: '換牙刷' }, 'zh', true)).toBe('好久沒了');
    expect(eventTitle({ title: 'Brush' }, 'en', true)).toBe('Been Ages');
    expect(eventPayload(item, 'zh', true).title).toBe('好久沒了');
  });

  it('hides the action when there is no interval', () => {
    expect(nextDueDate({ reminderDays: null, lastDoneAt: ts })).toBeNull();
    expect(eventPayload({ reminderDays: null, lastDoneAt: ts })).toBeNull();
  });

  it('remembers the added date so a second tap is duplicate', async () => {
    const item = { id: 'dup1', title: '濾心', lastDoneAt: ts, reminderDays: 7, createdAt: ts };
    const payload = eventPayload(item);
    expect(await wasCalendarAdded(item.id, payload.dateKey)).toBe(false);
    await rememberCalendarAdd(item.id, payload.dateKey);
    expect(await wasCalendarAdded(item.id, payload.dateKey)).toBe(true);
    const r = await addNextDueToCalendar(item);
    expect(r.status).toBe('duplicate');
  });

  it('writes via getDefaultCalendarSync().createEvent when permitted', async () => {
    const start = new Date(2026, 9, 1, 12, 0, 0);
    const item = {
      id: 'w1',
      title: '換牙刷',
      lastDoneAt: start.toISOString(),
      reminderDays: 90,
      createdAt: start.toISOString(),
    };
    const r = await addNextDueToCalendar(item);
    expect(r.status).toBe('added');
    expect(r.dateKey).toBe('2026-12-30');
  });

  it('plugin requests write-only access only', () => {
    const appJson = require('../app.json');
    const plugin = (appJson.expo.plugins || []).find((p) => Array.isArray(p) && p[0] === 'expo-calendar');
    expect(plugin[1].writeOnlyAccess).toBe(true);
    expect(plugin[1].calendarPermission).toBe(false);
    expect(plugin[1].remindersPermission).toBe(false);
    expect(plugin[1].writeOnlyCalendarPermission).toMatch(/item's next due date/i);
    const zh = require('../languages/zh-Hant.json');
    const en = require('../languages/en.json');
    expect(zh.ios.NSCalendarsWriteOnlyAccessUsageDescription).toMatch(/項目的下次該做日子/);
    expect(en.ios.NSCalendarsWriteOnlyAccessUsageDescription).toMatch(/item's next due date/i);
    expect(zh.ios.NSCalendarsUsageDescription).toMatch(/加到行事曆/);
    expect(en.ios.NSCalendarsUsageDescription).toMatch(/Add to Calendar/i);
    expect(zh.ios.NSRemindersUsageDescription).toMatch(/「好久沒了」不使用「提醒事項」/);
    expect(en.ios.NSRemindersUsageDescription).toMatch(/Reminders app/i);
    expect(appJson.expo.ios.infoPlist.NSCalendarsUsageDescription).toMatch(/Add to Calendar/i);
    expect(appJson.expo.ios.infoPlist.NSRemindersUsageDescription).toMatch(/Reminders app/i);
    const src = require('fs').readFileSync(require('path').join(__dirname, '../src/lib/calendar.js'), 'utf8');
    expect(src).toMatch(/requestCalendarPermissions\(true\)/);
    expect(src).not.toMatch(/getCalendars\(/);
  });
});
