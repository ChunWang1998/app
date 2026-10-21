import React, { createElement } from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { useThemeColors } from '../theme/useTheme';
import { t } from '../i18n';
import {
  DEFAULT_REMINDER_TIME,
  formatHm,
  parseHm,
  uses24HourClock,
} from '../lib/reminderSchedule';

let DateTimePicker = null;
if (Platform.OS !== 'web') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch {
    DateTimePicker = null;
  }
}

function dateFromTime(time) {
  const { h, min } = parseHm(time || DEFAULT_REMINDER_TIME);
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d;
}

function commitRaw(raw, onChange) {
  if (raw instanceof Date && Number.isFinite(raw.getTime())) {
    onChange(formatHm(raw.getHours(), raw.getMinutes()));
    return;
  }
  const m = /^(\d{1,2}):(\d{2})/.exec(String(raw || ''));
  if (m) onChange(formatHm(m[1], m[2]));
}

function TimePickerField({ time, onChange }) {
  const c = useThemeColors();
  const value = time || DEFAULT_REMINDER_TIME;
  const uses24h = uses24HourClock();

  if (Platform.OS === 'web') {
    return (
      <View style={styles.picker} testID="time-picker">
        {createElement('input', {
          type: 'time',
          'data-testid': 'time-picker-input',
          value,
          onChange: (e) => commitRaw(e.target?.value, onChange),
          style: {
            fontSize: 16,
            fontFamily: 'BeenAgesRounded-Regular',
            color: c.label,
            backgroundColor: 'transparent',
            border: 'none',
            padding: 0,
          },
        })}
      </View>
    );
  }

  if (DateTimePicker) {
    return (
      <View style={styles.picker}>
        <DateTimePicker
          testID="time-picker"
          value={dateFromTime(value)}
          mode="time"
          display={Platform.OS === 'ios' ? 'compact' : 'default'}
          is24Hour={uses24h}
          onChange={(_e, d) => { if (d) commitRaw(d, onChange); }}
        />
      </View>
    );
  }

  return (
    <View style={styles.picker}>
      <TextInput
        testID="time-picker"
        value={value}
        placeholder={DEFAULT_REMINDER_TIME}
        placeholderTextColor={c.l3}
        onChangeText={(text) => commitRaw(text, onChange)}
        style={[styles.fallback, { color: c.label }]}
        accessibilityLabel={t('reminder.time')}
      />
    </View>
  );
}

/** Native time-of-day row. Parent should render it only when reminders are on. */
export function TimePickerRow({ time, onChange }) {
  const c = useThemeColors();
  return (
    <View testID="reminder-time-row" style={styles.row}>
      <Text style={[styles.lab, { color: c.label }]}>{t('reminder.time')}</Text>
      <TimePickerField time={time} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 12,
  },
  lab: { fontSize: 17, fontFamily: 'BeenAgesRounded-Regular' },
  picker: { flex: 1, alignItems: 'flex-end' },
  fallback: { fontSize: 16, fontFamily: 'BeenAgesRounded-Regular', minWidth: 72, paddingVertical: 4, textAlign: 'right' },
});
