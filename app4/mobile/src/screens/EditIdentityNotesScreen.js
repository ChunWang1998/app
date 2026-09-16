import React, { useMemo, useState } from 'react';
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
import { colors, radius } from '../theme';
import IdentityNotesForm from '../components/IdentityNotesForm';
import {
  identityNotesComplete,
  sanitizeIdentityNotes,
} from '../data/identities';

export default function EditIdentityNotesScreen({ profile, onSave, onBack }) {
  const insets = useSafeAreaInsets();
  const ownIds = profile?.own_identities || [];
  const [notes, setNotes] = useState(profile?.own_identity_notes || {});
  const [busy, setBusy] = useState(false);

  const valid = useMemo(
    () => identityNotesComplete(ownIds, notes),
    [ownIds, notes],
  );

  const save = async () => {
    const cleaned = sanitizeIdentityNotes(ownIds, notes);
    if (!identityNotesComplete(ownIds, cleaned)) {
      Alert.alert('請為每個身份填寫 1～50 字的介紹');
      return;
    }
    setBusy(true);
    try {
      const result = await onSave(cleaned);
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
      <ScrollView
        contentContainerStyle={[
          styles.pad,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>更新身份介紹</Text>

        <View style={styles.card}>
          <IdentityNotesForm ownIds={ownIds} notes={notes} onChange={setNotes} />
        </View>

        <TouchableOpacity
          style={[styles.primary, !valid && styles.disabled]}
          disabled={busy || !valid}
          onPress={save}
        >
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
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
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
  disabled: { opacity: 0.45 },
});
