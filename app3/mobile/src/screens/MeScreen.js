import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { FOUNDER_CAP } from '../data/constants';
import { hasValidSub } from '../lib/store';

export default function MeScreen({
  session,
  profile,
  founderCount,
  connects,
  ownersById,
  onRegister,
  onCreateProfile,
  onSubscribe,
  onOpenChat,
  onAccept,
  onDecline,
  onDemoAccept,
}) {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');

  const incoming = connects.filter(
    (c) => c.toId === session?.id && c.status === 'pending',
  );
  const sent = connects.filter(
    (c) => c.fromId === session?.id && c.status === 'pending',
  );
  const accepted = connects.filter(
    (c) =>
      c.status === 'accepted' &&
      (c.fromId === session?.id || c.toId === session?.id),
  );

  const nameOf = (id) => ownersById[id]?.dogName || id;

  return (
    <ScrollView
      contentContainerStyle={[styles.pad, { paddingTop: insets.top + 12 }]}
    >
      <Text style={styles.h}>我的</Text>

      {!session ? (
        <View style={styles.card}>
          <Text style={styles.p}>
            填手機號當帳號（不驗證碼）。前 {FOUNDER_CAP} 人寫入白名單，永久不必付費。必須同時建立狗檔案才算完成免費註冊。
          </Text>
          <TextInput
            style={styles.input}
            placeholder="手機號碼"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <TouchableOpacity
            style={styles.btn}
            onPress={() => {
              if (!phone.trim()) {
                Alert.alert('請輸入手機');
                return;
              }
              onRegister(phone.trim());
            }}
          >
            <Text style={styles.btnText}>填檔案並註冊</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>
            白名單 {founderCount}/{FOUNDER_CAP}
            {founderCount >= FOUNDER_CAP
              ? ' 已滿。下次升級後，名單內視為已事先訂閱。'
              : ' · 同一支號碼下次升級仍免費用'}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.k}>帳號 {session.phone || session.loginKey}</Text>
            <Text style={styles.v}>
              {session.subscription === 'founder'
                ? '白名單：已事先訂閱（永久免費）'
                : session.subscription === 'paid'
                  ? '訂閱中（月繳示範）'
                  : '未訂閱'}
            </Text>
            {profile ? (
              <>
                <Text style={styles.v}>
                  {profile.dogName} · 出去 {profile.outingCount || 0} · Connect{' '}
                  {profile.connectCount || 0}
                </Text>
                <TouchableOpacity onPress={onCreateProfile}>
                  <Text style={styles.link}>編輯檔案</Text>
                </TouchableOpacity>
              </>
            ) : hasValidSub(session) ? (
              <TouchableOpacity style={styles.btn} onPress={onCreateProfile}>
                <Text style={styles.btnText}>請先完成狗檔案（註冊未完成）</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.btn} onPress={onSubscribe}>
                <Text style={styles.btnText}>訂閱後才能建立檔案</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.section}>待回覆</Text>
          {incoming.length === 0 ? (
            <Text style={styles.empty}>沒有新的 Connect</Text>
          ) : (
            incoming.map((c) => (
              <View key={c.id} style={styles.card}>
                <Text style={styles.v}>{nameOf(c.fromId)} 想 Connect</Text>
                <View style={styles.row}>
                  <TouchableOpacity style={styles.small} onPress={() => onAccept(c.id)}>
                    <Text style={styles.smallText}>接受</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.small, styles.ghost]}
                    onPress={() => onDecline(c.id)}
                  >
                    <Text style={[styles.smallText, { color: colors.ink }]}>拒絕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <Text style={styles.section}>已送出</Text>
          {sent.length === 0 ? (
            <Text style={styles.empty}>尚無待回覆邀請</Text>
          ) : (
            sent.map((c) => (
              <View key={c.id} style={styles.card}>
                <Text style={styles.v}>等待 {nameOf(c.toId)} 回覆</Text>
                <TouchableOpacity onPress={() => onDemoAccept(c.id)}>
                  <Text style={styles.link}>示範：模擬對方接受</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          <Text style={styles.section}>已接受／歷史</Text>
          {accepted.length === 0 ? (
            <Text style={styles.empty}>還沒有成功的 Connect</Text>
          ) : (
            accepted.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.card}
                onPress={() => onOpenChat(c.id)}
              >
                <Text style={styles.v}>
                  與 {nameOf(c.fromId === session.id ? c.toId : c.fromId)} 聊天
                </Text>
                <Text style={styles.hint}>最多 20 句</Text>
              </TouchableOpacity>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingBottom: 40 },
  h: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 10,
  },
  p: { color: colors.muted, marginBottom: 8, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  btn: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: { color: '#fff', fontWeight: '800' },
  hint: { marginTop: 8, fontSize: 12, color: colors.muted, lineHeight: 18 },
  k: { fontSize: 12, color: colors.muted },
  v: { fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 4 },
  link: { marginTop: 8, color: colors.brandDeep, fontWeight: '800' },
  section: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '800',
    color: colors.ink,
  },
  empty: { color: colors.muted, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
  small: {
    backgroundColor: colors.brand,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
  },
  ghost: { backgroundColor: '#F4EDE3' },
  smallText: { color: '#fff', fontWeight: '800' },
});
