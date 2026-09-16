import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';
import { labelsForIdentities, REPORT_REASONS, CHAT_CAP } from '../data/identities';

const STATUS_LABEL = {
  chatting: '簡聊中',
  awaiting_consent: '待雙方同意',
  line_revealed: '已交換 LINE',
  ended_declined: '已結束（未交換）',
  ended_left: '已離開',
  ended_reported: '已檢舉結束',
};

export default function HistoryScreen({ loadMatches, onBack, onOpenMatch, onReport }) {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await loadMatches();
        if (alive) setRows(data?.matches || []);
      } catch (e) {
        Alert.alert('無法載入', String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadMatches]);

  const report = (item) => {
    Alert.alert('檢舉這位使用者', '選擇原因', [
      ...REPORT_REASONS.map((reason) => ({
        text: reason,
        onPress: async () => {
          try {
            await onReport(item.other.id, reason, item.match_id);
            Alert.alert('已收到檢舉');
            setRows((prev) =>
              prev.map((r) =>
                r.match_id === item.match_id
                  ? { ...r, status: 'ended_reported', other: { ...r.other, line_id: null } }
                  : r,
              ),
            );
          } catch (e) {
            Alert.alert('無法檢舉', String(e?.message || e));
          }
        },
      })),
      { text: '取消', style: 'cancel' },
    ]);
  };

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <ScrollView
        contentContainerStyle={[
          styles.pad,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 },
        ]}
      >
        <Text style={styles.brand}>配對紀錄</Text>
        {loading && <ActivityIndicator color={colors.brand} />}
        {!loading && rows.length === 0 && (
          <Text style={styles.empty}>尚無配對</Text>
        )}
        {rows.map((item) => {
          const status = item.status || 'chatting';
          const revealed = status === 'line_revealed';
          const ended = String(status).startsWith('ended_');
          const count = item.message_count ?? 0;
          const cap = item.chat_cap ?? CHAT_CAP;
          return (
            <View key={item.match_id} style={styles.card}>
              <Text style={styles.value}>
                {labelsForIdentities(item.other?.own_identities).join('、')}
              </Text>
              <Text style={styles.status}>{STATUS_LABEL[status] || status}</Text>
              {!ended && (
                <Text style={styles.meta}>
                  {count}/{cap} 句
                </Text>
              )}
              {revealed && item.other?.line_id ? (
                <Text style={styles.line}>LINE：{item.other.line_id}</Text>
              ) : (
                <Text style={styles.meta}>
                  {ended ? '未交換聯絡方式' : '簡聊後雙方同意才顯示 LINE'}
                </Text>
              )}
              <Text style={styles.meta}>
                {item.created_at
                  ? new Date(item.created_at).toLocaleString('zh-TW')
                  : ''}
              </Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.secondary}
                  onPress={() => onOpenMatch(item)}
                >
                  <Text style={styles.secondaryText}>
                    {revealed ? '查看 LINE' : ended ? '詳情' : '進入聊天'}
                  </Text>
                </TouchableOpacity>
                {!ended && (
                  <TouchableOpacity style={styles.danger} onPress={() => report(item)}>
                    <Text style={styles.dangerText}>檢舉</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
        <TouchableOpacity style={styles.primary} onPress={onBack}>
          <Text style={styles.primaryText}>返回</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { paddingHorizontal: 20, gap: 12 },
  brand: { fontSize: 28, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  empty: { color: colors.muted },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 6,
  },
  value: { fontWeight: '700', color: colors.ink, fontSize: 16 },
  status: { color: colors.brandDeep, fontWeight: '600' },
  line: { color: colors.brandDeep, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 12 },
  row: { flexDirection: 'row', gap: 8, marginTop: 6 },
  secondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.row,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryText: { fontWeight: '600', color: colors.ink },
  danger: {
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.row,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dangerText: { color: colors.danger, fontWeight: '600' },
  primary: {
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.row,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryText: { color: '#fff', fontWeight: '700' },
});
