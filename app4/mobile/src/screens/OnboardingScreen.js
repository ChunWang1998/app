import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, DISCLAIMER } from '../theme';
import { APP_NAME_ZH, APP_TAGLINE } from '../data/branding';
import IdentityPicker from '../components/IdentityPicker';
import IdentityNotesForm from '../components/IdentityNotesForm';
import {
  MAX_OWN,
  MIN_OWN,
  MAX_INTEREST,
  MIN_INTEREST,
  labelsForIdentities,
  identityNotesComplete,
  ownIdentitiesWithNotes,
  sanitizeIdentityNotes,
} from '../data/identities';

const FINAL_STEP = 5;

export default function OnboardingScreen({ onComplete }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [own, setOwn] = useState([]);
  const [ownNotes, setOwnNotes] = useState({});
  const [interest, setInterest] = useState([]);
  const [lineId, setLineId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOwnNotes((prev) => sanitizeIdentityNotes(own, prev));
  }, [own]);

  const canNext = useMemo(() => {
    if (step === 0) return true;
    if (step === 1) return own.length >= MIN_OWN && own.length <= MAX_OWN;
    if (step === 2) return identityNotesComplete(own, ownNotes);
    if (step === 3)
      return interest.length >= MIN_INTEREST && interest.length <= MAX_INTEREST;
    if (step === 4) return String(lineId).trim().length >= 1;
    return true;
  }, [step, own, ownNotes, interest, lineId]);

  const submit = async () => {
    setBusy(true);
    try {
      await onComplete({
        own_identities: own,
        own_identity_notes: sanitizeIdentityNotes(own, ownNotes),
        interest_identities: interest,
        line_id: String(lineId).trim(),
      });
    } catch (e) {
      Alert.alert('無法完成開通', String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.pad,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.brand}>{APP_NAME_ZH}</Text>
          <Text style={styles.sub}>{APP_TAGLINE}</Text>

          {step === 0 && (
            <View style={styles.card}>
              <Text style={styles.h}>開始之前</Text>
              <Text style={styles.p}>
                選擇你的身份與有興趣認識的身份。配對後可先站內簡聊最多 20
                句，雙方同意後才會交換 LINE ID。
              </Text>
              <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
            </View>
          )}

          {step === 1 && (
            <View style={styles.card}>
              <Text style={styles.h}>你的身份（{own.length}/{MAX_OWN}）</Text>
              <Text style={styles.p}>
                先選大類，再選職稱。至少 1 個、最多 5 個。送出後不可再改。
              </Text>
              <IdentityPicker value={own} onChange={setOwn} max={MAX_OWN} />
            </View>
          )}

          {step === 2 && (
            <View style={styles.card}>
              <Text style={styles.h}>身份介紹</Text>
              <Text style={styles.p}>
                為每個已選身份寫一句經歷說明（各 50 字內）。配對成功時對方會看到。
              </Text>
              <IdentityNotesForm ownIds={own} notes={ownNotes} onChange={setOwnNotes} />
            </View>
          )}

          {step === 3 && (
            <View style={styles.card}>
              <Text style={styles.h}>
                有興趣的身份（{interest.length}/{MAX_INTEREST}）
              </Text>
              <Text style={styles.p}>
                最多 2 個。免費用戶之後不可修改；付費每週可改一次。
              </Text>
              <IdentityPicker
                value={interest}
                onChange={setInterest}
                max={MAX_INTEREST}
              />
            </View>
          )}

          {step === 4 && (
            <View style={styles.card}>
              <Text style={styles.h}>你的 LINE ID</Text>
              <Text style={styles.p}>進配對池前必填。雙方同意後才會顯示。</Text>
              <TextInput
                style={styles.input}
                value={lineId}
                onChangeText={setLineId}
                placeholder="例如 your.line.id"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={64}
              />
            </View>
          )}

          {step === 5 && (
            <View style={styles.card}>
              <Text style={styles.h}>確認資料</Text>
              <Text style={styles.label}>我的身份</Text>
              {ownIdentitiesWithNotes(own, ownNotes).map((item) => (
                <View key={item.id} style={styles.confirmItem}>
                  <Text style={styles.confirmLabel}>{item.label}</Text>
                  <Text style={styles.p}>{item.note}</Text>
                </View>
              ))}
              <Text style={styles.label}>有興趣</Text>
              <Text style={styles.p}>{labelsForIdentities(interest).join('、')}</Text>
              <Text style={styles.label}>LINE ID</Text>
              <Text style={styles.p}>{String(lineId).trim()}</Text>
              <Text style={[styles.disclaimer, { marginTop: 12 }]}>{DISCLAIMER}</Text>
            </View>
          )}

          <View style={styles.row}>
            {step > 0 && (
              <TouchableOpacity
                style={styles.secondary}
                onPress={() => setStep((s) => s - 1)}
                disabled={busy}
              >
                <Text style={styles.secondaryText}>上一步</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.primary, !canNext && styles.disabled]}
              disabled={!canNext || busy}
              onPress={() => {
                if (step < FINAL_STEP) setStep((s) => s + 1);
                else submit();
              }}
            >
              <Text style={styles.primaryText}>
                {busy ? '處理中…' : step < FINAL_STEP ? '下一步' : '完成開通'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { paddingHorizontal: 20, gap: 16 },
  brand: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: 0.5,
  },
  sub: { color: colors.muted, fontSize: 15, marginBottom: 8 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  h: { fontSize: 18, fontWeight: '700', color: colors.ink },
  p: { color: colors.muted, lineHeight: 22, fontSize: 14 },
  label: { marginTop: 8, fontWeight: '600', color: colors.ink },
  confirmItem: { gap: 2, marginBottom: 4 },
  confirmLabel: { fontWeight: '600', color: colors.ink, fontSize: 14 },
  disclaimer: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: colors.warn,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.row,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: '#FAFCFA',
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 8 },
  primary: {
    flex: 1,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.row,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  secondaryText: { color: colors.ink, fontWeight: '600' },
  disabled: { opacity: 0.45 },
});
