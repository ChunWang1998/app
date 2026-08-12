import React, { useState } from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, type } from '../theme';
import BigButton from '../components/BigButton';
import { listSutras } from '../data/sutras';
import { createRoom, MAX_ROOMS_PER_PERSON } from '../storage/rooms';
import { getDeviceId } from '../lib/deviceId';

export default function CreateRoomScreen({ onBack, onCreated }) {
  const sutras = listSutras();
  const [roomName, setRoomName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [sutraId, setSutraId] = useState(sutras[0].id);
  const [quota, setQuota] = useState('3');
  const [loading, setLoading] = useState(false);

  const selected = sutras.find((s) => s.id === sutraId) || sutras[0];

  const onSubmit = async () => {
    const q = parseInt(quota, 10);
    if (!roomName.trim()) {
      Alert.alert('請填房間名稱', '例如：王家人、我們一家。');
      return;
    }
    if (!memberName.trim()) {
      Alert.alert('請填暱稱', '讓家人知道你是誰。');
      return;
    }
    if (!q || q < 1) {
      Alert.alert('每日句數', '請設定每天至少抄 1 句。');
      return;
    }
    setLoading(true);
    try {
      const deviceId = await getDeviceId();
      const result = await createRoom({
        deviceId,
        roomName,
        displayName: memberName,
        sutraId,
        dailyQuota: Math.min(q, selected.unitCount),
      });
      if (!result.ok) {
        Alert.alert('開房失敗', result.error);
        return;
      }
      onCreated(result.room.code);
    } catch (e) {
      Alert.alert('開房失敗', e?.message || '請稍後再試');
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
            <Text style={styles.title}>開一間共抄房</Text>
            <Text style={styles.hint}>
              免登入。先取一個群組名稱，再選定要一起抄的經文，把房間碼分享給家人即可加入（每房最多
              5 人；每人最多 {MAX_ROOMS_PER_PERSON} 間房）。
            </Text>

            <Text style={styles.label}>房間名稱</Text>
            <TextInput
              style={styles.input}
              value={roomName}
              onChangeText={setRoomName}
              placeholder="例如：王家人"
              placeholderTextColor={colors.muted}
              maxLength={16}
            />
            <Text style={styles.hintSm}>這是群組的名字，家人在列表裡會看到這個名稱。</Text>

            <Text style={styles.label}>你的暱稱</Text>
            <TextInput
              style={styles.input}
              value={memberName}
              onChangeText={setMemberName}
              placeholder="例如：媽媽"
              placeholderTextColor={colors.muted}
              maxLength={12}
            />

            <Text style={styles.label}>房主選定經文（全員一起抄）</Text>
            {sutras.map((s) => {
              const active = s.id === sutraId;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.sutraCard, active && styles.sutraActive]}
                  onPress={() => setSutraId(s.id)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.sutraTitle, active && styles.sutraTitleActive]}>
                    {s.shortTitle}
                  </Text>
                  <Text style={styles.sutraMeta}>
                    {s.unitCount} 句 · {s.title}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <Text style={styles.label}>每日目標（句）</Text>
            <TextInput
              style={styles.input}
              value={quota}
              onChangeText={setQuota}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.hintSm}>漏抄的隔天可補抄。本經共 {selected.unitCount} 句。</Text>

            <BigButton title="建立房間" onPress={onSubmit} loading={loading} style={styles.submit} />
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
  hintSm: {
    marginTop: 8,
    fontSize: type.label,
    color: colors.muted,
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
  sutraCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  sutraActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  sutraTitle: {
    fontSize: type.body,
    fontWeight: '700',
    color: colors.ink,
  },
  sutraTitleActive: {
    color: colors.brandDeep,
  },
  sutraMeta: {
    marginTop: 4,
    fontSize: type.label,
    color: colors.muted,
  },
  submit: { marginTop: 28 },
});
