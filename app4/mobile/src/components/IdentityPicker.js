import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { colors, radius } from '../theme';
import { IDENTITY_CATEGORIES, IDENTITIES } from '../data/identities';

/**
 * Hierarchical multi-select identity picker (104-style: 大類 → 小類 → 職稱).
 * @param {string[]} value
 * @param {(next: string[]) => void} onChange
 * @param {number} max
 * @param {boolean} [disabled]
 */
export default function IdentityPicker({ value = [], onChange, max, disabled }) {
  const selected = useMemo(() => new Set(value), [value]);
  const [categoryId, setCategoryId] = useState(IDENTITY_CATEGORIES[0]?.id);
  const [query, setQuery] = useState('');

  const category = IDENTITY_CATEGORIES.find((c) => c.id === categoryId) || IDENTITY_CATEGORIES[0];

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return IDENTITIES.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q),
    );
  }, [query]);

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

  const renderChip = (item) => {
    const on = selected.has(item.id);
    const atMax = !on && selected.size >= max;
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.chip,
          on && styles.chipOn,
          (disabled || atMax) && !on && styles.chipDisabled,
        ]}
        onPress={() => toggle(item.id)}
        activeOpacity={0.8}
        disabled={disabled || (atMax && !on)}
      >
        <Text style={[styles.chipText, on && styles.chipTextOn]}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrap}>
      {selected.size > 0 && (
        <View style={styles.selectedBox}>
          <Text style={styles.selectedLabel}>已選（{selected.size}/{max}）</Text>
          <View style={styles.chipRow}>
            {value.map((id) => {
              const item = IDENTITIES.find((x) => x.id === id);
              if (!item) return null;
              return renderChip(item);
            })}
          </View>
        </View>
      )}

      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="搜尋職稱…"
        placeholderTextColor={colors.muted}
        editable={!disabled}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {searchResults ? (
        <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {searchResults.length === 0 ? (
            <Text style={styles.empty}>找不到符合的職稱</Text>
          ) : (
            <View style={styles.chipRow}>{searchResults.map(renderChip)}</View>
          )}
        </ScrollView>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryBar}
            contentContainerStyle={styles.categoryContent}
            nestedScrollEnabled
          >
            {IDENTITY_CATEGORIES.map((cat) => {
              const on = cat.id === categoryId;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, on && styles.categoryChipOn]}
                  onPress={() => setCategoryId(cat.id)}
                  activeOpacity={0.8}
                  disabled={disabled}
                >
                  <Text style={[styles.categoryText, on && styles.categoryTextOn]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {category.groups.map((group) => (
              <View key={group.id} style={styles.group}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                <View style={styles.chipRow}>{group.items.map(renderChip)}</View>
              </View>
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  selectedBox: {
    backgroundColor: '#F7FAF8',
    borderRadius: radius.row,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 6,
  },
  selectedLabel: { fontSize: 12, fontWeight: '600', color: colors.muted },
  search: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.row,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: '#FAFCFA',
  },
  categoryBar: { maxHeight: 44 },
  categoryContent: { gap: 8, paddingVertical: 2 },
  categoryChip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  categoryChipOn: {
    backgroundColor: colors.brandDeep,
    borderColor: colors.brandDeep,
  },
  categoryText: { color: colors.ink, fontSize: 13, fontWeight: '500' },
  categoryTextOn: { color: '#fff', fontWeight: '600' },
  list: { maxHeight: 260 },
  group: { marginBottom: 12, gap: 6 },
  groupLabel: { fontSize: 13, fontWeight: '600', color: colors.muted },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  chipDisabled: { opacity: 0.45 },
  chipText: { color: colors.ink, fontSize: 14 },
  chipTextOn: { color: '#fff', fontWeight: '600' },
  empty: { color: colors.muted, fontSize: 14, paddingVertical: 8 },
});
