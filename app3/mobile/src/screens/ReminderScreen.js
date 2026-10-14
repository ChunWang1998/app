import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivities, updateActivity } from '../data/repository';
import { setDraftReminder } from '../data/reminderDraft';
import { useThemeColors, useItemTone, useTheme } from '../theme/useTheme';
import { ChevronLeftIcon } from '../components/Icons';
import { SettingsRow, SettingsSwitch } from '../components/SettingsRow';
import { TimeWheel } from '../components/TimeWheel';
import { getLocale, t } from '../i18n';
import {
  MODE_INTERVAL,
  MODE_WEEK,
  MODE_MONTH,
  UNIT_DAY,
  UNIT_WEEK,
  UNIT_MONTH,
  UNIT_YEAR,
  WEEKDAY_ORDER,
  MONTH_DAY_CHIPS,
  INTERVAL_DAY_CHIPS,
  reminderConfigFromActivity,
  reminderFieldsFromConfig,
  formatClockFromTime,
  formatHm,
  parseHm,
  formatNextOccurrence,
  formatWeekdayHint,
  firstDueInstant,
  intervalUnitLabel,
  uses24HourClock,
  clampNUi,
} from '../lib/reminderSchedule';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const UNITS = [UNIT_DAY, UNIT_WEEK, UNIT_MONTH, UNIT_YEAR];
const UNIT_KEYS = { d: 'reminder.unitD', w: 'reminder.unitW', m: 'reminder.unitM', y: 'reminder.unitY' };
const DAY_CHIP_KEYS = {
  1: 'reminder.daily',
  7: 'reminder.weekly',
  14: 'reminder.twoWeeks',
  30: 'reminder.monthly',
  90: 'reminder.threeMonths',
};

function animate() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

