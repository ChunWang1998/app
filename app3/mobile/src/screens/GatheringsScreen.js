import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';
import ScreenHeader from '../components/ScreenHeader';

export default function GatheringsScreen({
  city,
  gatherings,
  profile,
  hostingActive,
  onProfile,
  onJoin,
  onOpen,
  onCreateGathering,
}) {
  return (
    <View style={styles.fill}>
      <ScreenHeader
        title="汪汪聚會"
        subtitle={`${city} · 大隊長分數高的排前面`}
        photoUri={profile?.photoUri}
        onProfile={onProfile}
      />
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {hostingActive ? (
          <Text style={styles.hostNote}>
            你已有一場進行中的聚會，結束後才能再創辦。
          </Text>
        ) : (
          <TouchableOpacity style={styles.createBtn} onPress={onCreateGathering}>
            <Text style={styles.createTxt}>創辦汪汪聚會</Text>
          </TouchableOpacity>
        )}
        {gatherings.length === 0 ? (
          <Text style={styles.empty}>這一市目前沒有聚會。</Text>
        ) : (
          gatherings.map((g) => {
            const lockedOut = g.full && !g.iJoined && !g.iHost;
            const inner = (
              <>
                <View style={styles.top}>
                  <Text style={styles.name}>{g.name}</Text>
                  <Text style={styles.type}>{g.type}</Text>
                </View>
                <Text style={styles.meta}>
                  {g.dateLabel} · {g.place}
                </Text>
                <Text style={styles.meta}>
                  主辦 {g.hostName} · 大隊長分數 {g.hostCaptainScore || 0}
                </Text>
                <Text style={styles.meta}>
                  收費 {g.fee === 0 ? '免費' : `NT$${g.fee}`} · {g.joinedCount}/
                  {g.capacity} 人
                  {g.full ? ' · 額滿' : ''}
                  {g.ended ? ' · 已結束' : ''}
                </Text>
                {g.intro ? <Text style={styles.intro}>{g.intro}</Text> : null}
                {lockedOut ? (
                  <Text style={styles.fullNote}>額滿，無法報名</Text>
                ) : g.iHost ? (
                  <Text style={styles.note}>你是主辦者</Text>
                ) : g.iJoined ? (
                  <Text style={styles.note}>已報名 · 點進去看 LINE 群組</Text>
                ) : g.ended && !g.allowJoinAfterEnd ? (
                  <Text style={styles.note}>已結束</Text>
                ) : (
                  <TouchableOpacity style={styles.btn} onPress={() => onJoin(g)}>
                    <Text style={styles.btnTxt}>我要報名</Text>
                  </TouchableOpacity>
                )}
              </>
            );
            if (lockedOut) {
              return (
                <View key={g.id} style={[styles.card, styles.cardDim]}>
                  {inner}
                </View>
              );
            }
            return (
              <TouchableOpacity
                key={g.id}
                style={styles.card}
                activeOpacity={0.88}
                onPress={() => (g.iJoined || g.iHost ? onOpen(g) : null)}
              >
                {inner}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  cities: { paddingHorizontal: 16, paddingBottom: 4 },
  modes: { paddingBottom: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { marginTop: 8, color: colors.muted, lineHeight: 20 },
  createBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  createTxt: { color: '#fff', fontWeight: '800' },
  hostNote: {
    marginBottom: 12,
    color: colors.muted,
    fontWeight: '700',
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 10,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.ink },
  type: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brandDeep,
    backgroundColor: '#FFE2C8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  meta: { marginTop: 4, fontSize: 13, color: colors.muted },
  intro: { marginTop: 8, fontSize: 13, color: colors.ink, lineHeight: 20 },
  note: { marginTop: 10, color: colors.ok, fontWeight: '700' },
  fullNote: { marginTop: 10, color: colors.danger, fontWeight: '700' },
  cardDim: { opacity: 0.55 },
  btn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  btnTxt: { color: '#fff', fontWeight: '800' },
});
