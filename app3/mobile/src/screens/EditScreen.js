import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivities, addActivity, updateActivity, softDeleteActivity, FREE_ACTIVITY_LIMIT } from '../data/repository';
import { useThemeColors } from '../theme/useTheme';
import { itemPalette } from '../theme/colors';
import { ItemGlyph } from '../components/ItemGlyph';
import { isProUnlocked } from '../lib/entitlements';

const PICKER = ['brush', 'drop', 'eye', 'pill', 'leaf', 'bed', 'scissors', 'car'];

export default function EditScreen() {
  const nav = useNavigation();
  const { params } = useRoute();
  const { activities } = useActivities();
  const current = activities.find((a) => a.id === params?.id);
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const isNew = !current;
  const [title, setTitle] = useState(current?.title || '');
  const [icon, setIcon] = useState(current?.icon || 'brush');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (busy) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      if (current) {
        await updateActivity(current.id, { title: trimmed, icon });
      } else {
        const pro = await isProUnlocked();
        if (!pro && activities.length >= FREE_ACTIVITY_LIMIT) {
          nav.replace('Paywall');
          return;
        }
        try {
          await addActivity({ title: trimmed, icon, reminderDays: null });
        } catch (e) {
          if (e?.code === 'FREE_LIMIT') {
            nav.replace('Paywall');
            return;
          }
          throw e;
        }
      }
      nav.goBack();
    } catch (e) {
      Alert.alert('失敗', String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  function del() {
    if (!current) return nav.goBack();
    Alert.alert(current.title, '', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          await softDeleteActivity(current.id);
          nav.reset({ index: 0, routes: [{ name: 'Home' }] });
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.sheetbg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.nav, { paddingTop: 8 }]}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.navSide}>
          <Text style={{ color: c.brand, fontSize: 17, fontFamily: 'NaikaiSubset-Regular' }}>取消</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.label }]}>{isNew ? '新項目' : '編輯'}</Text>
        <TouchableOpacity onPress={save} style={styles.navSideRight} disabled={busy || !title.trim()}>
          <Text style={{ color: title.trim() ? c.brand : c.l3, fontSize: 17, fontFamily: 'NaikaiSubset-SemiBold' }}>
            {isNew ? '加入' : '完成'}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <View style={[styles.grp, { backgroundColor: c.cell }]}>
          <View style={styles.row}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="要記的事"
              placeholderTextColor={c.l3}
              style={[styles.input, { color: c.label }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]}
              autoFocus={isNew}
            />
          </View>
        </View>
        <View style={styles.icp}>
          {PICKER.map((k) => {
            const pal = itemPalette[k] || itemPalette.brush;
            const on = icon === k;
            return (
              <TouchableOpacity
                onPress={() => setIcon(k)}
                key={k}
                style={[styles.icBtn, { backgroundColor: on ? pal.light.ac : c.cell }]}
                accessibilityLabel={k}
              >
                <ItemGlyph kind={k} color={on ? pal.light.acf : c.l2} />
              </TouchableOpacity>
            );
          })}
        </View>
        {!!current && (
          <View style={[styles.grp, { backgroundColor: c.cell, marginTop: 24 }]}>
            <TouchableOpacity onPress={del} style={[styles.row, { justifyContent: 'center' }]}>
              <Text style={{ color: c.red, fontSize: 17, fontFamily: 'NaikaiSubset-Regular' }}>刪除</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  nav: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  navSide: { minWidth: 64, height: 44, justifyContent: 'center' },
  navSideRight: { minWidth: 64, height: 44, justifyContent: 'center', alignItems: 'flex-end' },
  title: { fontFamily: 'NaikaiSubset-SemiBold', fontSize: 17 },
  grp: { marginHorizontal: 16, borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingHorizontal: 16 },
  input: { flex: 1, fontSize: 22, fontFamily: 'NaikaiSubset-SemiBold', paddingVertical: 14 },
  icp: { flexDirection: 'row', gap: 6, paddingTop: 14, paddingHorizontal: 16, justifyContent: 'space-between' },
  icBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
