import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import {
  ScrollView,
  Swipeable,
  RectButton,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { FOUNDER_CAP, PLAY_OPTIONS } from '../data/constants';
import { hasValidSub } from '../lib/store';
import { displayNameForOwner, normalizeProfile } from '../lib/dogs';

export default function MeScreen({
  session,
  profile,
  founderCount,
  connects,
  ownersById,
  myGatherings = [],
  onBack,
  onRegister,
  onCreateProfile,
  onSubscribe,
  onOpenChat,
  onAccept,
  onDecline,
  onOpenGathering,
  onDisconnect,
  onDeleteAccount,
}) {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const swipeRefs = useRef({});
  const lastAskAt = useRef(0);

  const incoming = connects.filter(
    (c) => c.toId === session?.id && c.status === 'pending',
  );
  const sent = connects.filter(
    (c) => c.fromId === session?.id && c.status === 'pending',
  );
  const chats = connects.filter((c) => {
    const mine = c.fromId === session?.id || c.toId === session?.id;
    if (!mine) return false;
    if (c.status === 'accepted') return true;
    return c.status === 'disconnected' && c.disconnectedBy !== session?.id;
  });

  const nameOf = (id) => displayNameForOwner(ownersById[id]) || id;
  const subscribed = hasValidSub(session);

  return (
    <ScrollView
      contentContainerStyle={[styles.pad, { paddingTop: insets.top + 12 }]}
    >
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>← 返回</Text>
      </TouchableOpacity>
      <Text style={styles.h}>個人頁</Text>

      {!session ? (
        <View style={styles.card}>
          <Text style={styles.p}>
            填手機號當帳號（不驗證碼）。前 {FOUNDER_CAP} 人寫入白名單，永久不必付費。必須同時建立汪汪檔案才算完成免費註冊。已註冊過請填同一支號碼，會從雲端還原。
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
              ? ' 已滿。v1 只服務這 100 人；名單內到 v2 仍永久免費。'
              : ' · 同一支號碼換機仍免費用'}
          </Text>
        </View>
      ) : !subscribed ? (
        <View style={styles.card}>
          <Text style={styles.v}>未訂閱</Text>
          <Text style={styles.p}>
            未訂閱只能看清單。看詳情、Connect、創辦／報名聚會都要先訂閱。
          </Text>
          <TouchableOpacity style={styles.btn} onPress={onSubscribe}>
            <Text style={styles.btnText}>去訂閱</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.k}>帳號 {session.phone || session.loginKey}</Text>
            <Text style={styles.v}>
              {session.subscription === 'founder'
                ? '白名單：已事先訂閱（永久免費）'
                : '已訂閱'}
            </Text>
            {profile ? (
              <>
                {(() => {
                  const p = normalizeProfile(profile);
                  const dogs = p?.dogs || [];
                  return (
                    <>
                      {dogs.map((d) => (
                        <View key={d.id} style={{ marginBottom: 10 }}>
                          {d.photoUri ? (
                            <Image source={{ uri: d.photoUri }} style={styles.photo} />
                          ) : null}
                          <Text style={styles.v}>{d.dogName}</Text>
                          <Info
                            label="類型"
                            value={`${d.breed || '—'} · ${d.size || '—'} · ${
                              d.ageRange || '—'
                            }`}
                          />
                          <Info
                            label="個性"
                            value={(d.personalities || []).join('、') || '—'}
                          />
                          <Info
                            label="與其他狗"
                            value={
                              PLAY_OPTIONS.find((x) => x.id === d.playWith)?.label ||
                              '—'
                            }
                          />
                          {d.intro ? <Text style={styles.intro}>{d.intro}</Text> : null}
                        </View>
                      ))}
                      {p.ownerNick ? (
                        <Text style={styles.stats}>主人 {p.ownerNick}</Text>
                      ) : null}
                      <Info
                        label="時段"
                        value={
                          (p.slots || []).map((s) => s.label).join('、') || '—'
                        }
                      />
                      <Info
                        label="地點"
                        value={(p.places || []).join('、') || '—'}
                      />
                      <Info
                        label="行政區"
                        value={`${p.city || ''} ${p.district || ''}`.trim() || '—'}
                      />
                      <Info label="出去次數" value={String(p.outingCount || 0)} />
                      <Info label="Connect 次數" value={String(p.connectCount || 0)} />
                      <Info
                        label="汪汪大隊長"
                        value={`${p.captainCount || 0} 次 · 分數 ${
                          p.captainScore || 0
                        }`}
                      />
                      <Info label="汪汪隊員" value={`${p.memberCount || 0} 次`} />
                    </>
                  );
                })()}
                <TouchableOpacity onPress={onCreateProfile}>
                  <Text style={styles.link}>編輯汪汪檔案</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.btn} onPress={onCreateProfile}>
                <Text style={styles.btnText}>請先完成汪汪檔案（註冊未完成）</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.section}>參加的聚會</Text>
          {myGatherings.length === 0 ? (
            <Text style={styles.empty}>還沒有報名或創辦的聚會</Text>
          ) : (
            myGatherings.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={styles.card}
                onPress={() => onOpenGathering(g)}
              >
                <Text style={styles.v}>
                  {g.name} · {g.type}
                </Text>
                <Text style={styles.hint}>
                  {g.dateLabel} · {g.place}
                  {g.iHost ? ' · 主辦' : ''}
                  {g.ended ? ' · 已結束' : ''}
                </Text>
                <Text style={styles.link}>看 LINE 群組邀請</Text>
              </TouchableOpacity>
            ))
          )}

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
              </View>
            ))
          )}

          <Text style={styles.section}>聊天</Text>
          <Text style={styles.hint}>左滑或右滑刪除對話，會解除 Connect</Text>
          {chats.length === 0 ? (
            <Text style={styles.empty}>還沒有對話</Text>
          ) : (
            chats.map((c) => {
              const askDisconnect = () => {
                const now = Date.now();
                if (now - lastAskAt.current < 700) return;
                lastAskAt.current = now;
                setTimeout(() => {
                  Alert.alert('解除 Connect', '刪除對話後將解除 Connect。', [
                    {
                      text: '取消',
                      style: 'cancel',
                      onPress: () => swipeRefs.current[c.id]?.close?.(),
                    },
                    {
                      text: '解除',
                      style: 'destructive',
                      onPress: () => onDisconnect(c.id),
                    },
                  ]);
                }, 40);
              };
              const deleteAction = () => (
                <RectButton style={styles.del} onPress={askDisconnect}>
                  <Text style={styles.delTxt}>刪除</Text>
                </RectButton>
              );
              return (
                <View key={c.id} style={styles.swipeRow}>
                  <Swipeable
                    ref={(r) => {
                      swipeRefs.current[c.id] = r;
                    }}
                    friction={1.5}
                    leftThreshold={24}
                    rightThreshold={24}
                    overshootLeft={false}
                    overshootRight={false}
                    activeOffsetX={[-12, 12]}
                    failOffsetY={[-18, 18]}
                    onSwipeableOpen={askDisconnect}
                    renderLeftActions={deleteAction}
                    renderRightActions={deleteAction}
                  >
                    <TouchableOpacity
                      style={styles.chatCard}
                      onPress={() => onOpenChat(c.id)}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.v}>
                        與 {nameOf(c.fromId === session.id ? c.toId : c.fromId)} 聊天
                      </Text>
                      <Text style={styles.hint}>
                        {c.status === 'disconnected'
                          ? '對方已解除 Connect'
                          : '最多 20 句 · 滑動刪除'}
                      </Text>
                    </TouchableOpacity>
                  </Swipeable>
                </View>
              );
            })
          )}
        </>
      )}

      {session && onDeleteAccount ? (
        <TouchableOpacity
          style={styles.dangerBtn}
          onPress={() => {
            Alert.alert(
              '刪除帳號',
              '會刪除此裝置上的登入狀態。若已接雲端，也會刪除檔案、Connect、聊天與聚會。創始白名單名額不退回。此動作無法復原。',
              [
                { text: '取消', style: 'cancel' },
                { text: '刪除帳號', style: 'destructive', onPress: onDeleteAccount },
              ],
            );
          }}
        >
          <Text style={styles.dangerTxt}>刪除帳號</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

function Info({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoK}>{label}</Text>
      <Text style={styles.infoV}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingBottom: 40 },
  back: { color: colors.brandDeep, fontWeight: '800', marginBottom: 8 },
  h: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 10,
  },
  swipeRow: { marginBottom: 10 },
  chatCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
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
    marginBottom: 10,
  },
  btnText: { color: '#fff', fontWeight: '800' },
  hint: { marginTop: 8, fontSize: 12, color: colors.muted, lineHeight: 18 },
  k: { fontSize: 12, color: colors.muted },
  v: { fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 4 },
  stats: { marginTop: 4, fontSize: 13, color: colors.muted },
  intro: { marginTop: 8, marginBottom: 4, fontSize: 14, color: colors.ink, lineHeight: 20 },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: '#F8EBD8',
  },
  infoRow: { marginTop: 10 },
  infoK: { fontSize: 12, color: colors.muted, marginBottom: 2 },
  infoV: { fontSize: 15, fontWeight: '700', color: colors.ink },
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
  del: {
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    borderRadius: radius.card,
  },
  delTxt: { color: '#fff', fontWeight: '800' },
  dangerBtn: { marginTop: 28, alignItems: 'center', paddingVertical: 12 },
  dangerTxt: { color: colors.danger, fontWeight: '800' },
});
