import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';
import { labelsForIdentities } from '../data/identities';
import { isSupabaseConfigured } from '../lib/supabase';

export default function HomeScreen({
  profile,
  paid,
  usage,
  matching,
  onMatch,
  onHistory,
  onSubscribe,
  onEditInterests,
  onEditLine,
}) {
  const insets = useSafeAreaInsets();
  const remaining = usage?.remaining ?? 0;
  const lim = usage?.limit ?? (paid ? 5 : 1);

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <ScrollView
        contentContainerStyle={[
          styles.pad,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 },
        ]}
      >
        <Text style={styles.brand}>身份牽線</Text>
        <Text style={styles.sub}>
          {paid ? 'Premium・每日最多 5 次配對' : '免費・每日 1 次配對'}
        </Text>
        {!isSupabaseConfigured && (
          <Text style={styles.warn}>
            未連線雲端：本機示範模式（僅能配到內建種子用戶）
          </Text>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>我的身份（已鎖定）</Text>
          <Text style={styles.value}>
            {labelsForIdentities(profile?.own_identities).join('、')}
          </Text>
          <Text style={[styles.label, { marginTop: 12 }]}>有興趣的身份</Text>
          <Text style={styles.value}>
            {labelsForIdentities(profile?.interest_identities).join('、')}
          </Text>
          <Text style={[styles.label, { marginTop: 12 }]}>我的 LINE</Text>
          <Text style={styles.value}>{profile?.line_id}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.h}>今日剩餘 {remaining} / {lim}</Text>
          <TouchableOpacity
            style={[styles.primary, (remaining <= 0 || matching) && styles.disabled]}
            disabled={remaining <= 0 || matching}
            onPress={onMatch}
          >
            {matching ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>今日配對</Text>
            )}
          </TouchableOpacity>
          {remaining <= 0 && !paid && (
            <TouchableOpacity onPress={onSubscribe} style={styles.linkWrap}>
              <Text style={styles.link}>升級 Premium，每日 5 次</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.secondary} onPress={onHistory}>
          <Text style={styles.secondaryText}>配對紀錄</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={onEditInterests}>
          <Text style={styles.secondaryText}>
            {paid ? '修改有興趣的身份' : '修改興趣（需 Premium）'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={onEditLine}>
          <Text style={styles.secondaryText}>更新 LINE ID</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={onSubscribe}>
          <Text style={styles.secondaryText}>
            {paid ? '訂閱／恢復購買' : '解鎖 Premium'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { paddingHorizontal: 20, gap: 12 },
  brand: { fontSize: 32, fontWeight: '700', color: colors.ink },
  sub: { color: colors.muted, marginBottom: 4 },
  warn: {
    color: colors.warn,
    fontSize: 12,
    backgroundColor: '#FFF6E0',
    padding: 10,
    borderRadius: radius.row,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  h: { fontSize: 17, fontWeight: '700', color: colors.ink },
  label: { color: colors.muted, fontSize: 13 },
  value: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  primary: {
    marginTop: 8,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.row,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.45 },
  secondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 14,
    borderRadius: radius.row,
    alignItems: 'center',
  },
  secondaryText: { color: colors.ink, fontWeight: '600' },
  linkWrap: { marginTop: 8, alignItems: 'center' },
  link: { color: colors.brandDeep, fontWeight: '600' },
});
