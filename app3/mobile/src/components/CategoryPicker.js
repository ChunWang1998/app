import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useThemeColors } from '../theme/useTheme';
import { CategoryGlyph } from './CategoryGlyph';
import { CheckIcon } from './Icons';
import { OTHER_ID, OTHER_ICON, categoryName } from '../lib/categories';
import { t } from '../i18n';

/** Bottom sheet: pick one category (Other last). */
export function CategoryPicker({ visible, categories, value, onPick, onClose }) {
  const c = useThemeColors();
  const all = [...categories, { id: OTHER_ID, icon: OTHER_ICON }];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.dim} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.sheetbg || c.cell }]}>
        <Text style={[styles.title, { color: c.label }]}>{t('category.title')}</Text>
        <ScrollView contentContainerStyle={styles.grid}>
          {all.map((cat) => {
            const on = cat.id === value;
            const name = categoryName(cat, t);
            return (
              <TouchableOpacity
                key={cat.id}
                testID={`pick-${cat.id}`}
                onPress={() => onPick(cat.id)}
                style={[styles.cell, { backgroundColor: c.cell, borderColor: on ? c.brand : 'transparent' }]}
              >
                <CategoryGlyph icon={cat.icon} name={name} />
                <Text numberOfLines={1} style={[styles.name, { color: c.label }]}>{name}</Text>
                {on ? <CheckIcon color={c.brand} size={14} /> : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingBottom: 34, maxHeight: '60%' },
  title: { fontFamily: 'BeenAgesRounded-SemiBold', fontSize: 17, textAlign: 'center', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  cell: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, borderWidth: 1.5 },
  name: { flex: 1, fontFamily: 'BeenAgesRounded-Regular', fontSize: 16 },
});
