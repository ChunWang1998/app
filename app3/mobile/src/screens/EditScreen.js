import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivities, addActivity, updateActivity, softDeleteActivity, FREE_ACTIVITY_LIMIT } from '../data/repository';
import { useThemeColors, useItemTone, useTheme } from '../theme/useTheme';
import { ItemGlyph } from '../components/ItemGlyph';
import { ChevronRightIcon } from '../components/Icons';
import { isProUnlocked } from '../lib/entitlements';
import { formatDate, formatTime } from '../lib/time';

const PICKER = ['brush', 'drop', 'eye', 'pill', 'leaf', 'bed', 'scissors', 'car'];

export default function EditScreen() {
  const nav = useNavigation();
  const { params } = useRoute();
  const { activities } = useActivities();
  const current = activities.find((a) => a.id === params?.id);
  const c = useThemeColors();
  const { reminderTime: defaultTime } = useTheme();
  const insets = useSafeAreaInsets();
  const isNew = !current;
  const [title, setTitle] = useState(current?.title || '');
  const [icon, setIcon] = useState(current?.icon || 'brush');
  const [notes, setNotes] = useState(current?.notes || '');
  const [lastDoneAt, setLastDoneAt] = useState(current?.lastDoneAt || null);
  const [busy, setBusy] = useState(false);

  const remLabel = current?.reminderDays ? `每 ${current.reminderDays} 天` : '不提醒';

  async function save() {
    if (busy) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      if (current) {
        const patch = { title: trimmed, icon, notes };
        if (lastDoneAt !== current.lastDoneAt) {
          const rest = (current.history || []).filter((e) => e.at !== current.lastDoneAt);
          patch.history = lastDoneAt ? [{ at: lastDoneAt }, ...rest] : rest;
        }
        await updateActivity(current.id, patch);
      } else {
        const pro = await isProUnlocked();
        if (!pro && activities.length >= FREE_ACTIVITY_LIMIT) {
          nav.replace('Paywall');
          return;
        }
        try {
          await addActivity({
            title: trimmed,
            icon,
            notes,
            lastDoneAt,
            reminderDays: null,
            reminderTime: defaultTime,
          });
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

  function setLastToday() {
    const d = lastDoneAt ? new Date(lastDoneAt) : new Date();
    const n = new Date();
    n.setHours(d.getHours(), d.getMinutes(), 0, 0);
    setLastDoneAt(n.toISOString());
  }

  function setLastNowTime() {
    const d = lastDoneAt ? new Date(lastDoneAt) : new Date();
    const n = new Date();
    d.setHours(n.getHours(), n.getMinutes(), 0, 0);
    setLastDoneAt(d.toISOString());
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
          {PICKER.map((k) => (
            <IconBtn key={k} k={k} on={icon === k} onPress={() => setIcon(k)} idle={c.cell} dim={c.l2} />
          ))}
        </View>

        <View style={[styles.grp, { backgroundColor: c.cell, marginTop: 18 }]}>
          <View style={[styles.row, styles.rowLine]}>
            <Text style={[styles.lab, { color: c.label }]}>上次</Text>
            <TouchableOpacity onPress={setLastToday} style={[styles.pill, { backgroundColor: c.fill }]}>
              <Text style={{ color: c.label, fontFamily: 'NaikaiSubset-Regular' }}>
                {lastDoneAt ? formatDate(lastDoneAt) : '今天'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={setLastNowTime} style={[styles.pill, { backgroundColor: c.fill }]}>
              <Text style={{ color: c.label, fontFamily: 'NaikaiSubset-Regular' }}>
                {lastDoneAt ? formatTime(lastDoneAt) : formatTime(new Date().toISOString())}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              if (current) nav.navigate('Reminder', { id: current.id });
              else Alert.alert('提醒', '先加入項目，再到詳情設定提醒。');
            }}
          >
            <Text style={[styles.lab, { color: c.label }]}>提醒</Text>
            <Text style={{ color: c.l2, fontFamily: 'NaikaiSubset-Regular', marginLeft: 'auto', marginRight: 6 }}>
              {remLabel}
            </Text>
            <ChevronRightIcon color={c.l3} />
          </TouchableOpacity>
        </View>

        <View style={[styles.grp, { backgroundColor: c.cell, marginTop: 18, minHeight: 96 }]}>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="備註"
            placeholderTextColor={c.l3}
            multiline
            style={[styles.notes, { color: c.label }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]}
          />
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

function IconBtn({ k, on, onPress, idle, dim }) {
  const tone = useItemTone(k);
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.icBtn, { backgroundColor: on ? tone.ac : idle }]}
      accessibilityLabel={k}
    >
      <ItemGlyph kind={k} color={on ? tone.acf : dim} />
    </TouchableOpacity>
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
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingHorizontal: 16, gap: 10 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(46,41,37,0.09)' },
  input: { flex: 1, fontSize: 22, fontFamily: 'NaikaiSubset-SemiBold', paddingVertical: 14 },
  lab: { fontSize: 17, fontFamily: 'NaikaiSubset-Regular', minWidth: 44 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  notes: {
    minHeight: 96,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 17,
    fontFamily: 'NaikaiSubset-Regular',
    textAlignVertical: 'top',
  },
  icp: { flexDirection: 'row', gap: 6, paddingTop: 14, paddingHorizontal: 16, justifyContent: 'space-between' },
  icBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
