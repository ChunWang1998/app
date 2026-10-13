import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useActivities, addActivity, updateActivity } from '../data/repository';
import { useThemeColors } from '../theme/useTheme';
import { itemPalette } from '../theme/colors';
import { ItemGlyph } from '../components/ItemGlyph';

const KINDS = ['brush', 'drop', 'eye', 'leaf', 'bed', 'scissors'];

export default function EditScreen() {
  const nav = useNavigation();
  const { params } = useRoute();
  const { activities } = useActivities();
  const current = activities.find((a) => a.id === params?.id);
  const c = useThemeColors();
  const [title, setTitle] = useState(current?.title || '');
  const [icon, setIcon] = useState(current?.icon || 'drop');
  const [reminderDays, setReminderDays] = useState(current?.reminderDays || 0);

  async function save() {
    if (current) {
      await updateActivity(current.id, { title, icon, reminderDays: reminderDays || null });
    } else {
      await addActivity({ title, reminderDays: reminderDays || null });
    }
    nav.goBack();
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.sheetbg }}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => nav.goBack()}><Text style={{ color: c.label }}>取消</Text></TouchableOpacity>
        <Text style={[styles.title, { color: c.label }]}>{current ? '編輯' : '新增'}</Text>
        <TouchableOpacity onPress={save}><Text style={{ color: c.brand }}>完成</Text></TouchableOpacity>
      </View>
      <View style={[styles.grp, { backgroundColor: c.cell }]}>
        <View style={styles.row}>
          <TextInput value={title} onChangeText={setTitle} placeholder="要記的事" placeholderTextColor={c.l3} style={[styles.input, { color: c.label }]} />
        </View>
        <View style={[styles.icp]}>
          {KINDS.map((k) => {
            const pal = itemPalette[k];
            const tone = (c.bg === '#1B1917' ? pal.dark : pal.light);
            return (
              <TouchableOpacity onPress={() => setIcon(k)} key={k} style={[styles.icBtn, { backgroundColor: icon === k ? c.brand : c.cell }]}>
                <ItemGlyph kind={k} color={icon === k ? c.onbrand : tone.acf} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={[styles.grp, { backgroundColor: c.cell, marginTop: 12 }]}>
        <View style={styles.row}>
          <Text style={{ color: c.label, fontSize: 17 }}>提醒</Text>
          <TouchableOpacity onPress={() => setReminderDays((reminderDays || 0) + 1)} style={styles.pill}>
            <Text style={{ color: c.label }}>{reminderDays ? `每 ${reminderDays} 天` : '不提醒'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  title: { fontWeight: '600', fontSize: 17 },
  grp: { marginHorizontal: 16, borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingHorizontal: 16, gap: 12 },
  input: { flex: 1, fontSize: 22, fontWeight: '600', paddingVertical: 14 },
  icp: { flexDirection: 'row', gap: 10, padding: 14, justifyContent: 'space-between', marginHorizontal: 4 },
  icBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  pill: { marginLeft: 'auto', backgroundColor: 'rgba(0,0,0,0.06)', paddingVertical: 6, paddingHorizontal: 11, borderRadius: 8 }
});
