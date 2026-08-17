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
          這一版（v1）只服務創始白名單 {FOUNDER_CAP} 人。填手機號並建立汪汪檔案後即為永久免費。
        </Text>
        <Text style={styles.p}>
          創始白名單 {founderCount}/{FOUNDER_CAP}
          {full
            ? ' 已滿。付費解鎖會在下一版用 Apple 內購，這一版不收款。'
            : ' 仍有空位：到右上角個人頁填手機號並建立檔案即可，不必驗證碼。已註冊過填同一支號碼會還原。'}
        </Text>
        {full ? (
          <Text style={styles.note}>
            不在白名單內目前無法 Connect。請等 v2 Apple 內購。
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
