import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { usePrefs } from '../context/AppPrefs';
import { radius } from '../theme';

const TAB_IDS = ['explore', 'gatherings', 'settings'];

export default function TabBar({ tab, onChange }) {
  const { colors, t } = usePrefs();
  const labels = {
    explore: t('explore'),
    gatherings: t('gatherings'),
    settings: t('settings'),
  };

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: colors.card, borderTopColor: colors.line },
      ]}
    >
      {TAB_IDS.map((id) => {
        const on = tab === id;
        return (
          <TouchableOpacity
            key={id}
            style={[
              styles.item,
              on && { backgroundColor: colors.chipOn },
            ]}
            onPress={() => onChange(id)}
          >
            <Text
              style={[
                styles.label,
                { color: on ? colors.brandDeep : colors.muted },
              ]}
            >
              {labels[id]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  label: { fontSize: 14, fontWeight: '700' },
});
