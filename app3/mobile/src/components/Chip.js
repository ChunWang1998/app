import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

export default function Chip({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, selected && styles.on]}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, selected && styles.textOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: '#F4EDE3',
    marginRight: 8,
    marginBottom: 8,
  },
  on: { backgroundColor: colors.brand },
  text: { fontSize: 13, fontWeight: '700', color: colors.ink },
  textOn: { color: '#fff' },
});
