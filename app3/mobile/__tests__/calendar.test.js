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
    expect(eventTitle({ title: '換牙刷' }, 'zh')).toBe('換牙刷｜好久沒了');
    expect(eventPayload(item, 'zh').title).toBe('換牙刷｜好久沒了');
    expect(eventTitle({ title: 'ハブラシ' }, 'ja')).toBe('ハブラシ｜久しぶり');
    expect(calendarNote('ja')).toBe('久しぶりから追加');
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

  it('plugin keeps usage strings so expo-calendar does not strip Info.plist keys', () => {
    const appJson = require('../app.json');
    const plugin = (appJson.expo.plugins || []).find((p) => Array.isArray(p) && p[0] === 'expo-calendar');
    expect(plugin[1].writeOnlyAccess).toBe(true);
    expect(plugin[1].calendarPermission).toMatch(/Add to Calendar/i);
    expect(plugin[1].remindersPermission).toMatch(/Reminders app/i);
    expect(plugin[1].writeOnlyCalendarPermission).toMatch(/item's next due date/i);
    const plist = appJson.expo.ios.infoPlist;
    for (const key of [
      'NSCalendarsUsageDescription',
      'NSCalendarsFullAccessUsageDescription',
      'NSCalendarsWriteOnlyAccessUsageDescription',
      'NSRemindersUsageDescription',
      'NSRemindersFullAccessUsageDescription',
      'NSPhotoLibraryAddUsageDescription',
    ]) {
      expect(typeof plist[key]).toBe('string');
      expect(plist[key].length).toBeGreaterThan(8);
    }
    const { applyPermissions } = require('@expo/config-plugins/build/ios/Permissions');
    const defaults = {
      NSCalendarsUsageDescription: 'default cal',
      NSRemindersUsageDescription: 'default rem',
      NSRemindersFullAccessUsageDescription: 'default rem',
      NSCalendarsWriteOnlyAccessUsageDescription: 'default write',
    };
    const custom = {
      NSCalendarsUsageDescription: plugin[1].calendarPermission,
      NSRemindersUsageDescription: plugin[1].remindersPermission,
      NSRemindersFullAccessUsageDescription: plugin[1].remindersPermission,
      NSCalendarsWriteOnlyAccessUsageDescription: plugin[1].writeOnlyCalendarPermission,
    };
    const merged = applyPermissions(defaults, custom, { ...plist });
    expect(merged.NSCalendarsUsageDescription).toMatch(/Add to Calendar/i);
    expect(merged.NSCalendarsFullAccessUsageDescription).toMatch(/Add to Calendar/i);
    expect(merged.NSCalendarsWriteOnlyAccessUsageDescription).toMatch(/item's next due date/i);
    expect(merged.NSRemindersUsageDescription).toMatch(/Reminders app/i);
    expect(merged.NSRemindersFullAccessUsageDescription).toMatch(/Reminders app/i);
    expect(merged.NSPhotoLibraryAddUsageDescription).toMatch(/Photos/i);
    expect(appJson.expo.ios.infoPlist.CFBundleDevelopmentRegion).toBe('en');
    expect(appJson.expo.ios.infoPlist.CFBundleLocalizations).toEqual(['en', 'zh-Hant', 'ja']);
    const locales = appJson.expo.locales;
    expect(locales.en).toBe('./languages/ios/en.json');
    expect(locales['zh-Hant']).toBe('./languages/ios/zh-Hant.json');
    expect(locales.ja).toBe('./languages/ios/ja.json');
    const zh = require('../languages/ios/zh-Hant.json');
    const en = require('../languages/ios/en.json');
    const ja = require('../languages/ios/ja.json');
    const plistKeys = [
      'CFBundleDisplayName',
      'NSCalendarsUsageDescription',
      'NSCalendarsFullAccessUsageDescription',
      'NSCalendarsWriteOnlyAccessUsageDescription',
      'NSRemindersUsageDescription',
      'NSRemindersFullAccessUsageDescription',
      'NSPhotoLibraryAddUsageDescription',
    ];
    expect(Object.keys(en).sort()).toEqual(plistKeys.slice().sort());
    expect(Object.keys(zh).sort()).toEqual(plistKeys.slice().sort());
    expect(Object.keys(ja).sort()).toEqual(plistKeys.slice().sort());
    expect(Object.values(en).every((v) => typeof v === 'string')).toBe(true);
    expect(Object.values(zh).every((v) => typeof v === 'string')).toBe(true);
    expect(Object.values(ja).every((v) => typeof v === 'string')).toBe(true);
    expect(zh.NSCalendarsWriteOnlyAccessUsageDescription).toMatch(/項目的下次該做日子/);
    expect(en.NSCalendarsWriteOnlyAccessUsageDescription).toMatch(/item's next due date/i);
    expect(zh.NSCalendarsUsageDescription).toMatch(/加到行事曆/);
    expect(en.NSCalendarsUsageDescription).toMatch(/Add to Calendar/i);
    expect(zh.NSRemindersUsageDescription).toMatch(/「好久沒了」不使用「提醒事項」/);
    expect(en.NSRemindersUsageDescription).toMatch(/Reminders app/i);
    expect(ja.CFBundleDisplayName).toBe('久しぶり');
    expect(ja.NSCalendarsWriteOnlyAccessUsageDescription).toMatch(/次の予定日/);
    expect(ja.NSCalendarsUsageDescription).toMatch(/カレンダーに追加/);
    expect(ja.NSRemindersUsageDescription).toMatch(/リマインダー/);
    const src = require('fs').readFileSync(require('path').join(__dirname, '../src/lib/calendar.js'), 'utf8');
    expect(src).toMatch(/requestCalendarPermissions\(true\)/);
    expect(src).not.toMatch(/getCalendars\(/);
  });
});
