import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';
import ScreenHeader from '../components/ScreenHeader';

export default function GatheringsScreen({
  city,
  gatherings,
  profile,
  onProfile,
  onJoin,
  onOpen,
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
        {gatherings.length === 0 ? (
          <Text style={styles.empty}>這一市目前沒有聚會。可到個人頁創辦。</Text>
        ) : (
          gatherings.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={styles.card}
              activeOpacity={0.88}
              onPress={() => (g.iJoined || g.iHost ? onOpen(g) : null)}
            >
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
                收費 {g.fee === 0 ? '免費' : `NT$${g.fee}`} · {g.joinedCount} 人
                {g.ended ? ' · 已結束' : ''}
              </Text>
              {g.intro ? <Text style={styles.intro}>{g.intro}</Text> : null}
              {g.iHost ? (
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
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { marginTop: 16, color: colors.muted, lineHeight: 20 },
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
