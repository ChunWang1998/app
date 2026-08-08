import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSignOut() {
    setBusy(true);
    setError('');
    try {
      await signOut();
    } catch (e) {
      setError(e.message || '登出失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>帳號</Text>
      <Text style={styles.sub}>同一帳號可當發布者也可當填答者</Text>

      <View style={styles.card}>
        <Text style={styles.label}>登入 Email</Text>
        <Text style={styles.email}>{user?.email || '—'}</Text>
        <Text style={styles.hint}>第一刀不上架；案件與禮券由營運寫入 Supabase。</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={[styles.btn, busy && { opacity: 0.7 }]} disabled={busy} onPress={onSignOut}>
        {busy ? (
          <ActivityIndicator color={colors.cream} />
        ) : (
          <Text style={styles.btnText}>登出</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  heading: {
    fontFamily: 'Syne_700Bold',
    fontSize: 34,
    color: colors.ink,
    letterSpacing: -0.8,
  },
  sub: {
    marginTop: 4,
    marginBottom: spacing.md,
    fontFamily: 'IBMPlexSans_400Regular',
    fontSize: 14,
    color: colors.inkSoft,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  label: {
    fontFamily: 'IBMPlexSans_500Medium',
    fontSize: 12,
    color: colors.inkSoft,
  },
  email: {
    marginTop: 6,
    fontFamily: 'Syne_700Bold',
    fontSize: 20,
    color: colors.ink,
  },
  hint: {
    marginTop: 12,
    fontFamily: 'IBMPlexSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
  },
  btn: {
    marginTop: spacing.lg,
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 16,
    color: colors.cream,
  },
  error: {
    marginTop: spacing.sm,
    fontFamily: 'IBMPlexSans_400Regular',
    color: colors.danger,
  },
});
