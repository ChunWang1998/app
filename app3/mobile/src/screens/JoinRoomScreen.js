import React, { useState } from 'react';
import {
  Text,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, type } from '../theme';
import BigButton from '../components/BigButton';
import { normalizeRoomCode, isValidRoomCode } from '../lib/roomCode';
import { joinRoom } from '../storage/rooms';
import { getDeviceId } from '../lib/deviceId';

export default function JoinRoomScreen({ onBack, onJoined }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const normalized = normalizeRoomCode(code);
    if (!isValidRoomCode(normalized)) {
      Alert.alert('房間碼', '請輸入 6 位數字房間碼。');
      return;
    }
    if (!name.trim()) {
      Alert.alert('請填暱稱', '讓家人知道是誰加入了。');
      return;
    }
    setLoading(true);
    try {
      const deviceId = await getDeviceId();
      const result = await joinRoom({
        code: normalized,
        deviceId,
        displayName: name,
      });
      if (!result.ok) {
        Alert.alert('進房失敗', result.error);
        return;
      }
      onJoined(normalized);
    } catch (e) {
      Alert.alert('進房失敗', e?.message || '請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={onBack} hitSlop={12}>
              <Text style={styles.back}>← 返回</Text>
            </TouchableOpacity>
            <Text style={styles.title}>輸入房間碼</Text>
            <Text style={styles.hint}>向開房的家人要 6 位數字房間碼。</Text>

            <Text style={styles.label}>房間碼</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={code}
              onChangeText={(t) => setCode(normalizeRoomCode(t))}
              placeholder="例如 123456"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={6}
            />

            <Text style={styles.label}>你的暱稱</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="例如：爸爸"
              placeholderTextColor={colors.muted}
              maxLength={12}
            />

            <BigButton title="進入房間" onPress={onSubmit} loading={loading} style={styles.submit} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  back: { fontSize: type.bodySm, color: colors.brandDeep, fontWeight: '600' },
  title: {
    marginTop: 16,
    fontSize: type.title,
    fontWeight: '800',
    color: colors.ink,
  },
  hint: {
    marginTop: 8,
    fontSize: type.label,
    color: colors.muted,
    lineHeight: 24,
  },
  label: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: type.subtitle,
    fontWeight: '700',
    color: colors.ink,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: type.body,
    color: colors.ink,
  },
  codeInput: {
    letterSpacing: 6,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  submit: { marginTop: 28 },
});
