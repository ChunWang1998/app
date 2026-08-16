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
import { listMessages, sendMessage, confirmMeet, demoOtherConfirm } from '../lib/store';

export default function ChatScreen({
  connect,
  meId,
  peerName,
  onBack,
  onRefreshOwners,
}) {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState([]);
  const [text, setText] = useState('');
  const full = rows.length >= MAX_CHAT;

  const reload = async () => {
    if (!connect) return;
    setRows(await listMessages(connect.id));
  };

  useEffect(() => {
    reload();
  }, [connect?.id]);

  const send = async () => {
    const t = text.trim();
    if (!t || !connect) return;
    try {
      const next = await sendMessage(connect.id, meId, t);
      setRows(next);
      setText('');
    } catch (e) {
      if (e.code === 'full') Alert.alert('已滿 20 句', '之後請自行約見面。');
      else if (e.code === 'disconnected') Alert.alert('已解除 Connect');
    }
  };

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
            : `${rows.length}/${MAX_CHAT} 句 · 第一次見面建議公園平行走 15 分鐘`}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.msgs}>
        {rows.map((m, i) => {
          const mine = m.fromId === meId;
          return (
            <View key={`${m.at}-${i}`} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={[styles.msg, mine && { color: '#fff' }]}>{m.text}</Text>
            </View>
          );
        })}
      </ScrollView>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          onPress={async () => {
            await confirmMeet(connect.id, meId);
            Alert.alert('已記錄', '需雙方都按「已見面」才會 +1 出去次數。');
            onRefreshOwners?.();
          }}
        >
          <Text style={styles.link}>我已見面</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={async () => {
            await demoOtherConfirm(connect.id);
            Alert.alert('示範', '已模擬對方按下已見面。若你也按了，出去次數 +1。');
            onRefreshOwners?.();
          }}
        >
          <Text style={styles.link}>模擬對方已見面</Text>
        </TouchableOpacity>
        {full && connect?.status !== 'disconnected' ? (
          <Text style={styles.full}>對話已滿，請自行約</Text>
        ) : (
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={
                connect?.status === 'disconnected' ? '已解除 Connect' : '最多 20 句'
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
  hint: { marginTop: 4, color: colors.muted, fontSize: 12 },
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
  full: { marginTop: 8, color: colors.muted },
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
