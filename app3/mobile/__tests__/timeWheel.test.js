import fs from 'fs';
import path from 'path';
import {
  WHEEL_SETTLE_MS,
  snapIndex,
  pickWheelValue,
  createSettleCommit,
} from '../src/components/TimeWheel';

const ITEM = 36;
const hours = Array.from({ length: 24 }, (_, i) => ({ value: i, label: String(i) }));

describe('TimeWheel commit helpers', () => {
  it('snaps offsets to the nearest row', () => {
    expect(snapIndex(20 * ITEM, 23)).toBe(20);
    expect(snapIndex(20 * ITEM + 10, 23)).toBe(20);
    expect(snapIndex(-8, 23)).toBe(0);
  });

  it('picks a new hour and ignores a second commit of the same offset', () => {
    const first = pickWheelValue(20 * ITEM, hours, 9);
    expect(first).toEqual({ idx: 20, value: 20, changed: true });
    const again = pickWheelValue(20 * ITEM, hours, 20);
    expect(again.changed).toBe(false);
    expect(again.value).toBe(20);
  });

  it('commits from a settle debounce so web does not need momentum end', () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    let committed = 9;
    const settle = createSettleCommit((y) => {
      const picked = pickWheelValue(y, hours, committed);
      if (picked.changed) {
        committed = picked.value;
        onChange(picked.value);
      }
    });
    settle.schedule(20 * ITEM);
    expect(onChange).not.toHaveBeenCalled();
    jest.advanceTimersByTime(WHEEL_SETTLE_MS);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(20);
    jest.useRealTimers();
  });

  it('does not double-commit when settle and momentum both fire', () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    let committed = 9;
    const settle = createSettleCommit((y) => {
      const picked = pickWheelValue(y, hours, committed);
      if (picked.changed) {
        committed = picked.value;
        onChange(picked.value);
      }
    });
    settle.schedule(20 * ITEM);
    settle.flush(20 * ITEM);
    jest.advanceTimersByTime(WHEEL_SETTLE_MS);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(20);
    jest.useRealTimers();
  });

  it('wires onScroll settle in TimeWheel (RN-web never fires momentum end)', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/components/TimeWheel.js'), 'utf8');
    expect(src).toMatch(/onScroll=\{\(e\) => settle\.current\.schedule/);
    expect(src).toMatch(/onMomentumScrollEnd=\{\(e\) => settle\.current\.flush/);
    expect(src).toMatch(/scrollEventThrottle=\{16\}/);
  });
});
