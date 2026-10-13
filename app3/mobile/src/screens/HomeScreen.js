import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useActivities, logActivityNow, addActivity, softDeleteActivity, undoDelete } from '../data/repository';
import { useThemeColors } from '../theme/useTheme';
import { itemPalette } from '../theme/colors';
import { ItemGlyph } from '../components/ItemGlyph';
import { Mascot } from '../components/Mascot';
import * as Haptics from 'expo-haptics';
import { isProUnlocked } from '../lib/entitlements';

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

function nextDue(item) {
  if (!item.reminderDays) return Infinity;
  const last = item.lastDoneAt ? new Date(item.lastDoneAt).getTime() : (item.createdAt ? new Date(item.createdAt).getTime() : 0);
  return last + item.reminderDays * 864e5 - Date.now();
}

export default function HomeScreen() {
  const nav = useNavigation();
  const c = useThemeColors();
  const { activities, ready } = useActivities();
  const [toast, setToast] = useState('');

  const data = useMemo(() => {
    return [...activities].map((a) => {
      const due = nextDue(a);
      const cls = due < 0 ? 'od' : due < 2 * 864e5 ? 'soon' : '';
      return { ...a, _due: due, _cls: cls };
    }).sort((x, y) => (x._due === y._due ? 0 : x._due - y._due));
  }, [activities]);
  const overdueCount = data.filter((x) => x._due < 0).length;

  async function handleCheck(a) {
    await logActivityNow(a.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setToast({ text: '已記錄', undo: null });
    setTimeout(() => setToast(''), 1800);
  }

  async function handleAddSample() {
    const pro = await isProUnlocked();
    const visible = activities.length;
    if (!pro && visible >= 3) {
      nav.navigate('Paywall');
      return;
    }
    await addActivity({ title: 'New item', reminderDays: 7 });
  }
  async function handleDelete(a) {
    await softDeleteActivity(a.id);
    const id = a.id;
    setToast({ text: '已刪除', undo: async () => { await undoDelete(id); } });
    const timer = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(timer);
  }

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={[styles.band, { backgroundColor: c.band }]}>
        <View style={styles.bandRow}>
          <Text style={[styles.lt, { color: c.label }]}>好久沒了</Text>
          <Text style={[styles.bandn, { color: c.l2 }]}><Text style={{ color: c.red, fontWeight: '700', fontSize: 18 }}>{overdueCount}</Text> 件逾期</Text>
          <Mascot size={36} mood={overdueCount > 0 ? 'worry' : 'idle'} />
        </View>
      </View>
      <View style={styles.listWrap}>
        {!ready ? null : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <Row item={item} onCheck={() => handleCheck(item)} onOpen={() => nav.navigate('Detail', { id: item.id })} onDelete={() => handleDelete(item)} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Mascot size={140} mood="sleepy" />
                <Text style={[styles.emptyT1, { color: c.l2 }]}>還沒有要記的事</Text>
                <TouchableOpacity onPress={handleAddSample} style={[styles.cta, { backgroundColor: c.brand }]}>
                  <Text style={[styles.ctaText, { color: c.onbrand }]}>新增</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
      {!!toast && (
        <View style={[styles.toast, { backgroundColor: c.cell, borderColor: c.sep }]}>
          <Mascot size={26} mood="happy" />
          <Text style={{ fontWeight: '700', color: c.label }}>{toast.text}</Text>
          {toast.undo ? (
            <TouchableOpacity onPress={async () => { await toast.undo(); setToast(''); }}>
              <Text style={{ color: c.brand, fontWeight: '700' }}>復原</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}

function Row({ item, onCheck, onOpen, onDelete }) {
  const c = useThemeColors();
  const pal = itemPalette[item.icon || 'drop'] || itemPalette.drop;
  const tone = (c.bg === '#1B1917' ? pal.dark : pal.light);
  const ac = tone.ac, acf = tone.acf;
  const due = item._due;
  const soon = due < 2 * 864e5 && due >= 0;
  const od = due < 0;
  const ratio = Math.max(0, Math.min(1, 1 - (due / (item.reminderDays ? (item.reminderDays * 864e5) : 1))));
  return (
    <View style={[styles.it, { borderColor: c.sep }]}>
      <View style={[styles.gl, { backgroundColor: od ? c.odtint : c.tint }]}>
        <ItemGlyph kind={item.icon || 'drop'} color={acf} />
      </View>
      <TouchableOpacity style={styles.tx} onPress={onOpen} activeOpacity={0.7}>
        <Text numberOfLines={1} style={[styles.nm, { color: c.label }]}>{item.title}</Text>
        <Text style={[styles.st, { color: c.l2 }]}>
          {item.lastDoneAt ? (due < 0 ? `逾期\u2009${formatSpan(-due)}` : `還有\u2009${formatSpan(due)}`) : '還沒記錄'}
        </Text>
        <View style={[styles.trk, { backgroundColor: c.track }]}>
          <View style={[styles.trkI, { width: `${Math.floor(ratio * 100)}%`, backgroundColor: od ? c.red : soon ? c.orange : c.l3 }]} />
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={onCheck} style={styles.ck} activeOpacity={0.85}>
        <View style={[styles.ckDot, { borderColor: c.brand }]} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} style={styles.del} activeOpacity={0.85}>
        <Text style={{ color: c.red, fontWeight: '700' }}>刪</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  band: { borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingBottom: 10, marginBottom: 8 },
  bandRow: { flexDirection: 'row', alignItems: 'flex-end', paddingRight: 16 },
  lt: { fontSize: 36, fontWeight: '700', paddingHorizontal: 22, paddingBottom: 6, paddingTop: 2, fontFamily: 'NaikaiSubset-Bold' },
  bandn: { fontSize: 14, marginBottom: 14, marginRight: 6 },
  listWrap: { flex: 1, paddingTop: 2 },
  it: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 18, paddingRight: 12, minHeight: 80, borderBottomWidth: StyleSheet.hairlineWidth },
  gl: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tx: { flex: 1, paddingVertical: 14 },
  nm: { fontSize: 18, fontWeight: '600' }, // system font for user text
  st: { fontSize: 14, marginTop: 3 },
  trk: { height: 5, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  trkI: { height: '100%', borderRadius: 3 },
  ck: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  ckDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2.4 },
  del: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  empty: { position: 'absolute', top: 250, left: 0, right: 0, alignItems: 'center' },
  emptyT1: { fontSize: 20, marginTop: 18 },
  cta: { height: 46, paddingHorizontal: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 24, marginTop: 22 },
  ctaText: { fontWeight: '700', fontFamily: 'NaikaiSubset-SemiBold' },
  toast: { position: 'absolute', left: '50%', transform: [{ translateX: -100 }], bottom: 40, width: 200, borderRadius: 24, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5 }
});
