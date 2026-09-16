import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, DISCLAIMER } from '../theme';
import { labelsForIdentities, REPORT_REASONS, CHAT_CAP } from '../data/identities';

const STATUS_LABEL = {
  chatting: '簡聊中',
  awaiting_consent: '等待雙方同意',
  line_revealed: '已交換 LINE',
  ended_declined: '已結束（未交換）',
  ended_left: '已離開',
  ended_reported: '已檢舉結束',
};

export default function ChatScreen({
  matchId,
  meId,
  initialOther,
  loadMessages,
  sendMessage,
  submitConsent,
  leaveChat,
  onReport,
  onBack,
  onEnded,
  onLineRevealed,
}) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const revealedNotified = useRef(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [payload, setPayload] = useState(null);

  const applyPayload = useCallback(
    (data) => {
      if (!data?.ok) return;
      setPayload(data);
      if (
        data.status === 'line_revealed' &&
        data.other?.line_id &&
        !revealedNotified.current
      ) {
        revealedNotified.current = true;
        onLineRevealed?.(data);
      }
    },
    [onLineRevealed],
  );

  const reload = useCallback(async () => {
    if (!matchId) return;
    try {
      const data = await loadMessages(matchId);
      if (data?.ok) applyPayload(data);
      else if (data?.code === 'not_found') {
        Alert.alert('找不到對話');
        onBack?.();
      }
    } catch (e) {
      // keep silent on poll errors
    } finally {
      setLoading(false);
    }
  }, [matchId, loadMessages, applyPayload, onBack]);

  useEffect(() => {
    reload();
    const t = setInterval(reload, 3000);
    return () => clearInterval(t);
  }, [reload]);

  useEffect(() => {
    if (!payload?.messages?.length) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd?.({ animated: true });
    });
  }, [payload?.messages?.length]);

  const status = payload?.status || 'chatting';
  const count = payload?.message_count ?? 0;
  const cap = payload?.chat_cap ?? CHAT_CAP;
  const other = payload?.other || initialOther;
  const messages = payload?.messages || [];
  const ended = String(status).startsWith('ended_');
  const awaiting = status === 'awaiting_consent' || count >= cap;
  const revealed = status === 'line_revealed';
  const myConsent = payload?.my_consent;
  const canSend = status === 'chatting' && count < cap && !sending;

  const send = async () => {
    const body = text.trim();
    if (!body || !canSend) return;
    setSending(true);
    try {
      const data = await sendMessage(matchId, body);
      if (!data?.ok) {
        if (data?.code === 'chat_cap_reached') {
          Alert.alert('已達 20 句', '請選擇是否願意交換 LINE');
          await reload();
        } else {
          Alert.alert('無法送出', data?.code || '錯誤');
        }
        return;
      }
      setText('');
      applyPayload(data);
    } catch (e) {
      Alert.alert('無法送出', String(e?.message || e));
    } finally {
      setSending(false);
    }
  };

  const onConsent = async (yes) => {
    try {
      const data = await submitConsent(matchId, yes);
      if (!data?.ok) {
        Alert.alert('無法提交', data?.code || '錯誤');
        return;
      }
      if (data.status === 'line_revealed') {
        applyPayload({ ...payload, ...data, ok: true, messages });
        onLineRevealed?.(data);
        return;
      }
      if (String(data.status).startsWith('ended_')) {
        Alert.alert('已結束', '聊天紀錄已刪除');
        onEnded?.(data);
        return;
      }
      Alert.alert('已送出', '等待對方回覆是否願意交換 LINE');
      await reload();
    } catch (e) {
      Alert.alert('無法提交', String(e?.message || e));
    }
  };

  const onLeave = () => {
    Alert.alert('離開聊天？', '將刪除雙方聊天紀錄，且不會交換 LINE。', [
      { text: '取消', style: 'cancel' },
      {
        text: '離開',
        style: 'destructive',
        onPress: async () => {
          try {
            const data = await leaveChat(matchId);
            if (data?.ok) {
              Alert.alert('已離開', '聊天紀錄已刪除');
              onEnded?.(data);
            } else {
              Alert.alert('無法離開', data?.code || '錯誤');
            }
          } catch (e) {
            Alert.alert('無法離開', String(e?.message || e));
          }
        },
      },
    ]);
  };

  const report = () => {
    Alert.alert('檢舉這位使用者', '選擇原因', [
      ...REPORT_REASONS.map((reason) => ({
        text: reason,
        onPress: async () => {
          try {
            await onReport(other.id, reason, matchId);
            Alert.alert('已收到檢舉', '對話已結束，聊天紀錄已刪除。');
            onEnded?.({ status: 'ended_reported' });
          } catch (e) {
            Alert.alert('無法檢舉', String(e?.message || e));
          }
        },
      })),
      { text: '取消', style: 'cancel' },
    ]);
  };

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <View style={styles.topRow}>
            <TouchableOpacity onPress={onBack}>
              <Text style={styles.back}>← 返回</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={report}>
              <Text style={styles.report}>檢舉</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>
            {labelsForIdentities(other?.own_identities).join('、') || '配對聊天'}
          </Text>
          <Text style={styles.hint}>
            {STATUS_LABEL[status] || status} · {count}/{cap} 句
          </Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.msgs}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 && !ended && (
              <Text style={styles.empty}>開始簡聊吧。滿 {cap} 句後再決定是否交換 LINE。</Text>
            )}
            {messages.map((m) => {
              const mine = m.sender_id === meId;
              return (
                <View
                  key={m.id}
                  style={[styles.bubble, mine ? styles.mine : styles.theirs]}
                >
                  <Text style={[styles.msg, mine && { color: '#fff' }]}>{m.body}</Text>
                </View>
              );
            })}

            {awaiting && !ended && !revealed && (
              <View style={styles.gate}>
                <Text style={styles.gateTitle}>是否願意繼續並交換 LINE？</Text>
                <Text style={styles.gateSub}>
                  雙方皆同意才會顯示對方 LINE ID。任一方拒絕將刪除聊天紀錄。
                </Text>
                {myConsent ? (
                  <Text style={styles.waiting}>你已同意，等待對方回覆…</Text>
                ) : (
                  <View style={styles.gateRow}>
                    <TouchableOpacity
                      style={styles.yes}
                      onPress={() => onConsent(true)}
                    >
                      <Text style={styles.yesText}>願意</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.no}
                      onPress={() => onConsent(false)}
                    >
                      <Text style={styles.noText}>不願意</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {revealed && (
              <View style={styles.reveal}>
                <Text style={styles.gateTitle}>已交換 LINE</Text>
                <Text style={styles.line}>對方：{other?.line_id}</Text>
                <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
              </View>
            )}

            {ended && (
              <Text style={styles.ended}>
                {STATUS_LABEL[status] || '已結束'}（聊天紀錄已刪除）
              </Text>
            )}
          </ScrollView>
        )}

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 8 }]}>
          {!ended && !revealed && (
            <TouchableOpacity onPress={onLeave}>
              <Text style={styles.leave}>離開並刪除紀錄</Text>
            </TouchableOpacity>
          )}
          {canSend ? (
            <View style={styles.row}>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder={`訊息（${count}/${cap}）`}
                maxLength={500}
              />
              <TouchableOpacity style={styles.send} onPress={send}>
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="paper-plane" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { paddingHorizontal: 16, paddingBottom: 8, gap: 4 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  back: { color: colors.brandDeep, fontWeight: '600', fontSize: 16 },
  report: { color: colors.danger, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: colors.ink },
  hint: { color: colors.muted, fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  msgs: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  empty: { color: colors.muted, lineHeight: 20 },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.brand,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  msg: { color: colors.ink, fontSize: 15, lineHeight: 20 },
  gate: {
    marginTop: 12,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  gateTitle: { fontWeight: '700', color: colors.ink, fontSize: 16 },
  gateSub: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  waiting: { color: colors.brandDeep, fontWeight: '600' },
  gateRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  yes: {
    flex: 1,
    backgroundColor: colors.brand,
    paddingVertical: 12,
    borderRadius: radius.row,
    alignItems: 'center',
  },
  yesText: { color: '#fff', fontWeight: '700' },
  no: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 12,
    borderRadius: radius.row,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  noText: { color: colors.danger, fontWeight: '700' },
  reveal: {
    marginTop: 12,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  line: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.brandDeep,
  },
  disclaimer: { fontSize: 12, lineHeight: 18, color: colors.warn },
  ended: { color: colors.muted, textAlign: 'center', marginTop: 20 },
  bottom: { paddingHorizontal: 16, gap: 8 },
  leave: {
    color: colors.danger,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.row,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.ink,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
