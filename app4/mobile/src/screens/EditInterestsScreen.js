import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';
import IdentityPicker from '../components/IdentityPicker';
import {
  MAX_INTEREST,
  MIN_INTEREST,
  labelsForIdentities,
} from '../data/identities';

export default function EditInterestsScreen({
  profile,
  paid,
  onSave,
  onBack,
  onSubscribe,
}) {
  const insets = useSafeAreaInsets();
  const [interest, setInterest] = useState(profile?.interest_identities || []);
  const [busy, setBusy] = useState(false);

  if (!paid) {
    return (
      <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
        <View style={[styles.pad, { paddingTop: insets.top + 24 }]}>
          <Text style={styles.brand}>修改興趣需 Premium</Text>
          <Text style={styles.p}>免費用戶開通後不可修改有興趣的身份。</Text>
          <TouchableOpacity style={styles.primary} onPress={onSubscribe}>
            <Text style={styles.primaryText}>前往訂閱</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={onBack}>
            <Text style={styles.secondaryText}>返回</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const save = async () => {
    if (interest.length < MIN_INTEREST || interest.length > MAX_INTEREST) {
      Alert.alert('請選擇 1～2 個興趣');
      return;
    }
    setBusy(true);
    try {
      const result = await onSave(interest);
      if (!result?.ok) {
        if (result?.code === 'cooldown') {
          Alert.alert(
            '尚在冷卻',
            result.next_at
              ? `下次可修改時間：${new Date(result.next_at).toLocaleString('zh-TW')}`
              : '每 168 小時只能修改一次',
          );
        } else {
          Alert.alert('無法儲存', result?.code || '失敗');
        }
        return;
      }
      Alert.alert('已更新');
      onBack?.();
    } catch (e) {
      Alert.alert('無法儲存', String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <ScrollView
        contentContainerStyle={[
          styles.pad,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 },
        ]}
      >
        <Text style={styles.brand}>修改有興趣的身份</Text>
        <Text style={styles.p}>
          我的身份（唯讀）：{labelsForIdentities(profile?.own_identities).join('、')}
        </Text>
        <View style={styles.card}>
          <Text style={styles.h}>
            興趣（{interest.length}/{MAX_INTEREST}）
          </Text>
          <IdentityPicker value={interest} onChange={setInterest} max={MAX_INTEREST} />
        </View>
        <TouchableOpacity style={styles.primary} disabled={busy} onPress={save}>
          <Text style={styles.primaryText}>{busy ? '儲存中…' : '儲存'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={onBack} disabled={busy}>
          <Text style={styles.secondaryText}>返回</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { paddingHorizontal: 20, gap: 12 },
  brand: { fontSize: 26, fontWeight: '700', color: colors.ink },
  p: { color: colors.muted, lineHeight: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  h: { fontWeight: '700', color: colors.ink },
  primary: {
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.row,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
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
