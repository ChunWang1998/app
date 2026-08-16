import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { colors, radius } from '../theme';

const COPY = {
  welcome: {
    title: '新手教學',
    body: '清單上有兩位每位都能看到的範例汪汪。請先 Connect 團團——對方一定會回。接著再試試可可。他們都會主動傳訊息給你。\n\n汪汪大隊長：聚會主辦人\n汪汪隊員：參加聚會者',
    cta: '開始',
  },
  guide1: {
    title: '第一步 · 團團',
    body: '點進團團，按 Connect。團團一定會接受，並傳訊息給你。',
    cta: '去找團團',
  },
  guide2: {
    title: '第二步 · 可可',
    body: '再試著 Connect 可可。可可會回覆，也會主動傳訊息。',
    cta: '去找可可',
  },
  gathering: {
    title: '汪汪聚會',
    body: '底部「聚會」頁看該市活動，依主辦人汪汪大隊長分數排列。可在個人頁創辦，必須附上 LINE 群組連結。報名後到個人頁點進去加入群組。\n\n汪汪大隊長：聚會主辦人\n汪汪隊員：參加聚會者',
    cta: '去看聚會',
  },
};

export default function TourSheet({ step, onNext, onSkip }) {
  const copy = COPY[step];
  if (!copy) return null;
  return (
    <Modal transparent animationType="fade">
      <View style={styles.mask}>
        <View style={styles.card}>
          <Text style={styles.k}>TOUR</Text>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{copy.body}</Text>
          <TouchableOpacity style={styles.cta} onPress={onNext}>
            <Text style={styles.ctaText}>{copy.cta}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSkip}>
            <Text style={styles.skip}>略過教學</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: {
    flex: 1,
    backgroundColor: 'rgba(44,36,22,0.45)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.sheet,
    padding: 22,
    paddingBottom: 28,
  },
  k: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brand,
    letterSpacing: 1.4,
  },
  title: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
  },
  body: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  cta: {
    marginTop: 18,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  skip: {
    marginTop: 12,
    textAlign: 'center',
    color: colors.muted,
    fontWeight: '700',
  },
});
