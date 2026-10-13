import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useActivities, updateActivity } from '../data/repository';
import { useThemeColors } from '../theme/useTheme';

export default function ReminderScreen() {
  const { params } = useRoute();
  const { activities } = useActivities();
  const item = activities.find((a) => a.id === params?.id);
  const [days, setDays] = useState(item?.reminderDays || 0);
  const nav = useNavigation();
  const c = useThemeColors();
  const options = [1, 7, 14, 30, 90];
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.bigblk, { backgroundColor: c.band }]}>
        <View style={styles.big}>
          <TouchableOpacity onPress={() => setDays(Math.max(0, days - 1))} style={[styles.rb, { backgroundColor: c.cell }]}><Text style={{ color: c.label, fontSize: 24 }}>−</Text></TouchableOpacity>
          <View>
            <Text style={[styles.num, { color: c.label }]}>{days}</Text>
            <Text style={{ textAlign: 'center', color: c.l2, marginTop: 6 }}>天一次</Text>
          </View>
          <TouchableOpacity onPress={() => setDays(days + 1)} style={[styles.rb, { backgroundColor: c.cell }]}><Text style={{ color: c.label, fontSize: 24 }}>＋</Text></TouchableOpacity>
        </View>
        <View style={styles.chips}>
          {options.map((d) => (
            <TouchableOpacity key={d} onPress={() => setDays(d)} style={[styles.chip, { backgroundColor: days === d ? c.brand : c.cell }]}>
              <Text style={{ color: days === d ? c.onbrand : c.label, fontWeight: days === d ? '700' : '500' }}>{d === 1 ? '每天' : d === 7 ? '每週' : d === 14 ? '2 週' : d === 30 ? '每月' : '3 個月'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <TouchableOpacity
        onPress={async () => { await updateActivity(item.id, { reminderDays: days || null }); nav.goBack(); }}
        style={[styles.cta, { backgroundColor: c.brand }]}
      >
        <Text style={[styles.ctaText, { color: c.onbrand }]}>完成</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bigblk: { marginHorizontal: 16, marginTop: 16, borderRadius: 26, paddingVertical: 16 },
  big: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, paddingVertical: 6 },
  num: { fontSize: 76, fontWeight: '600', fontFamily: 'NaikaiSubset-SemiBold' },
  rb: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 14, justifyContent: 'center' },
  chip: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 18 },
  cta: { marginHorizontal: 20, marginTop: 22, height: 54, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 18, fontWeight: '700', fontFamily: 'NaikaiSubset-SemiBold' }
});
