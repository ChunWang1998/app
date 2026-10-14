import { pickWidgetItems, buildWidgetProps, dueClassOf, nextMidnight } from '../src/widgets/pick';
import { planQueueMerge } from '../src/data/appGroup';
import { FREE_ACTIVITY_LIMIT } from '../src/data/repository';

const now = Date.parse('2026-10-13T14:50:00.000Z');

function item(id, daysAgo, reminderDays = 3) {
  const last = new Date(now - daysAgo * 864e5).toISOString();
  return {
    id,
    title: id,
    icon: 'drop',
    lastDoneAt: last,
    reminderDays,
    createdAt: last,
    deletedAt: null,
  };
}

describe('widget item pick + Pro gate', () => {
  it('defaults to most-due (overdue first)', () => {
    const items = [item('ok', 1, 10), item('late', 10, 3), item('soon', 2, 3)];
    const one = pickWidgetItems(items, { family: 'systemSmall', now });
    expect(one[0].id).toBe('late');
    const three = pickWidgetItems(items, { family: 'systemMedium', now });
    expect(three.map((x) => x.id)[0]).toBe('late');
    expect(three).toHaveLength(3);
  });

  it('honors pinned selection and configuration.itemId', () => {
    const items = [item('a', 1, 10), item('b', 8, 3), item('c', 2, 3)];
    expect(pickWidgetItems(items, { family: 'systemSmall', selectedIds: { small: 'c' }, now })[0].id).toBe('c');
    expect(pickWidgetItems(items, { family: 'systemSmall', configuration: { itemId: 'a' }, now })[0].id).toBe('a');
    expect(pickWidgetItems(items, {
      family: 'systemMedium',
      selectedIds: { medium: ['c', 'a'] },
      now,
    }).map((x) => x.id)).toEqual(['c', 'a']);
  });

  it('marks overdue red and 48h soon orange', () => {
    expect(dueClassOf(item('late', 10, 3), now)).toBe('od');
    expect(dueClassOf(item('soon', 2, 3), now)).toBe('soon');
    expect(dueClassOf(item('ok', 1, 10), now)).toBe('');
  });

  it('puts natural reminder copy on widget items', () => {
    const { toWidgetItem } = require('../src/widgets/pick');
    const weekly = toWidgetItem({
      id: 'w',
      title: 'Brush',
      icon: 'brush',
      lastDoneAt: new Date(now).toISOString(),
      reminderMode: 'week',
      reminderWeekdays: [1, 4],
      reminderTime: '09:00',
    }, { now, locale: 'zh-Hant' });
    expect(weekly.reminderLabel).toBe('每週一、四');
    const monthly = toWidgetItem({
      id: 'm',
      title: 'Brush',
      icon: 'brush',
      lastDoneAt: new Date(now).toISOString(),
      reminderMode: 'month',
      reminderMonthDay: 15,
      reminderTime: '09:00',
    }, { now, locale: 'en' });
    expect(monthly.reminderLabel).toBe('Monthly on the 15th');
  });

  it('hides items entirely when not Pro', () => {
    const props = buildWidgetProps({
      proUnlocked: false,
      activities: [item('a', 1), item('b', 2), item('c', 3)],
      selectedIds: { small: 'auto', medium: [] },
    }, { now });
    expect(props.isPro).toBe(false);
    expect(props.items).toEqual([]);
    expect(props.upgradeLabel).toMatch(/升級就能用/);
  });

  it('localizes widget copy with the same locale resolver as the app', () => {
    const snap = { proUnlocked: false, activities: [], selectedIds: { small: 'auto', medium: [] } };
    expect(buildWidgetProps(snap, { now, locale: 'ja' }).upgradeLabel).toBe('アップグレードで使う');
    expect(buildWidgetProps(snap, { now, locale: 'ja-JP' }).upgradeLabel).toBe('アップグレードで使う');
    expect(buildWidgetProps(snap, { now, locale: 'zh-CN' }).upgradeLabel).toBe('升級就能用');
    expect(buildWidgetProps(snap, { now, locale: 'fr' }).upgradeLabel).toBe('Upgrade to use');
    const jaDays = buildWidgetProps({
      proUnlocked: true,
      activities: [item('a', 10, 3)],
      selectedIds: { small: 'auto', medium: [] },
    }, { now, locale: 'ja' });
    expect(jaDays.items[0].daysUnit).toBe('日');
  });

  it('free cap is 10; tampered queue ids are skipped even if queue is tampered', () => {
    expect(FREE_ACTIVITY_LIMIT).toBe(10);
    const logs = ['a1', 'a2', 'a3', 'a4'].map((id) => ({ itemId: id, timestamp: new Date(now).toISOString() }));
    const activities = ['a1', 'a2', 'a3'].map((id) => item(id, 1));
    const { applied, skipped } = planQueueMerge({ logs, activities, proUnlocked: true });
    expect(applied.map((x) => x.itemId)).toEqual(['a1', 'a2', 'a3']);
    expect(skipped.some((s) => s.itemId === 'a4' && s.reason === 'UNKNOWN_ITEM')).toBe(true);
  });

  it('schedules a midnight timeline point', () => {
    const mid = nextMidnight(now);
    expect(mid.getHours()).toBe(0);
    expect(mid.getTime()).toBeGreaterThan(now);
    expect(mid.getTime() - now).toBeLessThanOrEqual(864e5);
  });
});
