import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';

export default function GatheringDetailScreen({
  gathering,
  onBack,
  onLike,
}) {
  const insets = useSafeAreaInsets();
  const g = gathering;
  if (!g) {
    return (
      <View style={[styles.fill, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.back} onPress={onBack}>
          ← 返回
        </Text>
        <Text style={styles.empty}>找不到這場聚會</Text>
      </View>
    );
  }

  const openLine = async () => {
    try {
      await Linking.openURL(g.lineGroupUrl);
    } catch {
      Alert.alert('打不開連結', g.lineGroupUrl);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingHorizontal: 16,
        paddingBottom: 40,
      }}
    >
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>← 返回</Text>
      </TouchableOpacity>
      <Text style={styles.h}>{g.name}</Text>
      <Text style={styles.type}>{g.type}</Text>
      <View style={styles.card}>
        <Row label="縣市" value={g.city || '—'} />
        <Row label="日期" value={g.dateLabel} />
        <Row label="地點" value={g.place} />
        <Row label="主辦" value={`${g.hostName} · 大隊長分數 ${g.hostCaptainScore || 0}`} />
        <Row label="收費" value={g.fee === 0 ? '免費' : `NT$${g.fee}`} />
        <Row label="人數" value={`${g.joinedCount || 0}/${g.capacity || 8}${g.full ? ' · 額滿' : ''}`} />
        <Row label="簡介" value={g.intro || '—'} />
        <Row label="狀態" value={g.ended ? '已結束' : '即將開始'} />
      </View>

      <Text style={styles.k}>LINE 群組邀請</Text>
      <Text style={styles.hint}>報名後由主辦者提供的群組連結，平台不經手金流。</Text>
      <TouchableOpacity style={styles.cta} onPress={openLine}>
        <Text style={styles.ctaText}>打開 LINE 群組</Text>
      </TouchableOpacity>
      <Text style={styles.url}>{g.lineGroupUrl}</Text>

      {g.ended && g.iJoined && !g.iHost ? (
        g.liked ? (
          <Text style={styles.note}>已為主辦人按讚</Text>
        ) : (
          <TouchableOpacity style={styles.like} onPress={onLike}>
            <Text style={styles.likeTxt}>給主辦人按讚</Text>
          </TouchableOpacity>
        )
      ) : null}
      {g.ended && g.iHost ? (
        <Text style={styles.note}>活動已結束。隊員可為你按讚，加汪汪大隊長分數。</Text>
      ) : null}
    </ScrollView>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rk}>{label}</Text>
      <Text style={styles.rv}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  back: { color: colors.brandDeep, fontWeight: '800', fontSize: 16, marginBottom: 8 },
  empty: { textAlign: 'center', marginTop: 40, color: colors.muted },
  h: { fontSize: 26, fontWeight: '800', color: colors.ink },
  type: { marginTop: 6, color: colors.brandDeep, fontWeight: '800' },
  card: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: { marginBottom: 10 },
  rk: { fontSize: 12, color: colors.muted, marginBottom: 2 },
  rv: { fontSize: 15, fontWeight: '700', color: colors.ink },
  k: { marginTop: 20, fontWeight: '800', color: colors.ink },
  hint: { marginTop: 4, fontSize: 12, color: colors.muted, lineHeight: 18 },
  cta: {
    marginTop: 12,
    backgroundColor: '#06C755',
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  url: { marginTop: 8, fontSize: 12, color: colors.muted },
  like: {
    marginTop: 20,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  likeTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  note: { marginTop: 18, textAlign: 'center', color: colors.muted, lineHeight: 20 },
});
