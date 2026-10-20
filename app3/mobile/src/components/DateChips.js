import React, { createElement } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useThemeColors } from '../theme/useTheme';
import { QUICK_DATES, QUICK_DATE_KEYS, quickDateIso, quickDateFor, pickedDateIso, isoToYmd, ymdToIso } from '../lib/quickDates';
import { t } from '../i18n';

let DateTimePicker = null;
if (Platform.OS !== 'web') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch {
    DateTimePicker = null;
  }
}

function DatePickerField({ value, onChange, now }) {
  const c = useThemeColors();
  const ymd = isoToYmd(value);
  const maxYmd = isoToYmd(now.toISOString());
  const commitYmd = (raw) => {
    const next = ymdToIso(raw, now);
    if (next) onChange(next);
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.picker} testID="date-picker">
        {createElement('input', {
          type: 'date',
          'data-testid': 'date-picker-input',
          value: ymd,
          max: maxYmd,
          onChange: (e) => commitYmd(e.target?.value),
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
          testID="date-picker"
          value={value ? new Date(value) : now}
          mode="date"
          display={Platform.OS === 'ios' ? 'compact' : 'default'}
          maximumDate={now}
          onChange={(_e, d) => { if (d) onChange(pickedDateIso(d, now)); }}
        />
      </View>
    );
  }

  return (
    <View style={styles.picker}>
      <TextInput
        testID="date-picker"
        value={ymd}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={c.l3}
        onChangeText={commitYmd}
        style={[styles.fallback, { color: c.label }]}
        accessibilityLabel={t('date.pick')}
      />
    </View>
  );
}

/**
 * Quick chips + date picker (any past date, including web).
 * `allowUnknown` adds the "don't remember" chip, which sets value to null.
 */
export function DateChips({ value, onChange, allowUnknown = true }) {
  const c = useThemeColors();
  const kinds = allowUnknown ? QUICK_DATES : QUICK_DATES.filter((k) => k !== 'unknown');
  const selected = quickDateFor(value);
  const now = new Date();
  const customOn = !!value && selected == null;
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
        <TouchableOpacity
          testID="date-chip-pick"
          onPress={() => {
            if (!value) onChange(pickedDateIso(now));
          }}
          style={[styles.chip, { backgroundColor: customOn ? c.brand : c.fill }]}
        >
          <Text style={{ color: customOn ? c.onbrand : c.label, fontFamily: customOn ? 'BeenAgesRounded-Bold' : 'BeenAgesRounded-Regular', fontSize: 14 }}>
            {t('date.pick')}
          </Text>
        </TouchableOpacity>
      </View>
      <DatePickerField value={value} onChange={onChange} now={now} />
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 16 },
  picker: { paddingHorizontal: 16, paddingBottom: 10, alignItems: 'flex-start' },
  fallback: { fontSize: 16, fontFamily: 'BeenAgesRounded-Regular', minWidth: 140, paddingVertical: 4 },
});
