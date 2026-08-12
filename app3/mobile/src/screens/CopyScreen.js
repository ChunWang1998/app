import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, type } from '../theme';
import BigButton from '../components/BigButton';
import ZhuyinText from '../components/ZhuyinText';
import { getWork } from '../data/sutras';
import {
  getRoom,
  completeUnit,
  getMemberTodayStats,
  getOverallProgress,
  getRoomDisplayName,
} from '../storage/rooms';
import { getDeviceId } from '../lib/deviceId';
import { getShowZhuyin, setShowZhuyin } from '../storage/prefs';

export default function CopyScreen({ roomCode, startIndex = 0, onBack, onFinishedSession }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [room, setRoom] = useState(null);
  const [sutra, setSutra] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [index, setIndex] = useState(startIndex);
  const [fontScale, setFontScale] = useState(1);
  const [showZhuyin, setShowZhuyinState] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [id, next, zy] = await Promise.all([
      getDeviceId(),
      getRoom(roomCode),
      getShowZhuyin(),
    ]);
    setDeviceId(id);
    setRoom(next);
    setShowZhuyinState(zy);
    if (next?.sutraId) {
      const work = await getWork(next.sutraId);
      setSutra(work);
    } else {
      setSutra(null);
    }
  }, [roomCode]);

  useEffect(() => {
    load();
  }, [load]);

  const onToggleZhuyin = async (value) => {
    setShowZhuyinState(value);
    await setShowZhuyin(value);
  };

  const unit = sutra?.units[index];
  const me = room?.members.find((m) => m.deviceId === deviceId);
  const today = room && me ? getMemberTodayStats(room, me) : null;
  const overall = room && me ? getOverallProgress(room, me) : null;
  const alreadyDone = overall?.doneSet?.has(unit?.id);

  const markDone = async () => {
    if (!unit || saving) return;
    setSaving(true);
    try {
      const result = await completeUnit({
        code: roomCode,
        deviceId,
        unitId: unit.id,
      });
      if (!result.ok) {
        Alert.alert('無法記錄', result.error);
        return;
      }
      setRoom(result.room);
      const nextIndex = index + 1;
      if (nextIndex >= sutra.units.length) {
        Alert.alert('恭喜', '這部經已全部抄完。', [
          { text: '回房間', onPress: onFinishedSession },
        ]);
      } else {
        setIndex(nextIndex);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!room || !sutra || !unit) {
    return (
      <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
        <SafeAreaView style={styles.center}>
          <Text style={styles.meta}>載入中…</Text>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.back}>← 返回</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const fontSize = type.sutra * fontScale;
  const lineHeight = fontSize * 1.7;

  const sutraText = (
    <ScrollView
      style={styles.sutraScroll}
      contentContainerStyle={styles.sutraContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.progress}>
        第 {index + 1} / {sutra.units.length} 句
        {today ? ` · 今日 ${today.todayDone}/${today.quota}` : ''}
      </Text>
      <ZhuyinText
        text={unit.text}
        zhuyin={unit.zhuyin}
        showZhuyin={showZhuyin}
        fontSize={fontSize}
        lineHeight={lineHeight}
      />
      {alreadyDone ? <Text style={styles.doneTag}>此句已抄過</Text> : null}
    </ScrollView>
  );

  const controls = (
    <View style={styles.controls}>
      <View style={styles.fontRow}>
        <Text style={styles.fontLabel}>字級</Text>
        <TouchableOpacity
          style={styles.fontBtn}
          onPress={() => setFontScale((s) => Math.max(0.85, Number((s - 0.1).toFixed(2))))}
        >
          <Text style={styles.fontBtnText}>小</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fontBtn}
          onPress={() => setFontScale((s) => Math.min(1.45, Number((s + 0.1).toFixed(2))))}
        >
          <Text style={styles.fontBtnText}>大</Text>
        </TouchableOpacity>
        <View style={styles.zyRow}>
          <Text style={styles.fontLabel}>注音</Text>
          <Switch
            value={showZhuyin}
            onValueChange={onToggleZhuyin}
            trackColor={{ false: colors.line, true: colors.brandSoft }}
            thumbColor={showZhuyin ? colors.brand : '#f4f4f4'}
            ios_backgroundColor={colors.line}
          />
        </View>
      </View>

      <BigButton
        title={alreadyDone ? '下一句' : '完成此句'}
        onPress={alreadyDone ? () => setIndex((i) => Math.min(i + 1, sutra.units.length - 1)) : markDone}
        loading={saving}
      />
      <View style={styles.navRow}>
        <TouchableOpacity
          disabled={index <= 0}
          onPress={() => setIndex((i) => Math.max(0, i - 1))}
          style={[styles.navBtn, index <= 0 && styles.navDisabled]}
        >
          <Text style={styles.navText}>上一句</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} style={styles.navBtn}>
          <Text style={styles.navText}>回房間</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} hitSlop={12}>
            <Text style={styles.back}>← 房間</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {getRoomDisplayName(room)}
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              《{sutra.shortTitle}》
            </Text>
          </View>
          <View style={{ width: 56 }} />
        </View>

        {isTablet ? (
          <View style={styles.tablet}>
            <View style={styles.tabletLeft}>{sutraText}</View>
            <View style={styles.tabletRight}>{controls}</View>
          </View>
        ) : (
          <View style={styles.phone}>
            {sutraText}
            {controls}
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  back: { fontSize: type.bodySm, color: colors.brandDeep, fontWeight: '600' },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: type.bodySm,
    fontWeight: '700',
    color: colors.ink,
  },
  headerSub: {
    marginTop: 2,
    fontSize: type.label,
    color: colors.muted,
  },
  phone: { flex: 1, paddingHorizontal: 20, paddingBottom: 12 },
  tablet: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 20,
  },
  tabletLeft: {
    flex: 1.4,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tabletRight: {
    flex: 1,
    justifyContent: 'center',
  },
  sutraScroll: { flex: 1 },
  sutraContent: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  progress: {
    fontSize: type.label,
    color: colors.muted,
    marginBottom: 16,
  },
  doneTag: {
    marginTop: 16,
    fontSize: type.label,
    color: colors.brand,
    fontWeight: '700',
  },
  controls: {
    paddingTop: 8,
  },
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
    flexWrap: 'wrap',
  },
  zyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 8,
  },
  fontLabel: {
    fontSize: type.label,
    color: colors.muted,
    marginRight: 4,
  },
  fontBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  fontBtnText: {
    fontSize: type.bodySm,
    fontWeight: '700',
    color: colors.ink,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  navBtn: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  navDisabled: { opacity: 0.35 },
  navText: {
    fontSize: type.bodySm,
    color: colors.brandDeep,
    fontWeight: '600',
  },
  meta: { fontSize: type.body, color: colors.muted },
});
