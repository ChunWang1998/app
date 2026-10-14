import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivities, logActivityNow, backfillHistory } from '../data/repository';
import { useThemeColors, useItemTone, useTheme } from '../theme/useTheme';
import { Mascot } from '../components/Mascot';
import { ChevronLeftIcon, CheckIcon, BellIcon, PlusIcon, ChevronRightIcon, ShareIcon, CalendarIcon } from '../components/Icons';
import { addNextDueToCalendar, openSystemSettings } from '../lib/calendar';
import { formatDate, formatTime, formatSpan, dueInMs, progressRatio, elapsedMs, formatSpanParts, formatLastDoneLine } from '../lib/time';
import { historyStats } from '../lib/historyStats';
import { DateChips } from '../components/DateChips';
import { dueStatus } from '../lib/today';
import * as Haptics from 'expo-haptics';
import { getLocale, t } from '../i18n';

export default function DetailScreen() {
  const { params } = useRoute();
  const nav = useNavigation();
  const c = useThemeColors();
  const { preciseTime } = useTheme();
  const insets = useSafeAreaInsets();
  const { activities } = useActivities();
  const item = useMemo(() => activities.find((a) => a.id === params?.id), [activities, params]);
  const [backfillAt, setBackfillAt] = useState(null);

  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.navBtn} accessibilityLabel={t('common.back')}>
            <ChevronLeftIcon color={c.label} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const tone = useItemTone(item.icon, item.title);
  const due = dueInMs(item);
  const od = dueStatus(due) === 'overdue';
  const elapsed = elapsedMs(item);
  const just = elapsed != null && elapsed < 60e3;
  const hasReminder = !!item.reminderDays;
  const lastWhen = item.lastDoneAt
    ? `${formatLastDoneLine(item.lastDoneAt, Date.now(), getLocale())}${preciseTime ? ` ${formatTime(item.lastDoneAt)}` : ''}`
    : '';
  const parts = elapsed == null ? null : formatSpanParts(elapsed, preciseTime ? 2 : 1);
  const mood = just ? 'happy' : od ? 'worry' : 'idle';
  const hist = item.history || [];
  const stats = historyStats(hist);
  const remLabel = hasReminder ? t('detail.everyDays', { n: item.reminderDays }) : t('detail.noReminder');

  async function logNow() {
    await logActivityNow(item.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }

  function addBackfill() {
    setBackfillAt(new Date().toISOString());
  }

  async function saveBackfill() {
    const at = backfillAt;
    setBackfillAt(null);
    if (at) await backfillHistory(item.id, at);
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <View style={[styles.heroblk, { backgroundColor: tone.ac, paddingTop: insets.top }]}>
          <View style={styles.nav}>
            <TouchableOpacity onPress={() => nav.goBack()} style={styles.navBtn} accessibilityLabel={t('common.back')}>
              <ChevronLeftIcon color={c.label} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: c.label }]} numberOfLines={1}>{item.title}</Text>
            <TouchableOpacity onPress={() => nav.navigate('Edit', { id: item.id })} style={styles.navBtnRight}>
              <Text style={{ color: c.label, fontSize: 17, fontFamily: 'NaikaiSubset-Regular' }}>{t('detail.edit')}</Text>
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
                  <Text style={[styles.od, { color: c.red }]}>{t('home.overdue')} {formatSpan(-due)}</Text>
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
        <TouchableOpacity onPress={logNow} style={[styles.cta, { backgroundColor: c.brand }]} accessibilityLabel={t('home.a11yLog', { title: item.title })}>
          <CheckIcon color={c.onbrand} size={18} />
          <Text style={[styles.ctaText, { color: c.onbrand }]}>{t('detail.justDid')}</Text>
        </TouchableOpacity>
        <View style={styles.extraRow}>
          <TouchableOpacity
            onPress={() => nav.navigate('ShareCard', { id: item.id })}
            style={[styles.extraBtn, { backgroundColor: c.cell }]}
            accessibilityLabel={t('detail.shareCard')}
          >
            <ShareIcon color={c.brand} size={18} />
            <Text style={[styles.extraText, { color: c.label }]}>{t('detail.shareCard')}</Text>
          </TouchableOpacity>
          {hasReminder ? (
            <TouchableOpacity
              onPress={async () => {
                const loc = getLocale();
                const r = await addNextDueToCalendar(item, { locale: loc });
                if (r.status === 'added') {
                  Alert.alert(t('detail.calendarAdded'), t('detail.calendarAddedBody'));
                  return;
                }
                if (r.status === 'duplicate') {
                  Alert.alert(t('detail.calendarDup'), t('detail.calendarDupAsk'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('detail.calendarDupAgain'), onPress: () => addNextDueToCalendar(item, { force: true, locale: loc }) },
                  ]);
                  return;
                }
                if (r.status === 'denied') {
                  Alert.alert(t('detail.calendarDenied'), t('detail.calendarDeniedBody'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('detail.openSettings'), onPress: () => openSystemSettings() },
                  ]);
                }
              }}
              style={[styles.extraBtn, { backgroundColor: c.cell }]}
              accessibilityLabel={t('detail.addToCalendar')}
            >
              <CalendarIcon color={c.brand} size={18} />
              <Text style={[styles.extraText, { color: c.label }]}>{t('detail.addToCalendar')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.stats}>
          <Stat label={t('detail.count')} value={t('detail.countVal', { n: stats.count })} c={c} />
          <Stat label={t('detail.avg')} value={stats.avgDays == null ? '—' : t('detail.avgVal', { n: stats.avgDays.toFixed(1) })} c={c} />
          <Stat label={t('detail.max')} value={stats.maxDays == null ? '—' : t('detail.maxVal', { n: Math.round(stats.maxDays) })} c={c} />
        </View>

        <Text style={[styles.sec, { color: c.label }]}>{t('detail.reminder')}</Text>
        <View style={[styles.grp, { backgroundColor: c.cell }]}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => nav.navigate('Reminder', { id: item.id })}
            accessibilityLabel={t('detail.reminder')}
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
          <Text style={[styles.sec, { color: c.label, paddingTop: 0 }]}>{t('detail.history')}</Text>
          <TouchableOpacity onPress={addBackfill} style={styles.plus} accessibilityLabel={t('detail.backfill')}>
            <PlusIcon color={c.brand} size={18} />
          </TouchableOpacity>
        </View>
        <View style={[styles.grp, { backgroundColor: c.cell }]}>
          {hist.length === 0 ? (
            <View style={styles.row}>
              <Text style={{ color: c.l2, fontFamily: 'NaikaiSubset-Regular' }}>{t('detail.neverLogged')}</Text>
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
            <Text style={[styles.sec, { color: c.label }]}>{t('detail.notes')}</Text>
            <View style={[styles.grp, { backgroundColor: c.cell }]}>
              <View style={[styles.row, { minHeight: 56 }]}>
                <Text style={{ color: c.label, fontFamily: 'NaikaiSubset-Regular', fontSize: 16 }}>{item.notes}</Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
      <Modal visible={!!backfillAt} transparent animationType="fade" onRequestClose={() => setBackfillAt(null)}>
        <View style={styles.sheetWrap}>
          <View style={[styles.sheet, { backgroundColor: c.cell }]}>
            <Text style={[styles.sheetTitle, { color: c.label }]}>{t('detail.backfillAsk')}</Text>
            <DateChips value={backfillAt} onChange={(v) => v && setBackfillAt(v)} allowUnknown={false} />
            <View style={styles.sheetBtns}>
              <TouchableOpacity onPress={() => setBackfillAt(null)} style={styles.sheetBtn}>
                <Text style={{ color: c.l2, fontFamily: 'NaikaiSubset-Regular', fontSize: 17 }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveBackfill} style={styles.sheetBtn} testID="backfill-save">
                <Text style={{ color: c.brand, fontFamily: 'NaikaiSubset-SemiBold', fontSize: 17 }}>{t('edit.add')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  sheetWrap: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { borderRadius: 20, paddingTop: 18, paddingBottom: 6 },
  sheetTitle: { fontFamily: 'NaikaiSubset-SemiBold', fontSize: 17, paddingHorizontal: 16 },
  sheetBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 8 },
  sheetBtn: { paddingHorizontal: 12, height: 44, justifyContent: 'center' },
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
  extraRow: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginTop: 12 },
  extraBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  extraText: { fontSize: 15, fontFamily: 'NaikaiSubset-SemiBold' },
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
