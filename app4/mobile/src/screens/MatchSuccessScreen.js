import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, DISCLAIMER } from '../theme';
import { ownIdentitiesWithNotes } from '../data/identities';

export default function MatchSuccessScreen({ other, onStartChat, onBack }) {
  const insets = useSafeAreaInsets();
  const items = ownIdentitiesWithNotes(
    other?.own_identities,
    other?.own_identity_notes,
  );

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <ScrollView
        contentContainerStyle={[
          styles.pad,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 },
        ]}
      >
        <Text style={styles.brand}>配對成功</Text>
        <Text style={styles.sub}>對方身份與自我介紹</Text>

        <View style={styles.card}>
          {items.length === 0 ? (
            <Text style={styles.empty}>尚無身份資料</Text>
          ) : (
            items.map((item, idx) => (
              <View
                key={item.id}
                style={[styles.identityBlock, idx > 0 && styles.identityBlockGap]}
              >
                <Text style={styles.identityLabel}>{item.label}</Text>
                <Text style={styles.identityNote}>
                  {item.note || '（未填寫介紹）'}
                </Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>

        <TouchableOpacity style={styles.primary} onPress={onStartChat}>
          <Text style={styles.primaryText}>開始簡聊</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={onBack}>
          <Text style={styles.secondaryText}>返回主頁</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { paddingHorizontal: 20, gap: 14 },
  brand: { fontSize: 30, fontWeight: '700', color: colors.ink },
  sub: { color: colors.muted, fontSize: 15, marginBottom: 4 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
  },
  identityBlock: { gap: 4 },
  identityBlockGap: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  identityLabel: { fontSize: 16, fontWeight: '700', color: colors.ink },
  identityNote: { fontSize: 14, lineHeight: 22, color: colors.muted },
  empty: { color: colors.muted, fontSize: 14 },
  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.warn,
  },
  primary: {
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.row,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingVertical: 14,
    borderRadius: radius.row,
    alignItems: 'center',
  },
  secondaryText: { color: colors.ink, fontWeight: '600' },
});
