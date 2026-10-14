import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivities, MAX_CATEGORIES } from '../data/repository';
import { useThemeColors } from '../theme/useTheme';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '../components/Icons';
import { CategoryGlyph } from '../components/CategoryGlyph';
import { OTHER_ID, OTHER_ICON, categoryName } from '../lib/categories';
import { t } from '../i18n';

export default function CategoriesScreen() {
  const nav = useNavigation();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { activities, categories } = useActivities();
  const count = (id) => activities.filter((a) => (a.categoryId || OTHER_ID) === id).length;

  const row = (cat, { onPress, last } = {}) => {
    const name = categoryName(cat, t);
    const Wrap = onPress ? TouchableOpacity : View;
    return (
      <Wrap
        key={cat.id}
        testID={`cat-row-${cat.id}`}
        onPress={onPress}
        style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.sep }]}
      >
        <CategoryGlyph icon={cat.icon} name={name} />
        <Text numberOfLines={1} style={[styles.name, { color: c.label }]}>{name}</Text>
        <Text style={[styles.count, { color: c.l2 }]}>{count(cat.id)}</Text>
        {onPress ? <ChevronRightIcon color={c.l3} /> : null}
      </Wrap>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.set, paddingTop: insets.top }}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.navBtn} accessibilityLabel={t('common.back')}>
          <ChevronLeftIcon color={c.brand} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.label }]}>{t('category.title')}</Text>
        <View style={styles.navBtn} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <View style={[styles.grp, { backgroundColor: c.cell }]}>
          {categories.map((cat) => row(cat, { onPress: () => nav.navigate('CategoryEdit', { id: cat.id }) }))}
          <TouchableOpacity
            testID="cat-add"
            onPress={() => {
              if (categories.length >= MAX_CATEGORIES) {
                Alert.alert(t('category.limit', { n: MAX_CATEGORIES }));
                return;
              }
              nav.navigate('CategoryEdit', {});
            }}
            style={styles.row}
          >
            <View style={[styles.plus, { backgroundColor: c.tint }]}><PlusIcon color={c.brand} size={16} /></View>
            <Text style={[styles.name, { color: c.brand }]}>{t('category.newCategory')}</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.grp, { backgroundColor: c.cell, marginTop: 24 }]}>
          {row({ id: OTHER_ID, icon: OTHER_ICON }, { last: true })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'BeenAgesRounded-SemiBold', fontSize: 17 },
  grp: { marginHorizontal: 16, borderRadius: 18, overflow: 'hidden', marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 14, gap: 12 },
  name: { flex: 1, fontSize: 17, fontFamily: 'BeenAgesRounded-Regular' },
  count: { fontSize: 16, fontFamily: 'BeenAgesRounded-Regular', marginRight: 4 },
  plus: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
