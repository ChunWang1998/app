import React from 'react';
import renderer, { act } from 'react-test-renderer';
import fs from 'fs';
import path from 'path';
import { setLocale, tLocale } from '../src/i18n';
import { AiEditSheet, sheetReminderValue, sheetLastDays } from '../src/components/AiEditSheet';
import { reminderFieldsFromConfig, configFromChipDays } from '../src/lib/reminderSchedule';
import { formatLastDoneChip, reminderLabelForDraft } from '../src/lib/ai/apply';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const NOW = new Date(2026, 9, 20, 16, 0, 0).getTime();
const src = fs.readFileSync(path.join(__dirname, '../src/components/AiEditSheet.js'), 'utf8');

function offItem(extra = {}) {
  return {
    title: 'Gym',
    lastDoneAt: null,
    reminderDays: null,
    ...extra,
  };
}

describe('AiEditSheet overlay does not cover chips', () => {
  it('keeps the dim as a flex sibling above the sheet, not an absolute fill', () => {
    expect(src).not.toMatch(/absoluteFillObject/);
    expect(src).not.toMatch(/StyleSheet\.absoluteFill/);
    expect(src).toMatch(/testID="ai-sheet-dim"/);
    expect(src).toMatch(/testID="ai-sheet-body"/);
    expect(src).toMatch(/pointerEvents="auto"/);
    expect(src).toMatch(/Keyboard\.dismiss/);
    expect(src).toMatch(/dim:\s*\{\s*flex:\s*1\s*\}/);
    expect(src).toMatch(/zIndex:\s*2/);
  });

  it('exposes last-done and reminder chips that are not disabled', () => {
    expect(src).toMatch(/testID=\{`ai-last-\$\{o\.d \?\? 'never'\}`\}/);
    expect(src).toMatch(/testID=\{`ai-rem-\$\{o\.d \?\? 'off'\}`\}/);
    expect(src).not.toMatch(/disabled=\{true\}/);
    expect(src).toMatch(/detail\.noReminder/);
    expect(src).toMatch(/home\.neverLogged/);
  });
});

describe('sheet reminder init matches the card', () => {
  it('selects off when the card has no reminder', () => {
    setLocale('zh-Hant');
    const item = offItem();
    expect(reminderLabelForDraft(item)).toBe(tLocale('zh-Hant', 'detail.noReminder'));
    expect(sheetReminderValue(item)).toBeNull();
    expect(sheetLastDays(item.lastDoneAt, NOW)).toBeNull();
  });

  it('selects weekly when reminderDays is 7', () => {
    const item = offItem({ reminderDays: 7, lastDoneAt: new Date(NOW).toISOString() });
    expect(sheetReminderValue(item)).toBe(7);
    expect(sheetLastDays(item.lastDoneAt, NOW)).toBe(0);
  });

  it('does not fall back to 7 when reminder is off', () => {
    expect(sheetReminderValue({ reminderDays: null })).toBeNull();
    expect(sheetReminderValue({ reminderDays: 0 })).toBeNull();
    expect(sheetReminderValue({})).toBeNull();
  });

  it('keeps custom schedules as more so off is not selected', () => {
    const item = {
      reminderMode: 'week',
      reminderWeekdays: [1],
      reminderTime: '09:00',
    };
    expect(sheetReminderValue(item)).toBe('more');
  });
});

describe('no-reminder chip copy exists in all locales', () => {
  const locales = ['en', 'zh-Hant', 'ja', 'de', 'fr'];
  it.each(locales)('%s detail.noReminder is non-empty', (locale) => {
    const s = tLocale(locale, 'detail.noReminder');
    expect(s.length).toBeGreaterThan(0);
    expect(s).not.toBe('detail.noReminder');
  });
});

describe('AiEditSheet chips are pressable', () => {
  it('tapping last-done and reminder chips updates the saved draft', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const today = new Date(NOW).toISOString();
    let tree;
    act(() => {
      tree = renderer.create(
        <AiEditSheet
          visible
          item={offItem({ lastDoneAt: today, reminderDays: null })}
          onSave={onSave}
          onClose={onClose}
          now={NOW}
        />,
      );
    });
    const last = tree.root.findByProps({ testID: 'ai-last-1' });
    const remOff = tree.root.findByProps({ testID: 'ai-rem-off' });
    const remWeek = tree.root.findByProps({ testID: 'ai-rem-7' });
    expect(last.props.disabled).toBeFalsy();
    expect(remOff.props.disabled).toBeFalsy();
    expect(typeof last.props.onPress).toBe('function');
    expect(typeof remWeek.props.onPress).toBe('function');

    act(() => { last.props.onPress(); });
    act(() => { remWeek.props.onPress(); });
    act(() => { tree.root.findByProps({ testID: 'ai-sheet-save' }).props.onPress(); });

    expect(onClose).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0];
    expect(sheetLastDays(saved.lastDoneAt, NOW)).toBe(1);
    expect(saved.reminderDays).toBe(7);

    act(() => { remOff.props.onPress(); });
    act(() => { tree.root.findByProps({ testID: 'ai-last-never' }).props.onPress(); });
    act(() => { tree.root.findByProps({ testID: 'ai-sheet-save' }).props.onPress(); });
    const savedOff = onSave.mock.calls[1][0];
    expect(savedOff.lastDoneAt).toBeNull();
    expect(savedOff.reminderDays).toBeNull();
    expect(reminderFieldsFromConfig(configFromChipDays(null, savedOff)).reminderDays).toBeNull();
  });

  it('pressing the dim dismisses without saving', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    let tree;
    act(() => {
      tree = renderer.create(
        <AiEditSheet visible item={offItem()} onSave={onSave} onClose={onClose} now={NOW} />,
      );
    });
    act(() => { tree.root.findByProps({ testID: 'ai-sheet-dim' }).props.onPress(); });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('card last-done empty state', () => {
  it('reads as not yet, matching the sheet never chip', () => {
    setLocale('zh-Hant');
    expect(formatLastDoneChip(null, NOW)).toBe(tLocale('zh-Hant', 'home.neverLogged'));
    setLocale('en');
    expect(formatLastDoneChip(null, NOW)).toBe(tLocale('en', 'home.neverLogged'));
  });
});
