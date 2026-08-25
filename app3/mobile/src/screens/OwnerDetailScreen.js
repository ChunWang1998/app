import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { PLAY_OPTIONS } from '../data/constants';
import { dogById, normalizeProfile } from '../lib/dogs';

export default function OwnerDetailScreen({
  owner,
  focusDogId,
  subscribed,
  isMe,
  connect,
  tourHint,
  onBack,
  onSubscribe,
  onConnect,
  onOpenChat,
  onReport,
  onBlock,
}) {
  const insets = useSafeAreaInsets();
  const normalized = useMemo(() => normalizeProfile(owner), [owner]);
  const dog = useMemo(
    () => dogById(normalized, focusDogId) || normalized?.dogs?.[0],
    [normalized, focusDogId],
  );

  if (!owner || !normalized) {
    return (
      <View style={[styles.fill, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.back} onPress={onBack}>
          ← 返回
        </Text>
        <Text style={styles.empty}>找不到這位主人</Text>
      </View>
    );
  }

  const play = PLAY_OPTIONS.find((p) => p.id === dog?.playWith)?.label;
  const otherDogs = (normalized.dogs || []).filter((d) => d.id !== dog?.id);

  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 32 }}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.back}>← 清單</Text>
        </TouchableOpacity>
        {tourHint ? (
          <View style={styles.tour}>
            <Text style={styles.tourTxt}>{tourHint}</Text>
          </View>
        ) : null}
        <View style={styles.hero}>
          {dog?.photoUri ? (
            <Image source={{ uri: dog.photoUri }} style={styles.photo} />
          ) : (
            <Text style={styles.emoji}>{owner.isGuide ? '👋' : '🐕'}</Text>
          )}
          <Text style={styles.name}>{dog?.dogName || owner.dogName}</Text>
          {normalized.ownerNick ? (
            <Text style={styles.nick}>主人 {normalized.ownerNick}</Text>
          ) : null}
          {owner.isGuide ? (
            <Text style={styles.guide}>範例汪汪 · 每位用戶都看得到</Text>
          ) : null}
          {(normalized.dogs || []).length > 1 ? (
            <Text style={styles.same}>同一主人 · 共 {(normalized.dogs || []).length} 隻狗</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          {dog?.intro ? <Row label="介紹" value={dog.intro} /> : null}
          <Row
            label="類型"
            value={`${dog?.breed || '—'} · ${dog?.size || '—'} · ${dog?.ageRange || '—'}`}
          />
          <Row label="個性" value={(dog?.personalities || []).join('、') || '—'} />
          <Row
            label="時段"
            value={(normalized.slots || []).map((s) => s.label).join('、') || '—'}
          />
          <Row label="地點" value={(normalized.places || []).join('、') || '—'} />
          <Row
            label="行政區"
            value={`${normalized.city || ''} ${normalized.district || ''}`}
          />
          <Row label="與其他狗" value={play || '—'} />
          <Row label="出去次數" value={String(normalized.outingCount || 0)} />
          <Row label="Connect 次數" value={String(normalized.connectCount || 0)} />
          <Row label="汪汪大隊長次數" value={String(normalized.captainCount || 0)} />
          <Row label="汪汪隊員次數" value={String(normalized.memberCount || 0)} />
          <Row label="汪汪大隊長分數" value={String(normalized.captainScore || 0)} />
        </View>

        {otherDogs.length ? (
          <View style={styles.card}>
            <Text style={styles.otherTitle}>同一主人的其他狗</Text>
            {otherDogs.map((d) => (
              <Text key={d.id} style={styles.otherDog}>
                {d.dogName}
                {d.size ? ` · ${d.size}` : ''}
                {d.breed ? ` · ${d.breed}` : ''}
              </Text>
            ))}
          </View>
        ) : null}

        {isMe ? (
          <Text style={styles.note}>這是你自己的檔案</Text>
        ) : subscribed ? (
          connect?.status === 'accepted' ? (
            <TouchableOpacity style={styles.cta} onPress={onOpenChat}>
              <Text style={styles.ctaText}>打開對話窗</Text>
            </TouchableOpacity>
          ) : connect?.status === 'pending' ? (
            <Text style={styles.note}>
              {owner.isGuide ? '對方正在回覆…' : 'Connect 已送出，等對方在個人頁接受後才能聊天'}
            </Text>
          ) : (
            <TouchableOpacity style={styles.cta} onPress={onConnect}>
              <Text style={styles.ctaText}>Connect</Text>
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity style={styles.cta} onPress={onSubscribe}>
            <Text style={styles.ctaText}>訂閱後才能 Connect</Text>
          </TouchableOpacity>
        )}

        {!isMe && !owner.isGuide && (onReport || onBlock) ? (
          <View style={styles.safety}>
            {onReport ? (
              <TouchableOpacity
                onPress={() => {
                  Alert.alert('檢舉這位主人', '選擇原因（我們會在後台看到）', [
                    { text: '取消', style: 'cancel' },
                    { text: '騷擾／不當', onPress: () => onReport('騷擾／不當') },
                    { text: '不實檔案／危險', onPress: () => onReport('不實檔案／危險') },
                  ]);
                }}
              >
                <Text style={styles.safetyLink}>檢舉</Text>
              </TouchableOpacity>
            ) : null}
            {onBlock ? (
              <TouchableOpacity
                onPress={() => {
                  Alert.alert('封鎖', '封鎖後對方不會出現在清單，也無法再 Connect。', [
                    { text: '取消', style: 'cancel' },
                    { text: '封鎖', style: 'destructive', onPress: onBlock },
                  ]);
                }}
              >
                <Text style={styles.safetyLink}>封鎖</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bgBottom },
  backBtn: { paddingHorizontal: 16, marginBottom: 8 },
  back: { color: colors.brandDeep, fontWeight: '800', fontSize: 15 },
  empty: { padding: 16, color: colors.muted },
  tour: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#FFF1E0',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0C9A0',
  },
  tourTxt: { color: colors.brandDeep, fontWeight: '700', lineHeight: 20 },
  hero: { alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  photo: { width: 120, height: 120, borderRadius: 28 },
  emoji: { fontSize: 64 },
  name: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
  },
  nick: { marginTop: 4, color: colors.muted, fontWeight: '600' },
  guide: { marginTop: 6, color: colors.ok, fontWeight: '700' },
  same: { marginTop: 6, color: colors.brandDeep, fontWeight: '700' },
  card: {
    marginHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
  },
  row: { marginBottom: 10 },
  label: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  value: { marginTop: 2, fontSize: 15, color: colors.ink, lineHeight: 22 },
  otherTitle: { fontWeight: '800', color: colors.ink, marginBottom: 8 },
  otherDog: { color: colors.muted, marginBottom: 4, fontWeight: '600' },
  note: {
    textAlign: 'center',
    color: colors.muted,
    fontWeight: '700',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  cta: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  safety: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    marginTop: 20,
  },
  safetyLink: { color: colors.muted, fontWeight: '700' },
});
