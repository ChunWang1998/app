import React, { useMemo, useRef } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';

const TABS = ['explore', 'gatherings'];
const SWIPE_MIN = 56;
const SWIPE_VELOCITY = 0.35;

/**
 * Horizontal swipe to switch explore ↔ gatherings.
 * Ignores mostly-vertical moves so lists can still scroll.
 */
export default function TabSwipe({ tab, onChange, children }) {
  const tabRef = useRef(tab);
  const onChangeRef = useRef(onChange);
  tabRef.current = tab;
  onChangeRef.current = onChange;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onMoveShouldSetPanResponderCapture: (_e, g) =>
          Math.abs(g.dx) > 28 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_e, g) => {
          const goLeft =
            g.dx < -SWIPE_MIN ||
            (g.dx < -24 && g.vx < -SWIPE_VELOCITY);
          const goRight =
            g.dx > SWIPE_MIN || (g.dx > 24 && g.vx > SWIPE_VELOCITY);
          if (!goLeft && !goRight) return;
          const idx = TABS.indexOf(tabRef.current);
          if (idx < 0) return;
          if (goLeft && idx < TABS.length - 1) {
            onChangeRef.current(TABS[idx + 1]);
          } else if (goRight && idx > 0) {
            onChangeRef.current(TABS[idx - 1]);
          }
        },
      }),
    [],
  );

  return (
    <View style={styles.fill} {...pan.panHandlers}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
