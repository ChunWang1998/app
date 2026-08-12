import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, type } from '../theme';
import BigButton from '../components/BigButton';
import {
  listMyRooms,
  leaveMyRoom,
  getRoomDisplayName,
  MAX_ROOMS_PER_PERSON,
} from '../storage/rooms';
import { getSutra, getWorkMeta } from '../data/sutras';

export default function HomeScreen({
  onCreate,
  onJoin,
  onOpenRoom,
  onSettings,
  refreshToken = 0,
}) {
  const [rooms, setRooms] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const list = await listMyRooms();
    setRooms(list);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const atRoomLimit = rooms.length >= MAX_ROOMS_PER_PERSON;

  const handleCreate = () => {
    if (atRoomLimit) {
      Alert.alert('房間已滿', `每人最多 ${MAX_ROOMS_PER_PERSON} 個房間。`);
      return;
    }
    onCreate();
  };

  const handleJoin = () => {
    if (atRoomLimit) {
      Alert.alert('房間已滿', `每人最多 ${MAX_ROOMS_PER_PERSON} 個房間。請先在列表長按離開一間。`);
      return;
    }
    onJoin();
  };

  const handleLeave = (code, title) => {
    Alert.alert('離開房間', `確定離開「${title}」？進度仍留在房間內，只是從你的列表移除。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '離開',
        style: 'destructive',
        onPress: async () => {
          await leaveMyRoom(code);
          await load();
        },
      },
    ]);
  };

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <View />
          <TouchableOpacity onPress={onSettings} hitSlop={12} style={styles.settingsBtn}>
            <Text style={styles.settingsText}>設定</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
          }
        >
          <Text style={styles.brand}>共抄</Text>
          <Text style={styles.tagline}>和家人一起，一天抄幾句經</Text>

          <View style={styles.actions}>
            <BigButton
              title={atRoomLimit ? `已達上限（${MAX_ROOMS_PER_PERSON} 間）` : '自己開一間'}
              onPress={handleCreate}
              disabled={atRoomLimit}
            />
            <BigButton
              title="輸入房間碼進入"
              onPress={handleJoin}
              variant="secondary"
              style={styles.gap}
              disabled={atRoomLimit}
            />
          </View>

          <Text style={styles.section}>
            我的房間（{rooms.length}/{MAX_ROOMS_PER_PERSON}）
          </Text>
          {rooms.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                還沒有房間。開一間，或輸入家人給你的房間碼。
              </Text>
            </View>
          ) : (
            rooms.map((room) => {
              const title = getRoomDisplayName(room);
              const sutra = getWorkMeta(room.sutraId);
              return (
                <TouchableOpacity
                  key={room.code}
                  style={styles.roomCard}
                  activeOpacity={0.85}
                  onPress={() => onOpenRoom(room.code)}
                  onLongPress={() => handleLeave(room.code, title)}
                >
                  <Text style={styles.roomTitle}>{title}</Text>
                  <Text style={styles.roomMeta}>
                    共抄《{sutra?.shortTitle || '經文'}》· 房間碼 {room.code}
                  </Text>
                  <Text style={styles.roomMeta}>
                    {room.members.length} 人 · 每日 {room.dailyQuota} 句
                  </Text>
                  <Text style={styles.leaveHint}>長按可離開此房</Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  settingsBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  settingsText: {
    fontSize: type.bodySm,
    color: colors.brandDeep,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  brand: {
    fontSize: type.hero,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: 2,
  },
  tagline: {
    marginTop: 8,
    fontSize: type.bodySm,
    color: colors.muted,
    lineHeight: 28,
  },
  actions: {
    marginTop: 32,
  },
  gap: {
    marginTop: 12,
  },
  section: {
    marginTop: 36,
    marginBottom: 12,
    fontSize: type.subtitle,
    fontWeight: '700',
    color: colors.ink,
  },
  empty: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyText: {
    fontSize: type.bodySm,
    color: colors.muted,
    lineHeight: 28,
  },
  roomCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  roomTitle: {
    fontSize: type.title,
    fontWeight: '700',
    color: colors.ink,
  },
  roomMeta: {
    marginTop: 6,
    fontSize: type.label,
    color: colors.muted,
  },
  leaveHint: {
    marginTop: 10,
    fontSize: 13,
    color: colors.muted,
  },
});
