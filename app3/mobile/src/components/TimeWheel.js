import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useThemeColors } from '../theme/useTheme';
import { t } from '../i18n';

const ITEM = 36;
const PAD = 90;
const HEIGHT = 216;

function snapIndex(y, max) {
  const idx = Math.round(y / ITEM);
  return Math.min(max, Math.max(0, idx));
}

function WheelColumn({ values, selected, onChange, width = 88, testID }) {
  const c = useThemeColors();
  const ref = useRef(null);
  const ready = useRef(false);
  const selectedIndex = Math.max(0, values.findIndex((v) => v.value === selected));

  useEffect(() => {
    const y = selectedIndex * ITEM;
    const node = ref.current;
    if (!node) return;
    requestAnimationFrame(() => {
      node.scrollTo({ y, animated: ready.current });
      ready.current = true;
    });
  }, [selectedIndex]);

  function commit(y) {
    const idx = snapIndex(y, values.length - 1);
    const next = values[idx];
    if (next && next.value !== selected) onChange(next.value);
    ref.current?.scrollTo({ y: idx * ITEM, animated: true });
  }

  return (
    <ScrollView
      ref={ref}
      testID={testID}
      style={{ width, height: HEIGHT }}
      contentContainerStyle={{ paddingVertical: PAD }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM}
      snapToAlignment="start"
      decelerationRate="fast"
      nestedScrollEnabled
      onMomentumScrollEnd={(e) => commit(e.nativeEvent.contentOffset.y)}
      onScrollEndDrag={(e) => {
        const y = e.nativeEvent.contentOffset.y;
        setTimeout(() => commit(y), 80);
      }}
    >
      {values.map((v) => {
        const on = v.value === selected;
        return (
          <View key={String(v.value)} style={styles.it}>
            <Text
              style={{
                color: on ? c.label : c.l2,
                fontSize: on ? 24 : 22,
                fontFamily: 'BeenAgesRounded-SemiBold',
              }}
            >
              {v.label}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

export function TimeWheel({ hour, minute, uses24h, onChange }) {
  const c = useThemeColors();
  const hours24 = useMemo(
    () => Array.from({ length: 24 }, (_, i) => ({ value: i, label: String(i).padStart(2, '0') })),
    [],
  );
  const hours12 = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
    [],
  );
  const minutes = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({ value: i, label: String(i).padStart(2, '0') })),
    [],
  );
  const meridians = useMemo(
    () => [
      { value: 'am', label: t('reminder.am') },
      { value: 'pm', label: t('reminder.pm') },
    ],
    [],
  );

  if (uses24h) {
    return (
      <View style={[styles.wheel, { borderColor: c.sep }]}>
        <View style={[styles.mark, { borderColor: c.sep }]} pointerEvents="none" />
        <WheelColumn
          testID="time-wheel-hour"
          values={hours24}
          selected={hour}
          onChange={(h) => onChange(h, minute)}
        />
        <Text style={[styles.colon, { color: c.label }]}>:</Text>
        <WheelColumn
          testID="time-wheel-minute"
          values={minutes}
          selected={minute}
          onChange={(m) => onChange(hour, m)}
        />
      </View>
    );
  }

  const am = hour < 12;
  let h12 = hour % 12;
  if (h12 === 0) h12 = 12;

  function to24(nextH12, nextAm) {
    if (nextAm) return nextH12 === 12 ? 0 : nextH12;
    return nextH12 === 12 ? 12 : nextH12 + 12;
  }

  return (
    <View style={[styles.wheel, { borderColor: c.sep }]}>
      <View style={[styles.mark, { borderColor: c.sep }]} pointerEvents="none" />
      <WheelColumn
        testID="time-wheel-hour"
        values={hours12}
        selected={h12}
        onChange={(h) => onChange(to24(h, am), minute)}
        width={72}
      />
      <Text style={[styles.colon, { color: c.label }]}>:</Text>
      <WheelColumn
        testID="time-wheel-minute"
        values={minutes}
        selected={minute}
        onChange={(m) => onChange(hour, m)}
        width={72}
      />
      <WheelColumn
        testID="time-wheel-meridian"
        values={meridians}
        selected={am ? 'am' : 'pm'}
        onChange={(v) => onChange(to24(h12, v === 'am'), minute)}
        width={72}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wheel: {
    height: HEIGHT,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mark: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: HEIGHT / 2 - ITEM / 2,
    height: ITEM,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    zIndex: 2,
  },
  it: {
    height: ITEM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colon: {
    fontSize: 22,
    fontFamily: 'BeenAgesRounded-SemiBold',
    paddingHorizontal: 4,
    zIndex: 1,
  },
});
