import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

export default function TabBar({ tab, onChange }) {
  return (
    <View style={styles.bar}>
      {[
        { id: 'explore', label: '探索' },
        { id: 'gatherings', label: '聚會' },
      ].map((t) => {
        const on = tab === t.id;
        return (
          <TouchableOpacity
            key={t.id}
            style={[styles.item, on && styles.itemOn]}
            onPress={() => onChange(t.id)}
          >
            <Text style={[styles.label, on && styles.labelOn]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 10,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  itemOn: { backgroundColor: '#FBE6D4' },
  label: { fontSize: 15, fontWeight: '700', color: colors.muted },
  labelOn: { color: colors.brandDeep },
});
