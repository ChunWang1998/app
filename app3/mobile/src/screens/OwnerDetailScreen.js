import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { PLAY_OPTIONS } from '../data/constants';

export default function OwnerDetailScreen({
  owner,
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
  if (!owner) {
    return (
      <View style={[styles.fill, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.back} onPress={onBack}>
          ← 返回
        </Text>
        <Text style={styles.empty}>找不到這位主人</Text>
      </View>
    );
  }

  const play = PLAY_OPTIONS.find((p) => p.id === owner.playWith)?.label;

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
          {owner.photoUri ? (
            <Image source={{ uri: owner.photoUri }} style={styles.photo} />
          ) : (
            <Text style={styles.emoji}>{owner.isGuide ? '👋' : '🐕'}</Text>
          )}
          <Text style={styles.name}>{owner.dogName}</Text>
          {owner.ownerNick ? (
            <Text style={styles.nick}>主人 {owner.ownerNick}</Text>
          ) : null}
          {owner.isGuide ? (
            <Text style={styles.guide}>範例汪汪 · 每位用戶都看得到</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          {owner.intro ? <Row label="介紹" value={owner.intro} /> : null}
          <Row label="類型" value={`${owner.breed || '—'} · ${owner.size || '—'} · ${owner.ageRange || '—'}`} />
          <Row label="個性" value={(owner.personalities || []).join('、') || '—'} />
          <Row
            label="時段"
            value={(owner.slots || []).map((s) => s.label).join('、') || '—'}
          />
          <Row label="地點" value={(owner.places || []).join('、') || '—'} />
          <Row label="行政區" value={`${owner.city || ''} ${owner.district || ''}`} />
          <Row label="與其他狗" value={play || '—'} />
          <Row label="出去次數" value={String(owner.outingCount || 0)} />
          <Row label="Connect 次數" value={String(owner.connectCount || 0)} />
          <Row label="汪汪大隊長次數" value={String(owner.captainCount || 0)} />
          <Row label="汪汪隊員次數" value={String(owner.memberCount || 0)} />
          <Row label="汪汪大隊長分數" value={String(owner.captainScore || 0)} />
        </View>

        {isMe ? (
          <Text style={styles.note}>這是你自己的檔案</Text>
        ) : subscribed ? (
          connect?.status === 'accepted' ? (
            <TouchableOpacity style={styles.cta} onPress={onOpenChat}>
              <Text style={styles.ctaText}>打開對話窗</Text>
            </TouchableOpacity>
          ) : connect?.status === 'pending' ? (
            <Text style={styles.note}>
              {owner.isGuide ? '對方正在回覆…' : 'Connect 已送出，等對方在個人頁接受'}
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
      <Text style={styles.k}>{label}</Text>
      <Text style={styles.v}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  backBtn: { paddingHorizontal: 16, marginBottom: 8 },
  back: { color: colors.brandDeep, fontWeight: '800', fontSize: 16 },
  empty: { textAlign: 'center', marginTop: 40, color: colors.muted },
  tour: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFF1D6',
    borderRadius: 12,
    padding: 10,
  },
  tourTxt: { color: colors.brandDeep, fontWeight: '700', lineHeight: 20 },
  hero: { alignItems: 'center', paddingVertical: 12 },
  photo: {
    width: 108,
    height: 108,
    borderRadius: 24,
    backgroundColor: '#F8EBD8',
  },
  emoji: { fontSize: 48 },
  name: { marginTop: 8, fontSize: 26, fontWeight: '800', color: colors.ink },
  nick: { marginTop: 4, color: colors.muted },
  guide: { marginTop: 6, fontSize: 12, fontWeight: '700', color: colors.ok },
  card: {
    marginHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: { marginBottom: 10 },
  k: { fontSize: 12, color: colors.muted, marginBottom: 2 },
  v: { fontSize: 15, fontWeight: '700', color: colors.ink },
  cta: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  note: {
    marginTop: 20,
    textAlign: 'center',
    color: colors.muted,
    paddingHorizontal: 24,
  },
  safety: {
    marginTop: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
  },
  safetyLink: { color: colors.danger, fontWeight: '800' },
});
