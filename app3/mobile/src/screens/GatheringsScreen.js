import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { usePrefs } from '../context/AppPrefs';
import { taiwanCityFilterOptions } from '../data/constants';
import { radius } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import DropdownSelect from '../components/DropdownSelect';

export default function GatheringsScreen({
  gatherings,
  profile,
  hostingActive,
  hasUnreadChat = false,
  onProfile,
  onJoin,
  onOpen,
  onCreateGathering,
}) {
  const { colors } = usePrefs();
  const [city, setCity] = useState('');
  const rows = city ? gatherings.filter((g) => g.city === city) : gatherings;

  return (
    <View style={styles.fill}>
      <ScreenHeader
        title="汪汪聚會"
        photoUri={profile?.photoUri}
        onProfile={onProfile}
        showAlert={hasUnreadChat}
      />
      <View style={styles.topBlock}>
        {hostingActive ? (
          <Text style={[styles.hostNote, { color: colors.muted }]}>
            你已有一場進行中的聚會，結束後才能再創辦。
          </Text>
        ) : (
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.brand }]}
            onPress={onCreateGathering}
          >
            <Text style={styles.createTxt}>創辦汪汪聚會</Text>
          </TouchableOpacity>
        )}
        <DropdownSelect
          label="縣市"
          value={city}
          options={taiwanCityFilterOptions()}
          onChange={setCity}
          placeholder="全台"
        />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {rows.length === 0 ? (
          <Text style={[styles.empty, { color: colors.muted }]}>目前沒有聚會。</Text>
        ) : (
          rows.map((g) => {
            const lockedOut = g.full && !g.iJoined && !g.iHost;
            const inner = (
              <>
                <View style={styles.top}>
                  <Text
                    style={[styles.name, { color: colors.ink }]}
                    numberOfLines={2}
                  >
                    {g.name}
                  </Text>
                  <Text
                    style={[
                      styles.type,
                      { color: colors.brandDeep, backgroundColor: colors.chipOn },
                    ]}
                    numberOfLines={1}
                  >
                    {g.type}
                  </Text>
                </View>
                <Meta colors={colors} label="縣市" value={g.city || '—'} />
                <Meta colors={colors} label="日期" value={g.dateLabel || '—'} />
                <Meta colors={colors} label="地點" value={g.place || '—'} />
                <Meta
                  colors={colors}
                  label="主辦"
                  value={`${g.hostName || '—'} · 分數 ${g.hostCaptainScore || 0}`}
                />
                <Meta
                  colors={colors}
                  label="收費"
                  value={g.fee === 0 ? '免費' : `NT$${g.fee}`}
                />
                <Meta
                  colors={colors}
                  label="人數"
                  value={`${g.joinedCount || 0}/${g.capacity || 8}${
                    g.full ? ' · 額滿' : ''
                  }${g.ended ? ' · 已結束' : ''}`}
                />
                {g.intro ? (
                  <Text style={[styles.intro, { color: colors.ink }]}>{g.intro}</Text>
                ) : null}
                {lockedOut ? (
                  <Text style={[styles.fullNote, { color: colors.danger }]}>
                    額滿，無法報名
                  </Text>
                ) : g.iHost ? (
                  <Text style={[styles.note, { color: colors.ok }]}>你是主辦者</Text>
                ) : g.iJoined ? (
                  <Text style={[styles.note, { color: colors.ok }]}>
                    已報名 · 點進去看 LINE 群組
                  </Text>
                ) : g.ended && !g.allowJoinAfterEnd ? (
                  <Text style={[styles.note, { color: colors.muted }]}>已結束</Text>
                ) : (
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: colors.brand }]}
                    onPress={() => onJoin(g)}
                  >
                    <Text style={styles.btnTxt}>我要報名</Text>
                  </TouchableOpacity>
                )}
              </>
            );
            if (lockedOut) {
              return (
                <View
                  key={g.id}
                  style={[
                    styles.card,
                    styles.cardDim,
                    { backgroundColor: colors.card, borderColor: colors.line },
                  ]}
                >
                  {inner}
                </View>
              );
            }
            return (
              <TouchableOpacity
                key={g.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.line },
                ]}
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

function Meta({ colors, label, value }) {
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: colors.ink }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBlock: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  scroll: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { marginTop: 8, lineHeight: 20 },
  createBtn: {
    borderRadius: radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
  },
  createTxt: { color: '#fff', fontWeight: '800' },
  hostNote: {
    fontWeight: '700',
    lineHeight: 20,
    fontSize: 13,
  },
  card: {
    borderRadius: radius.card,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  name: { flex: 1, fontSize: 17, fontWeight: '800', flexShrink: 1 },
  type: {
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: 'hidden',
    flexShrink: 0,
    maxWidth: '42%',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 10,
  },
  metaLabel: { width: 36, fontSize: 13, fontWeight: '700', marginTop: 1 },
  metaValue: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  intro: { marginTop: 6, fontSize: 13, lineHeight: 20 },
  note: { marginTop: 10, fontWeight: '700' },
  fullNote: { marginTop: 10, fontWeight: '700' },
  cardDim: { opacity: 0.55 },
  btn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  btnTxt: { color: '#fff', fontWeight: '800' },
});
