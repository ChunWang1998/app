import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivities, logActivityNow } from '../data/repository';
import { useThemeColors } from '../theme/useTheme';
import { itemPalette } from '../theme/colors';
import { Mascot } from '../components/Mascot';
import { ChevronLeftIcon, CheckIcon } from '../components/Icons';
import { formatDate, formatTime, formatSpan, dueInMs, progressRatio, elapsedMs, formatSpanParts } from '../lib/time';
import * as Haptics from 'expo-haptics';

export default function DetailScreen() {
  const { params } = useRoute();
  const nav = useNavigation();
  const c = useThemeColors();
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

  const pal = itemPalette[item.icon || 'brush'] || itemPalette.brush;
  const tone = pal.light;
  const due = dueInMs(item);
  const od = due < 0;
  const elapsed = elapsedMs(item);
  const just = elapsed != null && elapsed < 60e3;
  const hasReminder = !!item.reminderDays;
  const lastWhen = item.lastDoneAt ? `${formatDate(item.lastDoneAt)}　${formatTime(item.lastDoneAt)}` : '';
  const parts = elapsed == null ? null : formatSpanParts(elapsed, 2);
  const mood = just ? 'happy' : od ? 'worry' : 'idle';

  async function logNow() {
    await logActivityNow(item.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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
              <View style={[styles.trk, { backgroundColor: 'rgba(255,255,255,0.6)' }]}>
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
      </ScrollView>
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
});
