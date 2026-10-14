import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivities, logActivityNow, backfillHistory } from '../data/repository';
import { useThemeColors, useItemTone, useTheme } from '../theme/useTheme';
import { Mascot } from '../components/Mascot';
import { ChevronLeftIcon, CheckIcon, BellIcon, PlusIcon, ChevronRightIcon } from '../components/Icons';
import { formatDate, formatTime, formatSpan, dueInMs, progressRatio, elapsedMs, formatSpanParts } from '../lib/time';
import { historyStats } from '../lib/historyStats';
import * as Haptics from 'expo-haptics';

function daysAgo(n, hours = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

export default function DetailScreen() {
  const { params } = useRoute();
  const nav = useNavigation();
  const c = useThemeColors();
  const { preciseTime } = useTheme();
  const insets = useSafeAreaInsets();
  const { activities } = useActivities();
  const item = useMemo(() => activities.find((a) => a.id === params?.id), [activities, params]);

  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.navBtn} accessibilityLabel="返回">
            <ChevronLeftIcon color={c.label} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const tone = useItemTone(item.icon);
  const due = dueInMs(item);
  const od = due < 0;
  const elapsed = elapsedMs(item);
  const just = elapsed != null && elapsed < 60e3;
  const hasReminder = !!item.reminderDays;
  const lastWhen = item.lastDoneAt
    ? `${formatDate(item.lastDoneAt)}${preciseTime ? `　${formatTime(item.lastDoneAt)}` : ''}`
    : '';
  const parts = elapsed == null ? null : formatSpanParts(elapsed, preciseTime ? 2 : 1);
  const mood = just ? 'happy' : od ? 'worry' : 'idle';
  const hist = item.history || [];
  const stats = historyStats(hist);
  const remLabel = hasReminder ? `每 ${item.reminderDays} 天` : '不提醒';

  async function logNow() {
    await logActivityNow(item.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }

  function addBackfill() {
    Alert.alert('補記一筆', '要記哪一天？', [
      { text: '取消', style: 'cancel' },
      { text: '今天', onPress: () => backfillHistory(item.id, new Date().toISOString()) },
      { text: '昨天', onPress: () => backfillHistory(item.id, daysAgo(1)) },
      { text: '3 天前', onPress: () => backfillHistory(item.id, daysAgo(3)) },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <View style={[styles.heroblk, { backgroundColor: tone.ac, paddingTop: insets.top }]}>
          <View style={styles.nav}>
            <TouchableOpacity onPress={() => nav.goBack()} style={styles.navBtn} accessibilityLabel="返回">
              <ChevronLeftIcon color={c.label} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: c.label }]} numberOfLines={1}>{item.title}</Text>
            <TouchableOpacity onPress={() => nav.navigate('Edit', { id: item.id })} style={styles.navBtnRight}>
              <Text style={{ color: c.label, fontSize: 17, fontFamily: 'NaikaiSubset-Regular' }}>編輯</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              {parts ? (
                <Text style={[styles.num, { color: c.label }]}>
                  {parts.map((p, i) => (
                    <Text key={i}>
                      {p.n}
                      <Text style={styles.numUnit}>{p.unit}</Text>
                    </Text>
                  ))}
                </Text>
              ) : (
                <Text style={[styles.num, { color: c.label }]}>—</Text>
              )}
              <Mascot size={88} mood={mood} />
            </View>
            {(lastWhen || od) ? (
              <View style={styles.whenRow}>
                {lastWhen ? <Text style={[styles.when, { color: c.l2 }]}>{lastWhen}</Text> : null}
                {od ? (
                  <Text style={[styles.od, { color: c.red }]}>逾期 {formatSpan(-due)}</Text>
                ) : null}
              </View>
            ) : null}
            {hasReminder ? (
              <View style={[styles.trk, { backgroundColor: 'rgba(255,255,255,0.35)' }]}>
                <View
                  style={[
                    styles.trkI,
                    {
                      width: `${Math.max(Math.floor(progressRatio(item) * 100), 1)}%`,
                      backgroundColor: od ? c.red : c.l3,
                    },
                  ]}
                />
              </View>
            ) : null}
          </View>
        </View>
        <TouchableOpacity onPress={logNow} style={[styles.cta, { backgroundColor: c.brand }]} accessibilityLabel={`記錄${item.title}，剛剛做了`}>
          <CheckIcon color={c.onbrand} size={18} />
          <Text style={[styles.ctaText, { color: c.onbrand }]}>剛剛做了</Text>
        </TouchableOpacity>

        <View style={styles.stats}>
          <Stat label="總次數" value={`${stats.count}次`} c={c} />
          <Stat label="平均" value={stats.avgDays == null ? '—' : `${stats.avgDays.toFixed(1)}天`} c={c} />
          <Stat label="最久" value={stats.maxDays == null ? '—' : `${Math.round(stats.maxDays)}天`} c={c} />
        </View>

        <Text style={[styles.sec, { color: c.label }]}>提醒</Text>
        <View style={[styles.grp, { backgroundColor: c.cell }]}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => nav.navigate('Reminder', { id: item.id })}
            accessibilityLabel="提醒"
          >
            <View style={[styles.sq, { backgroundColor: tone.ac }]}>
              <BellIcon color={tone.acf} size={16} />
            </View>
            <Text style={[styles.rowTitle, { color: c.label }]}>{remLabel}</Text>
            <Text style={{ color: c.l2, fontFamily: 'NaikaiSubset-Regular', marginRight: 6 }}>
              {item.reminderTime || '09:00'}
            </Text>
            <ChevronRightIcon color={c.l3} />
          </TouchableOpacity>
        </View>

        <View style={styles.secRow}>
          <Text style={[styles.sec, { color: c.label, paddingTop: 0 }]}>紀錄</Text>
          <TouchableOpacity onPress={addBackfill} style={styles.plus} accessibilityLabel="補記一筆">
            <PlusIcon color={c.brand} size={18} />
          </TouchableOpacity>
        </View>
        <View style={[styles.grp, { backgroundColor: c.cell }]}>
          {hist.length === 0 ? (
            <View style={styles.row}>
              <Text style={{ color: c.l2, fontFamily: 'NaikaiSubset-Regular' }}>還沒記錄</Text>
            </View>
          ) : hist.map((e, i) => {
            const next = hist[i + 1];
            const gap = next ? (new Date(e.at) - new Date(next.at)) : null;
            return (
              <View key={`${e.at}-${i}`} style={[styles.hist, i < hist.length - 1 && styles.histLine]}>
                <Text style={[styles.histD, { color: c.label }]}>{formatDate(e.at)}</Text>
                {preciseTime ? <Text style={[styles.histT, { color: c.l2 }]}>{formatTime(e.at)}</Text> : null}
                {gap != null ? (
                  <Text style={[styles.histG, { color: c.l2 }]}>
                    +{formatSpan(gap).replace(/\u2009/g, '')}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        {item.notes ? (
          <>
            <Text style={[styles.sec, { color: c.label }]}>備註</Text>
            <View style={[styles.grp, { backgroundColor: c.cell }]}>
              <View style={[styles.row, { minHeight: 56 }]}>
                <Text style={{ color: c.label, fontFamily: 'NaikaiSubset-Regular', fontSize: 16 }}>{item.notes}</Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, c }) {
  return (
    <View style={[styles.stat, { backgroundColor: c.cell }]}>
      <Text style={{ color: c.l2, fontSize: 13, fontFamily: 'NaikaiSubset-Regular' }}>{label}</Text>
      <Text style={{ color: c.label, fontSize: 24, fontFamily: 'NaikaiSubset-SemiBold', marginTop: 4 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroblk: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingBottom: 24 },
  nav: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navBtnRight: { minWidth: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 4 },
  title: { fontFamily: 'NaikaiSubset-SemiBold', fontSize: 17, flex: 1, textAlign: 'center' },
  hero: { paddingHorizontal: 20, paddingTop: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-end' },
  num: { fontSize: 78, fontFamily: 'NaikaiSubset-SemiBold', lineHeight: 86, flex: 1 },
  numUnit: { fontSize: 20, fontFamily: 'NaikaiSubset-Regular', marginLeft: 4 },
  whenRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center' },
  when: { fontSize: 15, fontFamily: 'NaikaiSubset-Regular', fontVariant: ['tabular-nums'] },
  od: { marginLeft: 'auto', fontFamily: 'NaikaiSubset-SemiBold', fontSize: 15 },
  trk: { height: 5, borderRadius: 3, marginTop: 22, overflow: 'hidden' },
  trkI: { height: '100%', borderRadius: 3 },
  cta: {
    marginHorizontal: 20,
    marginTop: 22,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  ctaText: { fontSize: 18, fontFamily: 'NaikaiSubset-SemiBold' },
  stats: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 22 },
  stat: { flex: 1, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 },
  sec: { fontSize: 20, fontFamily: 'NaikaiSubset-Bold', paddingTop: 34, paddingHorizontal: 20, paddingBottom: 6 },
  secRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16, paddingTop: 28 },
  plus: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  grp: { marginHorizontal: 16, borderRadius: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingHorizontal: 16, gap: 12 },
  rowTitle: { fontSize: 17, fontFamily: 'NaikaiSubset-Regular', flex: 1 },
  sq: { width: 29, height: 29, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  hist: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 16, gap: 10 },
  histLine: { borderBottomWidth: 1.5, borderBottomColor: 'rgba(46,41,37,0.09)', borderStyle: 'dashed' },
  histD: { fontSize: 17, fontFamily: 'NaikaiSubset-Regular', width: 110 },
  histT: { fontSize: 15, fontFamily: 'NaikaiSubset-Regular', width: 52 },
  histG: { marginLeft: 'auto', fontSize: 14, fontFamily: 'NaikaiSubset-Regular' },
});
