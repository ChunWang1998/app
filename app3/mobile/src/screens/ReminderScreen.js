import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivities, updateActivity } from '../data/repository';
import { useThemeColors, useItemTone, useTheme } from '../theme/useTheme';
import { ChevronLeftIcon } from '../components/Icons';
import { t } from '../i18n';

const CHIPS = [
  { d: 1, key: 'reminder.daily' },
  { d: 7, key: 'reminder.weekly' },
  { d: 14, key: 'reminder.twoWeeks' },
  { d: 30, key: 'reminder.monthly' },
  { d: 90, key: 'reminder.threeMonths' },
];

const TIMES = ['08:00', '09:00', '10:00', '18:00', '21:00'];

export default function ReminderScreen() {
  const { params } = useRoute();
  const { activities } = useActivities();
  const item = activities.find((a) => a.id === params?.id);
  const nav = useNavigation();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { reminderTime: defaultTime } = useTheme();
  const tone = useItemTone(item?.icon);
  const [on, setOn] = useState(!!item?.reminderDays);
  const [days, setDays] = useState(item?.reminderDays || 14);
  const [time, setTime] = useState(item?.reminderTime || defaultTime || '09:00');
  const [snooze, setSnooze] = useState(item?.snoozeEnabled !== false);

  async function persist(next) {
    if (!item) return;
    const enabled = next.on ?? on;
    await updateActivity(item.id, {
      reminderDays: enabled ? (next.days ?? days) : null,
      reminderTime: next.time ?? time,
      snoozeEnabled: next.snooze ?? snooze,
      snoozeDays: 3,
    });
  }

  async function toggleOn(v) {
    setOn(v);
    if (v) {
      if (days < 1) setDays(14);
      try {
        const { requestNotificationPermissions } = require('../notifications/reminders');
        await requestNotificationPermissions();
      } catch {
        // web / denied — persist the setting; scheduling skips if not granted
      }
    }
    await persist({ on: v, days: v ? (days || 14) : days });
  }

  async function changeDays(n) {
    const next = Math.max(1, n);
    setDays(next);
    setOn(true);
    await persist({ on: true, days: next });
  }

  async function cycleTime() {
    const i = TIMES.indexOf(time);
    const next = TIMES[(i + 1) % TIMES.length];
    setTime(next);
    await persist({ time: next });
  }

  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: c.set, paddingTop: insets.top }}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.navBtn} accessibilityLabel={t('common.back')}>
            <ChevronLeftIcon color={c.brand} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.set, paddingTop: insets.top }}>
      <View style={styles.nav}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.navBtn} accessibilityLabel={t('common.back')}>
          <ChevronLeftIcon color={c.brand} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.label }]}>{t('reminder.title')}</Text>
        <View style={styles.navBtn} />
      </View>

      <View style={[styles.grp, { backgroundColor: c.cell }]}>
        <View style={styles.row}>
          <Text style={[styles.rowTitle, { color: c.label }]}>{item.title}</Text>
          <Switch value={on} onValueChange={toggleOn} trackColor={{ false: c.fill, true: c.brand }} />
        </View>
      </View>

      <View style={{ opacity: on ? 1 : 0.35 }} pointerEvents={on ? 'auto' : 'none'}>
        <View style={[styles.bigblk, { backgroundColor: tone.ac }]}>
          <View style={styles.big}>
            <TouchableOpacity onPress={() => changeDays(days - 1)} style={[styles.rb, { backgroundColor: c.cell }]}>
              <Text style={{ color: c.label, fontSize: 24, fontFamily: 'NaikaiSubset-Regular' }}>−</Text>
            </TouchableOpacity>
            <View>
              <Text style={[styles.num, { color: c.label }]}>{days}</Text>
              <Text style={{ textAlign: 'center', color: c.l2, marginTop: 6, fontFamily: 'NaikaiSubset-Regular' }}>{t('reminder.everyNDays')}</Text>
            </View>
            <TouchableOpacity onPress={() => changeDays(days + 1)} style={[styles.rb, { backgroundColor: c.cell }]}>
              <Text style={{ color: c.label, fontSize: 24, fontFamily: 'NaikaiSubset-Regular' }}>＋</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chips}>
            {CHIPS.map((ch) => {
              const sel = days === ch.d;
              return (
                <TouchableOpacity
                  key={ch.d}
                  onPress={() => changeDays(ch.d)}
                  style={[styles.chip, { backgroundColor: sel ? c.brand : c.cell }]}
                >
                  <Text style={{ color: sel ? c.onbrand : c.label, fontFamily: sel ? 'NaikaiSubset-Bold' : 'NaikaiSubset-Regular', fontSize: 14 }}>
                    {t(ch.key)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.grp, { backgroundColor: c.cell, marginTop: 18 }]}>
          <TouchableOpacity style={[styles.row, styles.rowLine]} onPress={cycleTime}>
            <Text style={[styles.rowTitle, { color: c.label }]}>{t('reminder.time')}</Text>
            <View style={[styles.pill, { backgroundColor: c.fill }]}>
              <Text style={{ color: c.label, fontFamily: 'NaikaiSubset-SemiBold' }}>{time}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.row}>
            <Text style={[styles.rowTitle, { color: c.label }]}>{t('reminder.snooze')}</Text>
            <Switch
              value={snooze}
              onValueChange={async (v) => {
                setSnooze(v);
                await persist({ snooze: v });
              }}
              trackColor={{ false: c.fill, true: c.brand }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'NaikaiSubset-SemiBold', fontSize: 17 },
  grp: { marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 16 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(46,41,37,0.09)' },
  rowTitle: { fontSize: 17, fontFamily: 'NaikaiSubset-Regular', flex: 1 },
  bigblk: { marginHorizontal: 16, marginTop: 16, borderRadius: 26, paddingVertical: 16 },
  big: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, paddingVertical: 6 },
  num: { fontSize: 76, fontFamily: 'NaikaiSubset-SemiBold', lineHeight: 84, textAlign: 'center' },
  rb: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 14, justifyContent: 'center' },
  chip: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 18 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
});
