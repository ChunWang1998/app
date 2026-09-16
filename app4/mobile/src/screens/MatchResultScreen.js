import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, DISCLAIMER } from '../theme';
import { labelsForIdentities, REPORT_REASONS } from '../data/identities';

export default function MatchResultScreen({
  me,
  other,
  matchId,
  onBack,
  onReport,
}) {
  const insets = useSafeAreaInsets();

  const report = () => {
    Alert.alert('檢舉這位使用者', '選擇原因（我們會在後台查看）', [
      ...REPORT_REASONS.map((reason) => ({
        text: reason,
        onPress: async () => {
          try {
            await onReport(other.id, reason, matchId);
            Alert.alert('已收到檢舉', '之後不會再配到這位使用者。');
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
        <Text style={styles.brand}>已交換 LINE</Text>
        <Text style={styles.sub}>雙方同意繼續後的聯絡方式</Text>

        <View style={styles.card}>
          <Text style={styles.label}>對方身份</Text>
          <Text style={styles.value}>
            {labelsForIdentities(other?.own_identities).join('、')}
          </Text>
          <Text style={[styles.label, { marginTop: 12 }]}>對方 LINE ID</Text>
          <Text style={styles.line}>{other?.line_id || '—'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>我的身份</Text>
          <Text style={styles.value}>
            {labelsForIdentities(me?.own_identities).join('、')}
          </Text>
          <Text style={[styles.label, { marginTop: 12 }]}>我的 LINE ID</Text>
          <Text style={styles.line}>{me?.line_id || '—'}</Text>
        </View>

        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>

        <TouchableOpacity style={styles.danger} onPress={report}>
          <Text style={styles.dangerText}>檢舉對方</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primary} onPress={onBack}>
          <Text style={styles.primaryText}>回到主頁</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { paddingHorizontal: 20, gap: 12 },
  brand: { fontSize: 28, fontWeight: '700', color: colors.ink },
  sub: { color: colors.muted, marginBottom: 4 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  label: { color: colors.muted, fontSize: 13 },
  value: { color: colors.ink, fontSize: 16, fontWeight: '600', marginTop: 4 },
  line: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '700',
    color: colors.brandDeep,
  },
  disclaimer: { fontSize: 12, lineHeight: 18, color: colors.warn },
  primary: {
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.row,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  danger: {
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 12,
    borderRadius: radius.row,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  dangerText: { color: colors.danger, fontWeight: '600' },
});
