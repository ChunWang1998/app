import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useActivities,
  logActivityNow,
  undoHandlerForLog,
  softDeleteActivity,
  undoDelete,
  FREE_ACTIVITY_LIMIT,
} from '../data/repository';
import { useThemeColors, useItemTone, useTheme } from '../theme/useTheme';
import { ItemGlyph } from '../components/ItemGlyph';
import { Mascot } from '../components/Mascot';
import { UndoToast } from '../components/UndoToast';
import { GearIcon, PlusIcon, CheckIcon, SortIcon } from '../components/Icons';
import { AiComposer } from '../components/AiComposer';
import { dueInMs, progressRatio, elapsedMs, formatSpanParts, formatLastDoneShort, isDetailHeroToday, formatHomeCountdown } from '../lib/time';
import { monogramLetter } from '../lib/suggestIcon';
import { splitToday, homeMood, dueStatus } from '../lib/today';
import { CategoryChips } from '../components/CategoryChips';
import { countByCategory } from '../data/repository';
import { filterByCategory } from '../lib/categories';
import * as Haptics from 'expo-haptics';
import { isProUnlocked } from '../lib/entitlements';
import { getLocale, t } from '../i18n';
import { hasReminder } from '../lib/reminderSchedule';

const JUST_MS = 60e3;

export default function HomeScreen() {
  const nav = useNavigation();
  const c = useThemeColors();
  const { sort, setSort, preciseTime } = useTheme();
  const insets = useSafeAreaInsets();
  const { activities, categories, ready } = useActivities();
  // Category filter. Adding an item never switches it (stays on All).
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);
  const loggingIds = useRef(new Set());

  const data = useMemo(() => {
    const mapped = [...activities].map((a) => {
      const due = dueInMs(a);
      return { ...a, _due: due };
    });
    if (sort === 'last') {
      return mapped.sort((x, y) => {
        const tx = x.lastDoneAt ? new Date(x.lastDoneAt).getTime() : 0;
        const ty = y.lastDoneAt ? new Date(y.lastDoneAt).getTime() : 0;
        return ty - tx;
      });
    }
    return mapped.sort((x, y) => (x._due === y._due ? 0 : x._due - y._due));
  }, [activities, sort]);
  const overdueCount = data.filter((x) => dueStatus(x._due) === 'overdue').length;
  const counts = useMemo(() => countByCategory(activities), [activities]);
  const activeFilter = filter !== 'all' && counts[filter] ? filter : 'all';
  const visible = useMemo(() => filterByCategory(data, activeFilter), [data, activeFilter]);
  const { today, rest } = useMemo(() => splitToday(visible), [visible]);
  const mood = overdueCount > 0 ? 'worry' : homeMood(data);

  function showToast(next) {
    setToast({ ...next, id: Date.now() });
  }

  async function handleCheck(a) {
    if (loggingIds.current.has(a.id)) return;
    loggingIds.current.add(a.id);
    let result;
    try {
      result = await logActivityNow(a.id);
    } catch (e) {
      if (e?.code === 'FREE_LIMIT') {
        nav.navigate('Paywall', { reason: e.kind || 'history' });
        return;
      }
      throw e;
    } finally {
      loggingIds.current.delete(a.id);
    }
    if (result.skipped) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    const undo = undoHandlerForLog(a.id, result);
    showToast({
      text: t('home.logged'),
      undo: undo || undefined,
    });
  }

  async function handleAdd() {
    const pro = await isProUnlocked();
    if (!pro && activities.length >= FREE_ACTIVITY_LIMIT) {
      nav.navigate('Paywall');
      return;
    }
    nav.navigate('Edit', {});
  }

  async function handleDelete(a) {
    await softDeleteActivity(a.id);
    showToast({
      text: t('home.deleted'),
      undo: async () => {
        try {
          await undoDelete(a.id);
          return true;
        } catch (e) {
          if (e?.code === 'FREE_LIMIT') {
            nav.navigate('Paywall');
            return false;
          }
          throw e;
        }
      },
    });
  }

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={[styles.band, { backgroundColor: c.band, paddingTop: insets.top }]}>
        <View style={styles.nav}>
          <TouchableOpacity
            onPress={() => nav.navigate('Settings')}
            accessibilityLabel={t('home.a11ySettings')}
            style={styles.ib}
            hitSlop={8}
          >
            <GearIcon color={c.brand} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              onPress={() => setSort(sort === 'due' ? 'last' : 'due')}
              accessibilityLabel={t('home.a11ySort')}
              style={styles.ib}
              hitSlop={8}
            >
              <SortIcon color={c.brand} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAdd}
              accessibilityLabel={t('home.a11yAdd')}
              style={styles.ib}
              hitSlop={8}
            >
              <PlusIcon color={c.brand} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.bandRow}>
          <Text style={[styles.lt, { color: c.label }]}>{t('app.title')}</Text>
          {overdueCount > 0 ? (
            <Text style={[styles.bandn, { color: c.l2 }]}>
              <Text style={{ color: c.red, fontFamily: 'BeenAgesRounded-Bold', fontSize: 18 }}>{overdueCount}</Text>
              {' '}{t('home.overdueSuffix')}
            </Text>
          ) : null}
          {data.length > 0 ? (
            <Mascot size={70} mood={mood} />
          ) : null}
        </View>
      </View>
      {data.length > 0 ? (
        <CategoryChips categories={categories} counts={counts} total={data.length} value={activeFilter} onChange={setFilter} />
      ) : null}
      <View style={styles.listWrap}>
        {!ready ? null : (
          <FlatList
            data={rest}
            ListHeaderComponent={today.length ? (
              <View testID="today-section">
                <Text style={[styles.todayH, { color: c.label }]}>
                  {t('home.dueToday')}
                  <Text style={{ color: c.l2 }}>{'\u2009'}{today.length}</Text>
                </Text>
                {today.map((item) => (
                  <Row
                    key={item.id}
                    item={item}
                    onCheck={() => handleCheck(item)}
                    onOpen={() => nav.navigate('Detail', { id: item.id })}
                    onDelete={() => handleDelete(item)}
                    preciseTime={preciseTime}
                  />
                ))}
                {rest.length ? <View style={[styles.todayGap, { backgroundColor: c.band }]} /> : null}
              </View>
            ) : null}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              data.length === 0 ? styles.emptyContainer : undefined,
              { paddingBottom: 110 + insets.bottom },
            ]}
            renderItem={({ item }) => (
              <Row
                item={item}
                onCheck={() => handleCheck(item)}
                onOpen={() => nav.navigate('Detail', { id: item.id })}
                onDelete={() => handleDelete(item)}
                preciseTime={preciseTime}
              />
            )}
            ListEmptyComponent={data.length === 0 ? (
              <View style={styles.empty}>
                <Mascot size={150} mood="sleepy" />
                <Text style={[styles.emptyT1, { color: c.label }]}>{t('home.empty')}</Text>
                <TouchableOpacity onPress={handleAdd} style={[styles.cta, { backgroundColor: c.brand }]}>
                  <Text style={[styles.ctaText, { color: c.onbrand }]}>{t('home.add')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          />
        )}
      </View>
      <View style={[styles.dock, { paddingBottom: 10 + insets.bottom, backgroundColor: c.bg }]} pointerEvents="box-none">
        <AiComposer
          editable={false}
          onOpen={() => nav.navigate('AiChat')}
          onMic={() => nav.navigate('AiChat', { voice: true })}
        />
      </View>
      {toast ? (
        <UndoToast
          key={toast.id}
          text={toast.text}
          undo={toast.undo}
          onDone={() => setToast(null)}
          bottom={88 + insets.bottom}
        />
      ) : null}
    </View>
  );
}

