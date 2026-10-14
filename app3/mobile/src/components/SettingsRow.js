import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { ChevronRightIcon } from './Icons';
import { useThemeColors } from '../theme/useTheme';

export function SettingsSwitch({ value, onValueChange, accessibilityLabel }) {
  const c = useThemeColors();
  return (
    <View style={styles.switchWrap}>
      <Switch
        value={!!value}
        onValueChange={onValueChange}
        trackColor={{ false: c.fill, true: c.brand }}
        thumbColor="#fff"
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

/** One settings line: 46pt, vertically centered, optional native Switch. */
export function SettingsRow({
  icon,
  title,
  value,
  onPress,
  chev,
  last,
  right,
  accessibilityLabel,
}) {
  const c = useThemeColors();
  const inner = (
    <>
      {icon || null}
      <Text style={[styles.title, { color: c.label }]}>{title}</Text>
      {value ? <Text style={[styles.value, { color: c.l2 }]}>{value}</Text> : null}
      {right || null}
      {chev ? <ChevronRightIcon color={c.l3} /> : null}
    </>
  );
  const rowStyle = [styles.row, !last && { ...styles.line, borderBottomColor: c.sep }];
  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={rowStyle}
        activeOpacity={0.6}
        accessibilityLabel={accessibilityLabel || title}
      >
        {inner}
      </TouchableOpacity>
    );
  }
  return <View style={rowStyle}>{inner}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: 16,
    gap: 12,
  },
  line: { borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 17, fontFamily: 'NaikaiSubset-Regular', flex: 1 },
  value: { fontSize: 17, fontFamily: 'NaikaiSubset-Regular' },
  switchWrap: { justifyContent: 'center', flexShrink: 0 },
});
