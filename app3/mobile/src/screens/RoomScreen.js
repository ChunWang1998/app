import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Share,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { colors, radius, type } from '../theme';
import BigButton from '../components/BigButton';
import { getWorkMeta, listSutras } from '../data/sutras';
import {
  refreshRoom,
  getMemberTodayStats,
  getOverallProgress,
  getNextUnitIndex,
  getRoomDisplayName,
  changeRoomSutra,
} from '../storage/rooms';
import { resolveWorkId } from '../storage/corpus/aliases';
import { getDeviceId } from '../lib/deviceId';

export default function RoomScreen({ roomCode, onBack, onStartCopy }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [room, setRoom] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pickingSutra, setPickingSutra] = useState(false);
  const [changingSutra, setChangingSutra] = useState(false);

  const sutras = listSutras();

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const [id, next] = await Promise.all([getDeviceId(), refreshRoom(roomCode)]);
      setDeviceId(id);
      if (!next) {
        setLoadError('找不到這個房間');
        setRoom(null);
        return;
      }
      setRoom(next);
    } catch (e) {
      setLoadError(e?.message || '載入失敗，請稍後再試');
      setRoom(null);
    }
  }, [roomCode]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!room) {
    return (
      <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
        <SafeAreaView style={styles.fill}>
          <View style={styles.center}>
            <Text style={styles.muted}>{loadError || '載入房間…'}</Text>
            {loadError ? (
              <TouchableOpacity onPress={load} style={{ marginTop: 12 }}>
                <Text style={styles.link}>重試</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={onBack} style={{ marginTop: 16 }}>
              <Text style={styles.back}>← 返回</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const meta = getWorkMeta(room.sutraId);
  const me = room.members.find((m) => m.deviceId === deviceId);
  const myToday = me ? getMemberTodayStats(room, me) : null;
  const myOverall = me ? getOverallProgress(room, me) : null;
  const nextIndex = me ? getNextUnitIndex(room, me) : 0;
  const finished = myOverall && myOverall.completed >= myOverall.total;

  const copyCode = async () => {
    await Clipboard.setStringAsync(room.code);
    Alert.alert('已複製', `房間碼 ${room.code}`);
  };

  const roomTitle = getRoomDisplayName(room);
  const isHost = deviceId === room.hostDeviceId;

  const confirmChangeSutra = (nextSutraId) => {
    if (resolveWorkId(nextSutraId) === resolveWorkId(room.sutraId)) {
      setPickingSutra(false);
      return;
    }
    const next = getWorkMeta(nextSutraId);
    Alert.alert(
      '更換經文',
      `確定改抄《${next?.shortTitle || '經文'}》？全員進度會重新計算。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確定更換',
          style: 'destructive',
          onPress: () => applyChangeSutra(nextSutraId),
        },
      ],
    );
  };

  const applyChangeSutra = async (nextSutraId) => {
    setChangingSutra(true);
    try {
      const result = await changeRoomSutra({
        code: room.code,
        deviceId,
        sutraId: nextSutraId,
      });
      if (!result.ok) {
        Alert.alert('更換失敗', result.error);
        return;
      }
      setRoom(result.room);
      setPickingSutra(false);
    } catch (e) {
      Alert.alert('更換失敗', e?.message || '請稍後再試');
    } finally {
      setChangingSutra(false);
    }
  };

  const shareInvite = async () => {
    const message = `「${roomTitle}」邀你一起抄《${meta?.shortTitle || '經文'}》！房間碼：${room.code}`;
    try {
      await Share.share({ message });
    } catch {
      // user cancelled
    }
  };

  const memberList = (
    <View style={isTablet ? styles.sidePane : undefined}>
      <Text style={styles.section}>今日進度</Text>
      {room.members.map((m) => {
        const stats = getMemberTodayStats(room, m);
        const isMe = m.deviceId === deviceId;
        return (
          <View key={m.deviceId} style={styles.memberCard}>
            <View style={styles.memberRow}>
              <Text style={styles.memberName}>
                {m.name}
                {isMe ? '（我）' : ''}
                {m.deviceId === room.hostDeviceId ? ' · 房主' : ''}
              </Text>
              <Text style={[styles.badge, stats.metQuota && styles.badgeDone]}>
                {stats.metQuota ? '已達成' : `${stats.todayDone}/${stats.quota}`}
              </Text>
            </View>
            {stats.makeUpDone > 0 ? (
              <Text style={styles.memberMeta}>今日另補抄 {stats.makeUpDone} 句</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[styles.content, isTablet && styles.contentTablet]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
          }
        >
          <TouchableOpacity onPress={onBack} hitSlop={12}>
            <Text style={styles.back}>← 首頁</Text>
          </TouchableOpacity>

          <View style={isTablet ? styles.tabletRow : undefined}>
            <View style={isTablet ? styles.mainPane : undefined}>
              <Text style={styles.title}>{roomTitle}</Text>
              <Text style={styles.sub}>
                共抄《{meta?.shortTitle || '經文'}》· {meta?.title || ''}
              </Text>
              {isHost ? (
                <TouchableOpacity
                  onPress={() => setPickingSutra((v) => !v)}
                  hitSlop={8}
                  disabled={changingSutra}
                >
                  <Text style={styles.changeSutra}>
                    {pickingSutra ? '收起經文列表' : '更換經文（房主）'}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {pickingSutra && isHost ? (
                <View style={styles.sutraPicker}>
                  <Text style={styles.sutraPickerHint}>選定後全員一起改抄這部經</Text>
                  {sutras.map((s) => {
                    const active = resolveWorkId(s.id) === resolveWorkId(room.sutraId);
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.sutraCard, active && styles.sutraActive]}
                        onPress={() => confirmChangeSutra(s.id)}
                        activeOpacity={0.85}
                        disabled={changingSutra}
                      >
                        <Text style={[styles.sutraTitle, active && styles.sutraTitleActive]}>
                          {s.shortTitle}
                          {active ? ' · 目前' : ''}
                        </Text>
                        <Text style={styles.sutraMeta}>
                          {s.unitCount} 句 · {s.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}

              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>房間碼</Text>
                <Text style={styles.code}>{room.code}</Text>
                <View style={styles.codeActions}>
                  <TouchableOpacity onPress={copyCode}>
                    <Text style={styles.link}>複製</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={shareInvite}>
                    <Text style={styles.link}>分享邀請</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {myToday && myOverall ? (
                <View style={styles.myCard}>
                  <Text style={styles.myTitle}>我的進度</Text>
                  <Text style={styles.myLine}>
                    今日 {myToday.todayDone}/{myToday.quota} 句
                    {myToday.metQuota ? ' · 已達成' : ` · 還差 ${myToday.remainingToday} 句`}
                  </Text>
                  <Text style={styles.myLine}>
                    全書 {myOverall.completed}/{myOverall.total} 句
                  </Text>
                  {!myToday.metQuota && myToday.remainingToday > 0 ? (
                    <Text style={styles.makeUpHint}>漏抄可之後補上，繼續往下抄即可。</Text>
                  ) : null}
                </View>
              ) : null}

              <BigButton
                title={finished ? '已全部抄完' : myToday?.metQuota ? '繼續補抄／往下抄' : '開始今日抄寫'}
                onPress={() => onStartCopy(room.code, nextIndex)}
                disabled={finished}
                style={styles.startBtn}
              />
              <Text style={styles.source}>{meta?.source || ''}</Text>
            </View>

            {memberList}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: type.body, color: colors.muted },
  content: { padding: 24, paddingBottom: 48 },
  contentTablet: { paddingHorizontal: 32 },
  tabletRow: { flexDirection: 'row', gap: 24, marginTop: 8 },
  mainPane: { flex: 1.2 },
  sidePane: { flex: 1, marginTop: 0 },
  back: { fontSize: type.bodySm, color: colors.brandDeep, fontWeight: '600' },
  title: {
    marginTop: 16,
    fontSize: type.title,
    fontWeight: '800',
    color: colors.ink,
  },
  sub: {
    marginTop: 4,
    fontSize: type.label,
    color: colors.muted,
  },
  changeSutra: {
    marginTop: 8,
    fontSize: type.bodySm,
    color: colors.brand,
    fontWeight: '700',
  },
  sutraPicker: {
    marginTop: 12,
  },
  sutraPickerHint: {
    marginBottom: 10,
    fontSize: type.label,
    color: colors.muted,
  },
  sutraCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  sutraActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  sutraTitle: {
    fontSize: type.body,
    fontWeight: '700',
    color: colors.ink,
  },
  sutraTitleActive: {
    color: colors.brandDeep,
  },
  sutraMeta: {
    marginTop: 4,
    fontSize: type.label,
    color: colors.muted,
  },
  codeBox: {
    marginTop: 20,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  codeLabel: { fontSize: type.label, color: colors.muted },
  code: {
    marginTop: 6,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 8,
    color: colors.brandDeep,
  },
  codeActions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 24,
  },
  link: {
    fontSize: type.bodySm,
    color: colors.brand,
    fontWeight: '700',
  },
  myCard: {
    marginTop: 16,
    backgroundColor: colors.doneSoft,
    borderRadius: radius.card,
    padding: 18,
  },
  myTitle: {
    fontSize: type.subtitle,
    fontWeight: '700',
    color: colors.brandDeep,
  },
  myLine: {
    marginTop: 8,
    fontSize: type.bodySm,
    color: colors.ink,
  },
  makeUpHint: {
    marginTop: 8,
    fontSize: type.label,
    color: colors.muted,
  },
  startBtn: { marginTop: 20 },
  source: {
    marginTop: 12,
    fontSize: 13,
    color: colors.muted,
  },
  section: {
    marginTop: 28,
    marginBottom: 10,
    fontSize: type.subtitle,
    fontWeight: '700',
    color: colors.ink,
  },
  memberCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  memberName: {
    flex: 1,
    fontSize: type.bodySm,
    fontWeight: '700',
    color: colors.ink,
  },
  badge: {
    fontSize: type.label,
    fontWeight: '700',
    color: colors.muted,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeDone: {
    color: colors.brandDeep,
    backgroundColor: colors.brandSoft,
  },
  memberMeta: {
    marginTop: 6,
    fontSize: type.label,
    color: colors.muted,
  },
});
