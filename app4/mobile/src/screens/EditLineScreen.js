import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';

export default function EditLineScreen({ profile, onSave, onBack }) {
  const insets = useSafeAreaInsets();
  const [lineId, setLineId] = useState(profile?.line_id || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const line = String(lineId).trim();
    if (!line) {
      Alert.alert('請填寫 LINE ID');
      return;
    }
    setBusy(true);
    try {
      const result = await onSave(line);
      if (!result?.ok) {
        Alert.alert('無法更新', result?.code || '失敗');
        return;
      }
      Alert.alert('已更新');
      onBack?.();
    } catch (e) {
      Alert.alert('無法更新', String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <View style={[styles.pad, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.brand}>更新 LINE ID</Text>
        <TextInput
          style={styles.input}
          value={lineId}
          onChangeText={setLineId}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={64}
          placeholder="LINE ID"
          placeholderTextColor={colors.muted}
        />
        <TouchableOpacity style={styles.primary} disabled={busy} onPress={save}>
          <Text style={styles.primaryText}>{busy ? '儲存中…' : '儲存'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={onBack} disabled={busy}>
          <Text style={styles.secondaryText}>返回</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { paddingHorizontal: 20, gap: 12 },
  brand: { fontSize: 26, fontWeight: '700', color: colors.ink },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.row,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.card,
  },
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
