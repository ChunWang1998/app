import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivities, addCategory, updateCategory, deleteCategory, MAX_CATEGORIES } from '../data/repository';
import { useThemeColors, useItemTone } from '../theme/useTheme';
import { ItemGlyph } from '../components/ItemGlyph';
import { suggestIcon } from '../lib/suggestIcon';
import { categoryName, normalizeKeywords } from '../lib/categories';
import { t } from '../i18n';

export const CATEGORY_ICONS = ['brush', 'drop', 'pill', 'leaf', 'bed', 'scissors', 'car', 'eye', 'paw', 'plug', 'mono'];

export default function CategoryEditScreen() {
  const nav = useNavigation();
  const { params } = useRoute();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { categories, activities } = useActivities();
  const current = categories.find((x) => x.id === params?.id);
  const isNew = !current;
  const [name, setName] = useState(current ? categoryName(current, t) : '');
  const [icon, setIcon] = useState(current?.icon || 'mono');
  const [iconManual, setIconManual] = useState(!isNew);
  const [keywords, setKeywords] = useState(current?.keywords || []);
  const [draft, setDraft] = useState('');
  const tone = useItemTone(icon, name);

  function onName(text) {
    setName(text);
    if (!iconManual) setIcon(suggestIcon(text));
  }

  function commitDraft() {
    const k = draft.trim();
    if (k) setKeywords((list) => normalizeKeywords([...list, k]));
    setDraft('');
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const kw = normalizeKeywords([...keywords, draft]);
    try {
      if (isNew) {
        await addCategory({ name: trimmed, icon, keywords: kw });
      } else {
        const renamed = trimmed !== categoryName(current, t);
        await updateCategory(current.id, { ...(renamed ? { name: trimmed } : {}), icon, keywords: kw });
      }
      nav.goBack();
    } catch (e) {
      if (e?.code === 'CATEGORY_LIMIT') Alert.alert(t('category.limit', { n: MAX_CATEGORIES }));
      else if (e?.code === 'CATEGORY_DUP') Alert.alert(t('category.duplicate'));
      else Alert.alert(t('common.fail'), String(e?.message || e));
    }
  }

  function del() {
    const n = activities.filter((a) => a.categoryId === current.id).length;
    Alert.alert(categoryName(current, t), n ? t('category.deleteMoved', { n }) : '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteCategory(current.id);
          nav.goBack();
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.sheetbg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.nav, { paddingTop: insets.top ? 8 : 0 }]}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.side}>
          <Text style={{ color: c.brand, fontSize: 17, fontFamily: 'BeenAgesRounded-Regular' }}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.label }]}>{isNew ? t('category.newCategory') : t('edit.edit')}</Text>
        <TouchableOpacity onPress={save} style={[styles.side, { alignItems: 'flex-end' }]} disabled={!name.trim()} testID="cat-save">
          <Text style={{ color: name.trim() ? c.brand : c.l3, fontSize: 17, fontFamily: 'BeenAgesRounded-SemiBold' }}>
            {isNew ? t('edit.add') : t('common.done')}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <View style={[styles.grp, { backgroundColor: c.cell }]}>
          <View style={styles.row}>
            <View style={[styles.preview, { backgroundColor: tone.ac }]}>
              <ItemGlyph kind={icon} color={tone.acf} letter={name} />
            </View>
            <TextInput
              value={name}
              onChangeText={onName}
              placeholder={t('category.name')}
              placeholderTextColor={c.l3}
              autoFocus={isNew}
              maxLength={40}
              testID="cat-name"
              style={[styles.input, { color: c.label }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]}
            />
          </View>
        </View>
        <View style={styles.icp}>
          {CATEGORY_ICONS.map((k) => (
            <IconBtn key={k} k={k} on={icon === k} name={name} onPress={() => { setIconManual(true); setIcon(k); }} idle={c.cell} dim={c.l2} />
          ))}
        </View>

        <Text style={[styles.lab, { color: c.l2 }]}>{t('category.keywords')}</Text>
        <View style={[styles.grp, { backgroundColor: c.cell, marginTop: 8 }]}>
          <View style={styles.kws}>
            {keywords.map((k) => (
              <TouchableOpacity
                key={k}
                onPress={() => setKeywords((list) => list.filter((x) => x !== k))}
                style={[styles.kw, { backgroundColor: tone.ac }]}
                accessibilityLabel={`${t('common.delete')} ${k}`}
              >
                <Text style={{ color: tone.acf, fontFamily: 'BeenAgesRounded-Regular', fontSize: 15 }}>{k}</Text>
                <Text style={{ color: tone.acf, fontSize: 13 }}>{'\u00d7'}</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={commitDraft}
              blurOnSubmit={false}
              returnKeyType="done"
              placeholder="+"
              placeholderTextColor={c.l3}
              maxLength={40}
              testID="cat-kw-input"
              style={[styles.kwInput, { color: c.label, backgroundColor: c.fill }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]}
            />
          </View>
        </View>

        {!isNew ? (
          <View style={[styles.grp, { backgroundColor: c.cell, marginTop: 24 }]}>
            <TouchableOpacity onPress={del} style={[styles.row, { justifyContent: 'center' }]} testID="cat-delete">
              <Text style={{ color: c.red, fontSize: 17, fontFamily: 'BeenAgesRounded-Regular' }}>{t('common.delete')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function IconBtn({ k, on, name, onPress, idle, dim }) {
  const tone = useItemTone(k, name);
  return (
    <View style={styles.icCell}>
      <TouchableOpacity onPress={onPress} style={[styles.icBtn, { backgroundColor: on ? tone.ac : idle }]} accessibilityLabel={k}>
        <ItemGlyph kind={k} color={on ? tone.acf : dim} letter={name || '\u00b7'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  side: { minWidth: 64, height: 44, justifyContent: 'center' },
  title: { fontFamily: 'BeenAgesRounded-SemiBold', fontSize: 17 },
  grp: { marginHorizontal: 16, borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingHorizontal: 16, gap: 10 },
  input: { flex: 1, fontSize: 22, fontFamily: 'BeenAgesRounded-SemiBold', paddingVertical: 14 },
  preview: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  icp: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, paddingTop: 14, paddingHorizontal: 16 },
  icCell: { width: '20%', alignItems: 'center' },
  icBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  lab: { fontSize: 14, fontFamily: 'BeenAgesRounded-Regular', paddingHorizontal: 32, paddingTop: 24 },
  kws: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  kw: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 14 },
  kwInput: { minWidth: 72, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 14, fontSize: 15, fontFamily: 'BeenAgesRounded-Regular' },
});
