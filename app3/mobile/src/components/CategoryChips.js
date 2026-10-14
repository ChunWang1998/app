import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors } from '../theme/useTheme';
import { CategoryGlyph } from './CategoryGlyph';
import { OTHER_ID, OTHER_ICON, categoryName } from '../lib/categories';
import { t } from '../i18n';

/** Chips to show, in category order with Other last; empty categories are hidden. */
export function chipList(categories, counts) {
  return [...categories, { id: OTHER_ID, icon: OTHER_ICON }].filter((cat) => (counts[cat.id] || 0) > 0);
}

/** Home filter: All + categories that have items. */
export function CategoryChips({ categories, counts, total, value, onChange }) {
  const c = useThemeColors();
  const chip = (id, label, n, glyph) => {
    const on = value === id;
    return (
      <TouchableOpacity
        key={id}
        testID={`chip-${id}`}
        onPress={() => onChange(id)}
        style={[styles.chip, { backgroundColor: on ? c.brand : c.cell }]}
      >
        {glyph ? glyph(on) : null}
        <Text style={{ color: on ? c.onbrand : c.label, fontFamily: on ? 'BeenAgesRounded-SemiBold' : 'BeenAgesRounded-Regular', fontSize: 15 }}>
          {label}
        </Text>
        <Text style={{ color: on ? c.onbrand : c.l2, fontSize: 13, fontFamily: 'BeenAgesRounded-Regular', opacity: 0.8 }}>{n}</Text>
      </TouchableOpacity>
    );
  };
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bar} style={{ flexGrow: 0 }}>
      {chip('all', t('category.all'), total)}
      {chipList(categories, counts).map((cat) => {
        const name = categoryName(cat, t);
        return chip(cat.id, name, counts[cat.id], (on) => (
          <CategoryGlyph icon={cat.icon} name={name} size={22} glyph={13} inverted={on} onColor={c.onbrand} />
        ));
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingLeft: 6, paddingRight: 12, borderRadius: 18, minHeight: 32 },
});
