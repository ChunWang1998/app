import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors } from '../theme/useTheme';
import { t } from '../i18n';
import { INTERVAL_DAY_CHIPS } from '../lib/reminderSchedule';

const BASE = [
  { d: null, key: 'detail.noReminder' },
  { d: 7, key: 'reminder.weekly' },
  { d: 14, key: 'reminder.twoWeeks' },
  { d: 30, key: 'reminder.monthly' },
  { d: 90, key: 'reminder.threeMonths' },
  { d: 'more', key: 'reminder.more' },
];

export function reminderOptions(value) {
  const custom = (typeof value === 'number' && value > 0 && !INTERVAL_DAY_CHIPS.includes(value) && value !== 7 && value !== 14 && value !== 30 && value !== 90);
  const more = BASE[BASE.length - 1];
  const head = BASE.slice(0, -1);
  if (custom) return [...head, { d: value, key: 'detail.everyDays', n: value }, more];
  return BASE;
}

/** One-tap reminder interval on the add screen, plus More… for the full editor. */
export function ReminderChips({ value, onChange, onMore }) {
  const c = useThemeColors();
  return (
    <View style={styles.chips}>
      {reminderOptions(value).map((o) => {
        const on = value === o.d;
        return (
          <TouchableOpacity
            key={String(o.d)}
            testID={`reminder-chip-${o.d ?? 'off'}`}
            onPress={() => {
              if (o.d === 'more') onMore?.();
              else onChange(o.d);
            }}
            style={[styles.chip, { backgroundColor: on ? c.brand : c.fill }]}
          >
            <Text style={{ color: on ? c.onbrand : c.label, fontFamily: on ? 'BeenAgesRounded-Bold' : 'BeenAgesRounded-Regular', fontSize: 14 }}>
              {o.n ? t(o.key, { n: o.n }) : t(o.key)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 16 },
});
