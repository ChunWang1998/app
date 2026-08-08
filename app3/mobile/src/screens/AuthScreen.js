import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { sendOtp, verifyOtp, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  if (!configured) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 40 }]}>
        <Text style={styles.brand}>答禮</Text>
        <Text style={styles.setupTitle}>尚未設定 Supabase</Text>
        <Text style={styles.setupBody}>
          複製 mobile/.env.example 為 .env，填入 EXPO_PUBLIC_SUPABASE_URL 與
          EXPO_PUBLIC_SUPABASE_ANON_KEY，並在 Dashboard 執行 supabase/schema.sql。
        </Text>
      </View>
    );
  }

  async function onSend() {
    setError('');
    setInfo('');
    if (!email.includes('@')) {
      setError('請輸入有效 Email');
      return;
    }
    setBusy(true);
    try {
      await sendOtp(email);
      setStep('otp');
      setInfo('驗證碼已寄出，請到信箱查看（也可能在垃圾郵件）');
    } catch (e) {
      setError(e.message || '寄送失敗');
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    setError('');
    if (code.trim().length < 6) {
      setError('請輸入信箱中的驗證碼');
      return;
    }
    setBusy(true);
    try {
      await verifyOtp(email, code);
    } catch (e) {
      setError(e.message || '驗證失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <LinearGradient colors={['#0B1F1A', '#14352C', '#0B1F1A']} style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.inner, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
      >
        <View>
          <Text style={styles.brand}>答禮</Text>
          <Text style={styles.tagline}>填問卷，領禮券</Text>
          <Text style={styles.support}>
            Email 驗證後即可瀏覽案件、外連填答，再貼上完成碼領取星巴克或超商禮券。
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@email.com"
            placeholderTextColor={colors.inkSoft}
            style={styles.input}
            value={email}
            editable={step === 'email' && !busy}
            onChangeText={setEmail}
          />

          {step === 'otp' ? (
            <>
              <Text style={[styles.label, { marginTop: spacing.md }]}>驗證碼</Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="number-pad"
                placeholder="6 位數碼"
                placeholderTextColor={colors.inkSoft}
                style={styles.input}
                value={code}
                editable={!busy}
                onChangeText={setCode}
              />
            </>
          ) : null}

          {info ? <Text style={styles.info}>{info}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.cta, busy && styles.ctaDisabled]}
            disabled={busy}
            onPress={step === 'email' ? onSend : onVerify}
          >
            {busy ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <Text style={styles.ctaText}>{step === 'email' ? '寄送驗證碼' : '登入'}</Text>
            )}
          </Pressable>

          {step === 'otp' ? (
            <Pressable
              disabled={busy}
              onPress={() => {
                setStep('email');
                setCode('');
                setError('');
                setInfo('');
              }}
            >
              <Text style={styles.link}>改用其他 Email</Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  brand: {
    fontFamily: 'Syne_700Bold',
    fontSize: 56,
    color: colors.cream,
    letterSpacing: -1.5,
  },
  tagline: {
    marginTop: spacing.sm,
    fontFamily: 'IBMPlexSans_500Medium',
    fontSize: 20,
    color: colors.mintSoft,
  },
  support: {
    marginTop: spacing.md,
    fontFamily: 'IBMPlexSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(243,246,242,0.72)',
    maxWidth: 320,
  },
  form: {
    backgroundColor: colors.cream,
    borderRadius: 18,
    padding: spacing.lg,
  },
  label: {
    fontFamily: 'IBMPlexSans_500Medium',
    fontSize: 13,
    color: colors.inkMuted,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'IBMPlexSans_400Regular',
    fontSize: 16,
    color: colors.ink,
  },
  cta: {
    marginTop: spacing.lg,
    backgroundColor: colors.mint,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaDisabled: {
    opacity: 0.7,
  },
  ctaText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 16,
    color: colors.ink,
  },
  link: {
    marginTop: spacing.md,
    textAlign: 'center',
    fontFamily: 'IBMPlexSans_400Regular',
    color: colors.inkMuted,
  },
  info: {
    marginTop: spacing.sm,
    fontFamily: 'IBMPlexSans_400Regular',
    color: colors.mintDeep,
    fontSize: 13,
  },
  error: {
    marginTop: spacing.sm,
    fontFamily: 'IBMPlexSans_400Regular',
    color: colors.danger,
    fontSize: 13,
  },
  setupTitle: {
    marginTop: spacing.lg,
    fontFamily: 'Syne_700Bold',
    fontSize: 22,
    color: colors.cream,
  },
  setupBody: {
    marginTop: spacing.sm,
    fontFamily: 'IBMPlexSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(243,246,242,0.75)',
    paddingHorizontal: spacing.lg,
  },
});
