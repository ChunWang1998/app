import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { MAX_CHAT } from '../data/constants';
import {
  listMessages,
  sendMessage,
  confirmMeet,
  getMeetStatus,
  markChatRead,
} from '../lib/store';

export default function ChatScreen({
  connect,
  meId,
  peerName,
  peerPlaces = [],
  onBack,
  onRefreshOwners,
  onUnreadChange,
}) {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState([]);
  const [text, setText] = useState('');
  const [meet, setMeet] = useState({
    iConfirmed: false,
    peerConfirmed: false,
    both: false,
    counted: false,
  });
  const full = rows.length >= MAX_CHAT;

  const reloadMeet = async () => {
    if (!connect?.id || !meId) return;
    try {
      setMeet(await getMeetStatus(connect.id, meId));
    } catch {
      // keep previous
    }
  };

  const reload = async () => {
    if (!connect) return;
    const next = await listMessages(connect.id);
    setRows(next);
    const last = next[next.length - 1];
    await markChatRead(connect.id, last?.at || new Date().toISOString());
    onUnreadChange?.();
  };

  useEffect(() => {
    reload();
    reloadMeet();
    const t = setInterval(() => {
      reload();
      reloadMeet();
    }, 4000);
    return () => clearInterval(t);
  }, [connect?.id]);

  const send = async () => {
    const t = text.trim();
    if (!t || !connect) return;
    try {
      const next = await sendMessage(connect.id, meId, t);
      setRows(next);
      setText('');
      const last = next[next.length - 1];
      await markChatRead(connect.id, last?.at || new Date().toISOString());
    } catch (e) {
      if (e.code === 'full') {
        Alert.alert('已滿 20 句', '聊天句數有限，建議換 LINE 繼續聊。');
      } else if (e.code === 'disconnected') Alert.alert('已解除 Connect');
    }
  };

  const onConfirmMeet = async () => {
    if (!connect?.id || meet.iConfirmed || meet.both) return;
    try {
      const row = await confirmMeet(connect.id, meId);
      const status = await getMeetStatus(connect.id, meId);
      setMeet(status);
      if (status.both || row.counted) {
        Alert.alert('雙方已見面', '出去次數已各 +1。');
        onRefreshOwners?.();
      } else {
        Alert.alert('已記錄', '等對方也按「我已見面」後，雙方出去次數才會 +1。');
      }
    } catch (e) {
      Alert.alert('無法記錄', e.message || String(e));
    }
  };

  let meetLabel = '我已見面';
  let meetHint = '雙方都按了，出去次數才 +1';
  let meetDisabled = connect?.status !== 'accepted';
  if (meet.both || meet.counted) {
    meetLabel = '雙方已見面';
    meetHint = '出去次數已各 +1';
    meetDisabled = true;
  } else if (meet.iConfirmed && !meet.peerConfirmed) {
    meetLabel = '已記錄 · 等對方確認';
    meetHint = '你已按，等對方也按';
    meetDisabled = true;
  } else if (!meet.iConfirmed && meet.peerConfirmed) {
    meetLabel = '對方已按 · 請你確認';
    meetHint = '對方已按「我已見面」，請你也按';
    meetDisabled = connect?.status !== 'accepted';
  }

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.title}>與 {peerName}</Text>
        <Text style={styles.hint}>
          {connect?.status === 'disconnected'
            ? '已解除 Connect，無法再傳訊息'
            : `${rows.length}/${MAX_CHAT} 句 · 聊天句數有限，建議換 LINE 繼續聊`}
        </Text>
        {connect?.status === 'accepted' && peerPlaces.length ? (
          <Text style={styles.places}>
            出沒地點（Connect 後可見）：{peerPlaces.join('、')}
          </Text>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={styles.msgs}>
        {rows.map((m, i) => {
          const mine = m.fromId === meId;
          return (
            <View
              key={`${m.at}-${i}`}
              style={[styles.bubble, mine ? styles.mine : styles.theirs]}
            >
              <Text style={[styles.msg, mine && { color: '#fff' }]}>{m.text}</Text>
            </View>
          );
        })}
      </ScrollView>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          onPress={onConfirmMeet}
          disabled={meetDisabled}
          activeOpacity={meetDisabled ? 1 : 0.7}
        >
          <Text
            style={[
              styles.link,
              meetDisabled && styles.linkDisabled,
              (meet.both || meet.counted) && styles.linkDone,
            ]}
          >
            {meetLabel}
          </Text>
        </TouchableOpacity>
        <Text style={styles.meetHint}>{meetHint}</Text>
        {full && connect?.status !== 'disconnected' ? (
          <Text style={styles.full}>對話已滿 · 建議換 LINE 繼續聊</Text>
        ) : (
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={
                connect?.status === 'disconnected'
                  ? '已解除 Connect'
                  : '最多 20 句，建議換 LINE 長聊'
              }
            />
            <TouchableOpacity style={styles.send} onPress={send}>
              <Ionicons name="paper-plane" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { paddingHorizontal: 16, paddingBottom: 8 },
  back: { color: colors.brandDeep, fontWeight: '800' },
  title: { marginTop: 6, fontSize: 20, fontWeight: '800', color: colors.ink },
  hint: { marginTop: 4, color: colors.muted, fontSize: 12, lineHeight: 18 },
  places: { marginTop: 6, color: colors.ink, fontSize: 13, lineHeight: 18 },
  msgs: { paddingHorizontal: 16, paddingBottom: 12 },
  bubble: {
    maxWidth: '78%',
    padding: 10,
    borderRadius: 14,
    marginBottom: 8,
  },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.brand },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.card },
  msg: { color: colors.ink },
  bottom: { paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: colors.line },
  link: { color: colors.brandDeep, fontWeight: '800', marginTop: 8 },
  linkDisabled: { color: colors.muted },
  linkDone: { color: colors.ok },
  meetHint: { marginTop: 2, fontSize: 11, color: colors.muted },
  full: { marginTop: 8, color: colors.muted, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#fff',
  },
  send: {
    backgroundColor: colors.brand,
    borderRadius: 22,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
