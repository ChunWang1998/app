import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useActivities, logActivityNow } from '../data/repository';
import { useThemeColors } from '../theme/useTheme';
import { itemPalette } from '../theme/colors';
import { Mascot } from '../components/Mascot';

function nextDue(item) {
  if (!item.reminderDays) return Infinity;
  const last = item.lastDoneAt ? new Date(item.lastDoneAt).getTime() : (item.createdAt ? new Date(item.createdAt).getTime() : 0);
  return last + item.reminderDays * 864e5 - Date.now();
}
function fmtWhen(ts) {
  if (!ts) return '未記錄';
  const d = new Date(ts); const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatSpan(ms) {
  if (ms < 60e3) return '0 分';
  const DAY = 864e5; const H = 36e5;
  const d = Math.floor(ms / DAY); const h = Math.floor((ms % DAY) / H);
  if (d >= 30) {
    const mo = Math.floor(d / 30); const dd = d % 30;
    return `${mo}\u2009個月${dd ? `\u2009${dd}\u2009天` : ''}`;
  }
  if (d >= 1) return `${d}\u2009天${h ? `\u2009${h}\u2009小時` : ''}`;
  return `${Math.floor(ms / H)}\u2009小時`;
}

export default function DetailScreen() {
  const { params } = useRoute();
  const nav = useNavigation();
  const c = useThemeColors();
  const { activities } = useActivities();
  const item = useMemo(() => activities.find((a) => a.id === params?.id), [activities, params]);
  if (!item) return null;
  const pal = itemPalette[item.icon || 'drop'];
  const tone = (c.bg === '#1B1917' ? pal.dark : pal.light);
  const due = nextDue(item);
  const mo = Math.floor(Math.max(0, Date.now() - new Date(item.lastDoneAt || item.createdAt).getTime()) / (864e5 * 30));
  const d = Math.floor(Math.max(0, Date.now() - new Date(item.lastDoneAt || item.createdAt).getTime()) / 864e5) % 30;
  const h = Math.floor((Math.max(0, Date.now() - new Date(item.lastDoneAt || item.createdAt).getTime()) % 864e5) / 36e5);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.heroblk, { backgroundColor: tone.ac }]}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => nav.goBack()}><Text style={{ color: c.label }}>{'< 返回'}</Text></TouchableOpacity>
          <Text style={[styles.title, { color: c.label }]}>{item.title}</Text>
          <TouchableOpacity onPress={() => nav.navigate('Edit', { id: item.id })}><Text style={{ color: tone.acf }}>編輯</Text></TouchableOpacity>
        </View>
        <View style={styles.hero}>
          <Text style={[styles.num, { color: c.label }]}>{mo ? `${mo}\u2009個月 ` : ''}{d ? `${d}\u2009天 ` : ''}{!mo && !d ? `${h}\u2009小時` : ''}</Text>
          <Mascot size={42} mood={due < 0 ? 'worry' : 'idle'} />
          <Text style={[styles.when, { color: c.l2 }]}>{fmtWhen(item.lastDoneAt)}</Text>
          <View style={[styles.trk, { backgroundColor: 'rgba(255,255,255,0.6)' }]} />
        </View>
      </View>
      <TouchableOpacity onPress={() => logActivityNow(item.id)} style={[styles.cta, { backgroundColor: c.brand }]}>
        <Text style={[styles.ctaText, { color: c.onbrand }]}>剛剛做了</Text>
      </TouchableOpacity>
      <View style={styles.stats}>
        <View style={[styles.statCard, { backgroundColor: c.cell }]}>
          <Text style={[styles.statNum, { color: c.label }]}>5<Small>次</Small></Text>
          <Text style={[styles.statCap, { color: c.l2 }]}>總次數</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: c.cell }]}>
          <Text style={[styles.statNum, { color: c.label }]}>14<Small>天</Small></Text>
          <Text style={[styles.statCap, { color: c.l2 }]}>平均</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: c.cell }]}>
          <Text style={[styles.statNum, { color: c.label }]}>14<Small>天</Small></Text>
          <Text style={[styles.statCap, { color: c.l2 }]}>最久</Text>
        </View>
      </View>
      <View style={{ marginTop: 24 }}>
        <View style={[styles.remRow, { borderColor: c.sep }]}>
          <Text style={[styles.remLabel, { color: c.label }]}>提醒</Text>
          <TouchableOpacity onPress={() => nav.navigate('Reminder', { id: item.id })} style={styles.remLink}>
            <Text style={{ color: c.label }}>{item.reminderDays ? `每 ${item.reminderDays} 天` : '未設定'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function Small({ children }) {
  return <Text style={{ fontSize: 12, marginLeft: 2 }}>{children}</Text>;
}

const styles = StyleSheet.create({
  heroblk: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingBottom: 24 },
  nav: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  title: { fontWeight: '600', fontSize: 17 },
  hero: { paddingHorizontal: 20, paddingTop: 14 },
  num: { fontSize: 72, fontWeight: '600', fontFamily: 'NaikaiSubset-SemiBold' },
  when: { marginTop: 12, fontSize: 15 },
  trk: { height: 4, borderRadius: 3, marginTop: 22 },
  cta: { marginHorizontal: 20, marginTop: 22, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 18, fontWeight: '700', fontFamily: 'NaikaiSubset-SemiBold' },
  stats: { flexDirection: 'row', marginHorizontal: 20, marginTop: 22 },
  statCard: { flex: 1, marginRight: 10, borderRadius: 18, padding: 12 },
  statNum: { fontSize: 24, fontWeight: '600', fontFamily: 'NaikaiSubset-SemiBold' },
  statCap: { fontSize: 12, marginTop: 2 },
  remRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  remLabel: { fontSize: 20, fontWeight: '700', fontFamily: 'Naikai-Bold' },
  remLink: { padding: 8 }
});
