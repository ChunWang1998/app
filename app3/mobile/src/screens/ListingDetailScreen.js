import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchActiveAttempt,
  fetchListing,
  redeemAttempt,
  startAttempt,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { categoryLabel, colors, rewardLabel, spacing } from '../theme';

export default function ListingDetailScreen({ listingId, onBack, onRedeemed }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [l, a] = await Promise.all([
        fetchListing(listingId),
        fetchActiveAttempt(listingId),
      ]);
      setListing(l);
      setAttempt(a);
      if (a?.token) setTokenInput(a.token);
    } catch (e) {
      setError(e.message || '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const isOwn = listing && user && listing.publisher_id === user.id;
  const slotsLeft = listing
    ? Math.max(0, (listing.quota || 0) - (listing.redeemed_count || 0))
    : 0;

  async function onStart() {
    setBusy(true);
    setError('');
    try {
      const result = await startAttempt(listingId);
      setAttempt(result);
      setTokenInput(result.token);
      if (result.survey_url) {
        await Linking.openURL(result.survey_url);
      }
    } catch (e) {
      setError(e.message || '無法開始填答');
    } finally {
      setBusy(false);
    }
  }

  async function onOpenSurvey() {
    if (attempt?.survey_url) {
      await Linking.openURL(attempt.survey_url);
    }
  }

  async function onCopyToken() {
    if (!attempt?.token) return;
    await Clipboard.setStringAsync(attempt.token);
    Alert.alert('已複製', '完成碼已複製到剪貼簿');
  }

  async function onRedeem() {
    setBusy(true);
    setError('');
    try {
      const result = await redeemAttempt(tokenInput);
      Alert.alert(
        '領獎成功',
        `${result.reward_description}\n\n禮券碼：${result.voucher_code}`,
        [{ text: '查看我的獎勵', onPress: () => onRedeemed?.(result) }],
      );
      setAttempt(null);
    } catch (e) {
      setError(e.message || '核銷失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>← 返回</Text>
      </Pressable>

      {loading || !listing ? (
        <ActivityIndicator color={colors.mint} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
          <Text style={styles.cat}>{categoryLabel[listing.category]}</Text>
          <Text style={styles.title}>{listing.title}</Text>

          <View style={styles.metaBlock}>
            <Text style={styles.meta}>約 {listing.estimated_minutes} 分鐘</Text>
            <Text style={styles.meta}>
              剩餘 {slotsLeft}/{listing.quota} 名額
            </Text>
            <Text style={styles.meta}>
              {rewardLabel[listing.reward_type]} · {listing.reward_description}
            </Text>
          </View>

          {listing.eligibility_note ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>資格說明</Text>
              <Text style={styles.body}>{listing.eligibility_note}</Text>
            </View>
          ) : null}

          {isOwn ? (
            <View style={styles.warnBox}>
              <Text style={styles.warnText}>
                這是你發布的案件，無法開始填答或領獎。
              </Text>
            </View>
          ) : null}

          {!isOwn ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>① 開始填答</Text>
              <Text style={styles.body}>
                點擊後會產生專屬完成碼，並開啟外部問卷（盡量預填該碼）。填完後請在問卷結尾確認看得到同一組碼。
              </Text>
              <Pressable
                style={[styles.primaryBtn, busy && styles.disabled]}
                disabled={busy}
                onPress={attempt ? onOpenSurvey : onStart}
              >
                {busy ? (
                  <ActivityIndicator color={colors.ink} />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {attempt ? '再次開啟問卷' : '開始填答'}
                  </Text>
                )}
              </Pressable>

              {attempt ? (
                <View style={styles.tokenBox}>
                  <Text style={styles.tokenLabel}>你的完成碼（一次一碼）</Text>
                  <Text style={styles.token}>{attempt.token}</Text>
                  <Text style={styles.tokenHint}>
                    請於{' '}
                    {new Date(attempt.expires_at).toLocaleString('zh-TW', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    前貼回領獎
                  </Text>
                  <Pressable onPress={onCopyToken}>
                    <Text style={styles.link}>複製完成碼</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}

          {!isOwn ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>② 貼上完成碼領獎</Text>
              <TextInput
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="例如 ABCD-EFGH"
                placeholderTextColor={colors.inkSoft}
                style={styles.input}
                value={tokenInput}
                onChangeText={setTokenInput}
                editable={!busy}
              />
              <Pressable
                style={[styles.secondaryBtn, busy && styles.disabled]}
                disabled={busy || !tokenInput.trim()}
                onPress={onRedeem}
              >
                <Text style={styles.secondaryBtnText}>核銷並領取禮券</Text>
              </Pressable>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
    paddingHorizontal: spacing.lg,
  },
  back: {
    marginBottom: spacing.sm,
  },
  backText: {
    fontFamily: 'IBMPlexSans_500Medium',
    fontSize: 15,
    color: colors.inkMuted,
  },
  cat: {
    fontFamily: 'IBMPlexSans_500Medium',
    fontSize: 13,
    color: colors.mintDeep,
    marginBottom: 6,
  },
  title: {
    fontFamily: 'Syne_700Bold',
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.6,
    marginBottom: spacing.md,
  },
  metaBlock: {
    gap: 4,
    marginBottom: spacing.lg,
  },
  meta: {
    fontFamily: 'IBMPlexSans_400Regular',
    fontSize: 14,
    color: colors.inkMuted,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: 'Syne_700Bold',
    fontSize: 18,
    color: colors.ink,
    marginBottom: 8,
  },
  body: {
    fontFamily: 'IBMPlexSans_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkMuted,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: colors.mint,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 16,
    color: colors.ink,
  },
  secondaryBtn: {
    marginTop: 12,
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 16,
    color: colors.cream,
  },
  disabled: { opacity: 0.65 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'IBMPlexSans_500Medium',
    fontSize: 18,
    letterSpacing: 1,
    color: colors.ink,
  },
  tokenBox: {
    marginTop: 14,
    backgroundColor: colors.mintSoft,
    borderRadius: 14,
    padding: spacing.md,
  },
  tokenLabel: {
    fontFamily: 'IBMPlexSans_500Medium',
    fontSize: 12,
    color: colors.mintDeep,
  },
  token: {
    marginTop: 6,
    fontFamily: 'Syne_700Bold',
    fontSize: 28,
    letterSpacing: 2,
    color: colors.ink,
  },
  tokenHint: {
    marginTop: 6,
    fontFamily: 'IBMPlexSans_400Regular',
    fontSize: 12,
    color: colors.inkMuted,
  },
  link: {
    marginTop: 10,
    fontFamily: 'IBMPlexSans_500Medium',
    color: colors.mintDeep,
  },
  warnBox: {
    backgroundColor: '#F8E4E1',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  warnText: {
    fontFamily: 'IBMPlexSans_400Regular',
    color: colors.danger,
    fontSize: 14,
  },
  error: {
    fontFamily: 'IBMPlexSans_400Regular',
    color: colors.danger,
    marginBottom: spacing.md,
  },
});
