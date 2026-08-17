import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { FOUNDER_CAP } from '../data/constants';

export default function SubscribeScreen({ founderCount, onBack }) {
  const insets = useSafeAreaInsets();
  const full = founderCount >= FOUNDER_CAP;

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <View style={[styles.box, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.h}>訂閱後才能下一步</Text>
        <Text style={styles.p}>
          未訂閱只能看清單。看詳情、Connect、聚會報名都需要有效訂閱。免費註冊必須同時建立狗檔案。
        </Text>
        <Text style={styles.p}>
          創始白名單 {founderCount}/{FOUNDER_CAP}
          {full
            ? ' 已滿。這一版先不開放付費解鎖（App Store 不允許用 LINE Pay 開通 Connect／聊天）。下版改走 Apple 內購。'
            : ' 仍有空位：到右上角個人頁填手機號即可，不必驗證碼。'}
        </Text>
        {full ? (
          <Text style={styles.note}>
            不在白名單內目前無法 Connect。請等下版 App 內購，或請已在名單內的朋友繼續用。
          </Text>
        ) : (
          <Text style={styles.note}>請到右上角個人頁填手機號佔白名單，不必驗證碼。</Text>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  box: { flex: 1, paddingHorizontal: 22 },
  back: { color: colors.brandDeep, fontWeight: '800', marginBottom: 16 },
  h: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 12 },
  p: { fontSize: 15, color: colors.ink, lineHeight: 22, marginBottom: 10 },
  note: { marginTop: 12, color: colors.muted, lineHeight: 20 },
  cta: {
    marginTop: 20,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '800' },
});
