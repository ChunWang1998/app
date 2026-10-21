import React from 'react';
import renderer, { act } from 'react-test-renderer';
import fs from 'fs';
import path from 'path';
import { TimePickerRow } from '../src/components/TimePickerRow';
import { formatReminderLabel, defaultReminderConfig, ensureReminderEnabled } from '../src/lib/reminderSchedule';
import { setLocale, tLocale } from '../src/i18n';

jest.mock('../src/theme/useTheme', () => ({
  useThemeColors: () => ({
    brand: '#a',
    fill: '#b',
    onbrand: '#c',
    label: '#d',
    l2: '#e',
    l3: '#f',
    cell: '#0',
  }),
}));

const read = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8');

describe('F18 reminder time of day', () => {
  it('add and edit screens show a native time picker only when reminders are on', () => {
    const edit = read('../src/screens/EditScreen.js');
    expect(edit).toMatch(/TimePickerRow/);
    expect(edit).toMatch(/reminderCfg\.enabled/);
    expect(edit).toMatch(/<TimePickerRow/);
    expect(edit).not.toMatch(/suggestReminderDays/);
    expect(edit).toMatch(/configFromChipDays\(d, reminderCfg\)/);
  });

  it('ReminderScreen time row does not turn reminders on by itself', () => {
    const src = read('../src/screens/ReminderScreen.js');
    expect(src).toMatch(/if \(!cfg\.enabled\) return;/);
    expect(src).toMatch(/apply\(\{ time: formatHm\(nh, nm\) \}\)/);
    expect(src).not.toMatch(/if \(!cfg\.enabled\) pick\(\{\}\)/);
    expect(src).toMatch(/formatReminderLabel\(cfg\)/);
    expect(src).toMatch(/detail\.noReminder/);
    expect(src).toMatch(/testID="reminder-off"/);
  });

  it('after reminders are on, the first row label is the selected frequency', () => {
    setLocale('zh-Hant');
    const off = defaultReminderConfig();
    expect(formatReminderLabel(off, 'zh-Hant')).toBe(tLocale('zh-Hant', 'detail.noReminder'));
    const on = ensureReminderEnabled(off);
    expect(formatReminderLabel(on, 'zh-Hant')).toBe(tLocale('zh-Hant', 'reminder.twoWeeks'));
    expect(formatReminderLabel(on, 'zh-Hant')).not.toBe(tLocale('zh-Hant', 'detail.noReminder'));
    expect(formatReminderLabel({
      reminderMode: 'month',
      reminderMonthDay: 15,
      reminderTime: '21:45',
    }, 'zh-Hant')).toBe('每月 15 日');
  });

  it('renders a time picker control', () => {
    const onChange = jest.fn();
    let tree;
    act(() => {
      tree = renderer.create(<TimePickerRow time="18:30" onChange={onChange} />);
    });
    expect(tree.root.findByProps({ testID: 'reminder-time-row' })).toBeTruthy();
    expect(tree.root.findByProps({ testID: 'time-picker' })).toBeTruthy();
  });
});
