import React from 'react';
import { create, act } from 'react-test-renderer';
import { TimeWheel, WHEEL_SETTLE_MS, snapIndex } from '../src/components/TimeWheel';

const ITEM = 36;

function hourProps(tree) {
  const node = tree.root.findByProps({ testID: 'time-wheel-hour' });
  return node.props;
}

describe('TimeWheel', () => {
  it('snaps offsets to the nearest row', () => {
    expect(snapIndex(20 * ITEM, 23)).toBe(20);
    expect(snapIndex(20 * ITEM + 10, 23)).toBe(20);
    expect(snapIndex(-8, 23)).toBe(0);
  });

  it('commits from onScroll after scrolling settles (web has no momentum end)', () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    let tree;
    act(() => {
      tree = create(<TimeWheel hour={9} minute={0} uses24h onChange={onChange} />);
    });
    const y = 20 * ITEM;
    act(() => {
      hourProps(tree).onScroll({ nativeEvent: { contentOffset: { y } } });
    });
    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(WHEEL_SETTLE_MS);
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(20, 0);
    jest.useRealTimers();
  });

  it('does not double-commit when settle and momentum both fire', () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    let tree;
    act(() => {
      tree = create(<TimeWheel hour={9} minute={0} uses24h onChange={onChange} />);
    });
    const y = 20 * ITEM;
    const hour = hourProps(tree);
    act(() => {
      hour.onScroll({ nativeEvent: { contentOffset: { y } } });
      hour.onMomentumScrollEnd({ nativeEvent: { contentOffset: { y } } });
    });
    act(() => {
      jest.advanceTimersByTime(WHEEL_SETTLE_MS);
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(20, 0);
    jest.useRealTimers();
  });
});
