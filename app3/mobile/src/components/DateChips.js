import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useThemeColors } from '../theme/useTheme';
import { QUICK_DATES, QUICK_DATE_KEYS, quickDateIso, quickDateFor, pickedDateIso } from '../lib/quickDates';
import { t } from '../i18n';

let DateTimePicker = null;
if (Platform.OS !== 'web') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch {
    DateTimePicker = null;
  }
}

/**
 * Quick chips + system date picker (any past date).
 * `allowUnknown` adds the "don't remember" chip, which sets value to null.
 */
export function DateChips({ value, onChange, allowUnknown = true }) {
  const c = useThemeColors();
  const kinds = allowUnknown ? QUICK_DATES : QUICK_DATES.filter((k) => k !== 'unknown');
  const selected = quickDateFor(value);
  const now = new Date();
  return (
    <View>
      <View style={styles.chips}>
        {kinds.map((k) => {
          const on = selected === k;
          return (
            <TouchableOpacity
              key={k}
              testID={`date-chip-${k}`}
              onPress={() => onChange(quickDateIso(k))}
              style={[styles.chip, { backgroundColor: on ? c.brand : c.fill }]}
            >
              <Text style={{ color: on ? c.onbrand : c.label, fontFamily: on ? 'BeenAgesRounded-Bold' : 'BeenAgesRounded-Regular', fontSize: 14 }}>
                {t(QUICK_DATE_KEYS[k])}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {DateTimePicker && value ? (
        <View style={styles.picker}>
          <DateTimePicker
            testID="date-picker"
            value={new Date(value)}
            mode="date"
            display={Platform.OS === 'ios' ? 'compact' : 'default'}
            maximumDate={now}
            onChange={(_e, d) => { if (d) onChange(pickedDateIso(d)); }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 16 },
  picker: { paddingHorizontal: 16, paddingBottom: 10, alignItems: 'flex-start' },
});