export default function ReminderScreen() {
  const { params } = useRoute();
  const { activities } = useActivities();
  const stored = activities.find((a) => a.id === params?.id);
  const isDraft = !!params?.draft;
  const item = stored || {
    title: params?.title || '',
    lastDoneAt: params?.lastDoneAt || null,
    createdAt: params?.createdAt || new Date().toISOString(),
    ...(params?.value || {}),
  };
  const nav = useNavigation();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { reminderTime: defaultTime } = useTheme();
  const tone = useItemTone(item?.icon, item?.title);
  const seed = reminderConfigFromActivity({
    ...item,
    reminderTime: item?.reminderTime || defaultTime || '09:00',
    ...(params?.value || {}),
  });
  const [cfg, setCfg] = useState(seed);
  const [timeOpen, setTimeOpen] = useState(false);
  const uses24h = uses24HourClock();
  const locale = getLocale();
  const { h, min } = parseHm(cfg.time);

  const nextText = useMemo(() => {
    if (!cfg.enabled) return '—';
    if (cfg.mode === MODE_WEEK && !cfg.weekdays.length) return '—';
    const due = firstDueInstant({
      lastDoneAt: item.lastDoneAt,
      createdAt: item.createdAt || new Date().toISOString(),
    }, cfg);
    return formatNextOccurrence(due, locale);
  }, [cfg, item.lastDoneAt, item.createdAt, locale]);

  async function persist(nextCfg) {
    const fields = reminderFieldsFromConfig(nextCfg);
    if (isDraft) {
      setDraftReminder(fields);
      return;
    }
    if (!stored) return;
    await updateActivity(stored.id, fields);
  }

  async function apply(patch, opts = {}) {
    const next = { ...cfg, ...patch };
    if (opts.animate) animate();
    setCfg(next);
    await persist(next);
  }

  async function toggleOn(v) {
    if (v) {
      try {
        const { requestNotificationPermissions } = require('../notifications/reminders');
        await requestNotificationPermissions();
      } catch {
        // web / denied — persist the setting; scheduling skips if not granted
      }
    }
    await apply({ enabled: v }, { animate: true });
  }

  async function changeN(n) {
    if (cfg.mode === MODE_MONTH) await apply({ enabled: true, monthDay: Math.min(31, Math.max(1, n)) });
    else await apply({ enabled: true, n: clampNUi(n, cfg.unit) });
  }

  if (!stored && !isDraft) {
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

  const title = item.title || t('reminder.title');

  return (
    <View style={{ flex: 1, backgroundColor: c.set, paddingTop: insets.top }}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.navBtn} accessibilityLabel={t('common.back')}>
          <ChevronLeftIcon color={c.brand} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.label }]}>{t('reminder.title')}</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView
        testID="reminder-scroll"
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.grp, { backgroundColor: c.cell }]}>
          <SettingsRow
            title={title}
            right={<SettingsSwitch value={cfg.enabled} onValueChange={toggleOn} accessibilityLabel={t('reminder.title')} />}
            last
          />
        </View>

        <View style={{ opacity: cfg.enabled ? 1 : 0.35 }} pointerEvents={cfg.enabled ? 'auto' : 'none'}>
          <View style={[styles.seg, { backgroundColor: c.fill }]}>
            {[
              { mode: MODE_INTERVAL, key: 'reminder.modeInterval' },
              { mode: MODE_WEEK, key: 'reminder.modeWeek' },
              { mode: MODE_MONTH, key: 'reminder.modeMonth' },
            ].map((m) => {
              const on = cfg.mode === m.mode;
              return (
                <TouchableOpacity
                  key={m.mode}
                  testID={`reminder-mode-${m.mode}`}
                  onPress={() => apply({ mode: m.mode, enabled: true }, { animate: true })}
                  style={[styles.segBtn, on && { backgroundColor: c.cell }]}
                >
                  <Text style={{
                    color: on ? c.label : c.l2,
                    fontSize: 15,
                    fontFamily: on ? 'BeenAgesRounded-SemiBold' : 'BeenAgesRounded-Regular',
                    textAlign: 'center',
                  }}
                  >
                    {t(m.key)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {cfg.mode === MODE_INTERVAL ? (
            <IntervalPanel cfg={cfg} c={c} tone={tone} onN={changeN} onUnit={(unit) => apply({ unit, n: 1, enabled: true }, { animate: true })} />
          ) : null}
          {cfg.mode === MODE_WEEK ? (
            <WeekPanel
              cfg={cfg}
              c={c}
              tone={tone}
              onToggle={(day) => {
                const has = cfg.weekdays.includes(day);
                if (has) {
                  if (cfg.weekdays.length <= 1) return;
                  apply({ weekdays: cfg.weekdays.filter((d) => d !== day), enabled: true });
                } else {
                  apply({ weekdays: [...cfg.weekdays, day], enabled: true });
                }
              }}
            />
          ) : null}
          {cfg.mode === MODE_MONTH ? (
            <MonthPanel cfg={cfg} c={c} tone={tone} onN={changeN} />
          ) : null}

          <View style={[styles.grp, { backgroundColor: c.cell, marginTop: 18 }]}>
            <SettingsRow
              title={t('reminder.time')}
              onPress={() => {
                animate();
                setTimeOpen((v) => !v);
              }}
              right={(
                <Text style={{
                  color: timeOpen ? c.brand : c.l2,
                  fontSize: 17,
                  fontFamily: timeOpen ? 'BeenAgesRounded-SemiBold' : 'BeenAgesRounded-Regular',
                }}
                >
                  {formatClockFromTime(cfg.time, locale)}
                </Text>
              )}
            />
            {timeOpen ? (
              <TimeWheel
                hour={h}
                minute={min}
                uses24h={uses24h}
                onChange={(nh, nm) => apply({ time: formatHm(nh, nm) })}
              />
            ) : null}
            <SettingsRow
              title={t('reminder.snooze')}
              right={(
                <SettingsSwitch
                  value={cfg.snoozeEnabled}
                  onValueChange={(v) => apply({ snoozeEnabled: v })}
                  accessibilityLabel={t('reminder.snooze')}
                />
              )}
              last
            />
          </View>

          <View style={[styles.sum, { backgroundColor: c.cell }]}>
            <Text style={{ color: c.l2, fontSize: 15, fontFamily: 'BeenAgesRounded-Regular' }}>{t('reminder.next')}</Text>
            <Text
              testID="reminder-next"
              style={{ color: c.label, fontSize: 15, fontFamily: 'BeenAgesRounded-SemiBold', flex: 1, textAlign: 'right' }}
            >
              {nextText}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function IntervalPanel({ cfg, c, tone, onN, onUnit }) {
  return (
    <View style={[styles.bigblk, { backgroundColor: tone.ac }]}>
      <View style={styles.big}>
        <StepperBtn c={c} label="−" onPress={() => onN(cfg.n - 1)} />
        <View>
          <Text style={[styles.num, { color: c.label }]}>{cfg.n}</Text>
          <Text style={{ textAlign: 'center', color: c.l2, marginTop: 2, fontSize: 15, fontFamily: 'BeenAgesRounded-Regular' }}>
            {intervalUnitLabel(cfg.unit)}
          </Text>
        </View>
        <StepperBtn c={c} label="+" onPress={() => onN(cfg.n + 1)} />
      </View>
      <View style={styles.units}>
        {UNITS.map((u) => {
          const on = cfg.unit === u;
          return (
            <TouchableOpacity
              key={u}
              testID={`reminder-unit-${u}`}
              onPress={() => onUnit(u)}
              style={[styles.uc, { backgroundColor: on ? c.brand : c.cell }]}
            >
              <Text style={{
                color: on ? c.onbrand : c.label,
                fontSize: 14,
                fontFamily: on ? 'BeenAgesRounded-Bold' : 'BeenAgesRounded-Regular',
              }}
              >
                {t(UNIT_KEYS[u])}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {cfg.unit === UNIT_DAY ? (
        <View style={styles.chips}>
          {INTERVAL_DAY_CHIPS.map((n) => {
            const on = cfg.n === n;
            return (
              <TouchableOpacity
                key={n}
                onPress={() => onN(n)}
                style={[styles.chip, { backgroundColor: on ? c.brand : c.cell }]}
              >
                <Text style={{
                  color: on ? c.onbrand : c.label,
                  fontFamily: on ? 'BeenAgesRounded-Bold' : 'BeenAgesRounded-Regular',
                  fontSize: 14,
                }}
                >
                  {t(DAY_CHIP_KEYS[n])}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function WeekPanel({ cfg, c, tone, onToggle }) {
  return (
    <View style={[styles.bigblk, { backgroundColor: tone.ac }]}>
      <Text style={{
        textAlign: 'center',
        color: c.label,
        fontSize: 17,
        fontFamily: 'BeenAgesRounded-SemiBold',
        paddingTop: 4,
        paddingHorizontal: 20,
      }}
      >
        {formatWeekdayHint(cfg.weekdays)}
      </Text>
      <View style={styles.wdays}>
        {WEEKDAY_ORDER.map((d) => {
          const on = cfg.weekdays.includes(d);
          return (
            <TouchableOpacity
              key={d}
              testID={`reminder-wd-${d}`}
              onPress={() => onToggle(d)}
              accessibilityLabel={t(`reminder.wdName${d}`)}
              style={[styles.wd, { backgroundColor: on ? c.brand : c.cell }]}
            >
              <Text style={{
                color: on ? c.onbrand : c.label,
                fontSize: 15,
                fontFamily: 'BeenAgesRounded-SemiBold',
              }}
              >
                {t(`reminder.wd${d}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function MonthPanel({ cfg, c, tone, onN }) {
  return (
    <View style={[styles.bigblk, { backgroundColor: tone.ac }]}>
      <View style={styles.big}>
        <StepperBtn c={c} label="−" onPress={() => onN(cfg.monthDay - 1)} />
        <View>
          <Text style={[styles.num, { color: c.label }]}>{cfg.monthDay}</Text>
          <Text style={{ textAlign: 'center', color: c.l2, marginTop: 2, fontSize: 15, fontFamily: 'BeenAgesRounded-Regular' }}>
            {t('reminder.monthDayUnit')}
          </Text>
        </View>
        <StepperBtn c={c} label="+" onPress={() => onN(cfg.monthDay + 1)} />
      </View>
      <View style={styles.chips}>
        {MONTH_DAY_CHIPS.map((n) => {
          const on = cfg.monthDay === n;
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onN(n)}
              style={[styles.chip, { backgroundColor: on ? c.brand : c.cell }]}
            >
              <Text style={{
                color: on ? c.onbrand : c.label,
                fontFamily: on ? 'BeenAgesRounded-Bold' : 'BeenAgesRounded-Regular',
                fontSize: 14,
              }}
              >
                {t('reminder.monthDayChip', { n })}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function StepperBtn({ c, label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.rb, { backgroundColor: c.cell }]}>
      <Text style={{ color: c.label, fontSize: 24, fontFamily: 'BeenAgesRounded-Regular' }}>{label}</Text>
    </TouchableOpacity>
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
  title: { fontFamily: 'BeenAgesRounded-SemiBold', fontSize: 17 },
  grp: { marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', marginTop: 12 },
  seg: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 3,
    borderRadius: 12,
    gap: 2,
  },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 10 },
  bigblk: { marginHorizontal: 16, marginTop: 16, borderRadius: 26, paddingVertical: 16 },
  big: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, paddingVertical: 6 },
  num: { fontSize: 76, fontFamily: 'BeenAgesRounded-SemiBold', lineHeight: 84, textAlign: 'center', minWidth: 48 },
  rb: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  units: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 14 },
  uc: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 14, justifyContent: 'center' },
  chip: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 18 },
  wdays: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  wd: { flex: 1, aspectRatio: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  sum: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
