import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors } from '../theme/useTheme';
import { t } from '../i18n';

const BASE = [
  { d: null, key: 'detail.noReminder' },
  { d: 7, key: 'reminder.weekly' },
  { d: 14, key: 'reminder.twoWeeks' },
  { d: 30, key: 'reminder.monthly' },
  { d: 90, key: 'reminder.threeMonths' },
];

export function reminderOptions(value) {
  if (value == null || BASE.some((o) => o.d === value)) return BASE;
  return [...BASE, { d: value, key: 'detail.everyDays', n: value }];
}

/** One-tap reminder interval on the add screen. */
export function ReminderChips({ value, onChange }) {
  const c = useThemeColors();
  return (
    <View style={styles.chips}>
      {reminderOptions(value).map((o) => {
        const on = value === o.d;
        return (
          <TouchableOpacity
            key={String(o.d)}
            testID={`reminder-chip-${o.d ?? 'off'}`}
            onPress={() => onChange(o.d)}
            style={[styles.chip, { backgroundColor: on ? c.brand : c.fill }]}
          >
            <Text style={{ color: on ? c.onbrand : c.label, fontFamily: on ? 'NaikaiSubset-Bold' : 'NaikaiSubset-Regular', fontSize: 14 }}>
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
