import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { usePrefs } from '../context/AppPrefs';
import { radius } from '../theme';

export default function Chip({ label, selected, onPress }) {
  const { colors } = usePrefs();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? colors.brand : colors.chipOn },
      ]}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.text,
          { color: selected ? '#fff' : colors.ink },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    marginRight: 8,
    marginBottom: 8,
  },
  text: { fontSize: 13, fontWeight: '700' },
});
