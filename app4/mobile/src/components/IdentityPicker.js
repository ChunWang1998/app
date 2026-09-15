import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors, radius } from '../theme';
import { IDENTITIES } from '../data/identities';

/**
 * Multi-select identity chips.
 * @param {string[]} value
 * @param {(next: string[]) => void} onChange
 * @param {number} max
 * @param {boolean} [disabled]
 */
export default function IdentityPicker({ value = [], onChange, max, disabled }) {
  const selected = new Set(value);

  const toggle = (id) => {
    if (disabled) return;
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      if (next.size >= max) return;
      next.add(id);
    }
    onChange([...next]);
  };

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.content}
      nestedScrollEnabled
    >
      {IDENTITIES.map((item) => {
        const on = selected.has(item.id);
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.chip, on && styles.chipOn, disabled && styles.chipDisabled]}
            onPress={() => toggle(item.id)}
            activeOpacity={0.8}
            disabled={disabled}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { maxHeight: 280 },
  content: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  chipOn: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipDisabled: { opacity: 0.55 },
  chipText: { color: colors.ink, fontSize: 14 },
  chipTextOn: { color: '#fff', fontWeight: '600' },
});