function Row({ item, onCheck, onOpen, onDelete, preciseTime }) {
  const c = useThemeColors();
  const tone = useItemTone(item.icon, item.title);
  const due = item._due;
  const ds = dueStatus(due);
  const od = ds === 'overdue';
  const soon = !od && due < 2 * 864e5;
  const elapsed = elapsedMs(item);
  const just = elapsed != null && elapsed < JUST_MS;
  const ratio = progressRatio(item);
  const hasReminderOn = hasReminder(item);

  let status;
  if (!item.lastDoneAt) status = t('home.neverLogged');
  else if (!hasReminderOn) status = formatLastDoneShort(item.lastDoneAt, Date.now(), getLocale());
  else if (ds === 'today' || (due >= 0 && due < 864e5)) status = t('common.today');
  else if (od) status = `${t('home.overdue')}\u2009${formatHomeCountdown(due)}`;
  else status = `${t('home.remaining')}\u2009${formatHomeCountdown(due)}`;

  const renderRight = () => (
    <TouchableOpacity
      onPress={onDelete}
      style={[styles.swipeDel, { backgroundColor: c.red }]}
      accessibilityLabel={t('home.a11yDelete', { title: item.title })}
    >
      <Text style={styles.swipeDelText}>{t('common.delete')}</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable renderRightActions={renderRight} overshootRight={false} friction={2}>
      <View style={[styles.it, { backgroundColor: c.bg, borderBottomColor: c.sep }]}>
        <View style={[styles.gl, { backgroundColor: od ? c.odtint : tone.ac }]}>
          <ItemGlyph kind={item.icon || 'brush'} color={tone.acf} letter={monogramLetter(item.title)} />
          {od ? <View style={[styles.odDot, { backgroundColor: c.red, borderColor: c.bg }]} /> : null}
        </View>
        <TouchableOpacity style={styles.tx} onPress={onOpen} activeOpacity={0.7}>
          <Text numberOfLines={1} style={[styles.nm, { color: c.label }]}>{item.title}</Text>
          <Text numberOfLines={1} style={[styles.st, { color: od ? c.red : c.l2 }]}>{status}</Text>
          {hasReminderOn ? (
            <View style={[styles.trk, { backgroundColor: c.track }]}>
              <View
                style={[
                  styles.trkI,
                  {
                    width: `${Math.max(Math.floor(ratio * 100), 2)}%`,
                    backgroundColor: od ? c.red : soon ? c.orange : c.l3,
                  },
                ]}
              />
            </View>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity onPress={onOpen} style={styles.numWrap} activeOpacity={0.7}>
          {elapsed == null ? (
            <Text style={[styles.numSmall, { color: c.l2 }]}>—</Text>
          ) : (
            <Numeral item={item} ms={elapsed} just={just} color={c.label} dim={c.l2} preciseTime={preciseTime} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onCheck}
          style={styles.ck}
          activeOpacity={0.85}
          accessibilityLabel={t('home.a11yLog', { title: item.title })}
        >
          <View style={[styles.ckDot, { borderColor: c.brand, backgroundColor: just ? c.brand : 'transparent' }]}>
            {just ? <CheckIcon color={c.onbrand} size={16} /> : null}
          </View>
        </TouchableOpacity>
      </View>
    </Swipeable>
  );
}

function Numeral({ item, ms, just, color, dim, preciseTime }) {
  if (isDetailHeroToday(item)) {
    return <Text style={[styles.num, { color }]}>{t('common.today')}</Text>;
  }
  const parts = formatSpanParts(ms, just || !preciseTime ? 1 : 2);
  return (
    <Text style={[styles.num, { color }]}>
      {parts.map((p, i) => (
        <Text key={i}>
          {p.n}
          <Text style={[styles.numSmall, { color: dim }]}>{p.unit}</Text>
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  todayH: { fontFamily: 'BeenAgesRounded-SemiBold', fontSize: 15, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
  todayGap: { height: 10 },
  root: { flex: 1 },
  band: { borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingBottom: 14, marginBottom: 8 },
  nav: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 12,
  },
  ib: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  bandRow: { flexDirection: 'row', alignItems: 'flex-end', paddingRight: 16 },
  lt: {
    fontSize: 36,
    letterSpacing: 1,
    paddingHorizontal: 22,
    paddingBottom: 6,
    paddingTop: 2,
    fontFamily: 'BeenAgesRounded-Bold',
    flex: 1,
  },
  bandn: { fontSize: 14, marginBottom: 14, marginRight: 6 },
  listWrap: { flex: 1, paddingTop: 2 },
  emptyContainer: { flexGrow: 1 },
  it: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 18,
    paddingRight: 12,
    minHeight: 80,
    borderBottomWidth: 1.5,
    borderBottomColor: 'transparent',
    borderStyle: 'dashed',
  },
  gl: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  odDot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  tx: { flex: 1, paddingVertical: 14 },
  nm: { fontSize: 18, fontFamily: 'BeenAgesRounded-SemiBold' },
  st: { fontSize: 14, marginTop: 3, fontFamily: 'BeenAgesRounded-Regular' },
  trk: { height: 5, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  trkI: { height: '100%', borderRadius: 3 },
  numWrap: { width: 108, alignItems: 'flex-end' },
  num: { fontSize: 30, fontFamily: 'BeenAgesRounded-SemiBold', lineHeight: 34 },
  numSmall: { fontSize: 13, fontFamily: 'BeenAgesRounded-Regular' },
  ck: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  ckDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2.4, alignItems: 'center', justifyContent: 'center' },
  swipeDel: { width: 88, alignItems: 'center', justifyContent: 'center' },
  swipeDelText: { color: '#fff', fontFamily: 'BeenAgesRounded-SemiBold', fontSize: 17 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyT1: { fontSize: 20, marginTop: 18, fontFamily: 'BeenAgesRounded-SemiBold' },
  cta: {
    height: 56,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    marginTop: 22,
    flexDirection: 'row',
    gap: 6,
  },
  ctaText: { fontSize: 18, fontFamily: 'BeenAgesRounded-SemiBold' },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
});
