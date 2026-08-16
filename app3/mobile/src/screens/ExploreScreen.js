import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { allSlotCombos, slotKey } from '../data/constants';
import { sortOwners, crownsForDistrict } from '../lib/sort';
import OwnerRow from '../components/OwnerRow';
import Chip from '../components/Chip';

export default function ExploreScreen({
  city,
  districts,
  guessedDistrict,
  owners,
  gatherings,
  onOpenOwner,
  onJoinGathering,
}) {
  const insets = useSafeAreaInsets();
  const [district, setDistrict] = useState(guessedDistrict || '');
  const [slotKeys, setSlotKeys] = useState([]);

  const guides = owners.filter((o) => o.isGuide);
  const inCity = owners.filter((o) => !o.isGuide && o.city === city);
  const byDistrict = district
    ? inCity.filter((o) => o.district === district)
    : inCity;

  const filtered = byDistrict.filter((o) => {
    if (!slotKeys.length) return true;
    return (o.slots || []).some((s) => slotKeys.includes(slotKey(s)));
  });

  const sorted = useMemo(() => sortOwners(filtered), [filtered]);
  const crowns = useMemo(
    () => (district ? crownsForDistrict(inCity, district) : {}),
    [inCity, district],
  );

  const toggleSlot = (key) => {
    setSlotKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  return (
    <View style={styles.fill}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.city}>{city}</Text>
        <Text style={styles.hint}>全部主人一次看完 · 用時段勾選篩選</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modes}
        >
          <Chip
            label="全區"
            selected={!district}
            onPress={() => setDistrict('')}
          />
          {districts.map((d) => (
            <Chip
              key={d}
              label={d}
              selected={district === d}
              onPress={() => setDistrict(d)}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.groupTitle}>公園聚會</Text>
        <Text style={styles.sub}>
          需主揪 · 10 人內 · 日期一週內 · 報名費當場繳
        </Text>
        {gatherings.length === 0 ? (
          <Text style={styles.empty}>這一市目前沒有聚會</Text>
        ) : (
          gatherings.map((g) => (
            <View key={g.id} style={styles.gCard}>
              <Text style={styles.gPark}>{g.park}</Text>
              <Text style={styles.gMeta}>
                主揪 {g.hostName} · {g.dateLabel} {g.time}
              </Text>
              <Text style={styles.gMeta}>
                {g.joinedCount}/{g.cap} 人 · 報名費 NT${g.fee} 現場繳
              </Text>
              {g.note ? <Text style={styles.gNote}>{g.note}</Text> : null}
              <TouchableOpacity
                style={[styles.gBtn, (g.iJoined || g.joinedCount >= g.cap) && styles.gBtnOff]}
                disabled={g.iJoined || g.joinedCount >= g.cap}
                onPress={() => onJoinGathering(g)}
              >
                <Text style={styles.gBtnTxt}>
                  {g.iJoined
                    ? '已報名'
                    : g.joinedCount >= g.cap
                      ? '已額滿'
                      : '我要報名'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <Text style={[styles.groupTitle, { marginTop: 18 }]}>時段篩選</Text>
        <View style={styles.wrap}>
          {allSlotCombos().map((c) => {
            const key = `${c.day}:${c.slot}`;
            const on = slotKeys.includes(key);
            return (
              <Chip
                key={key}
                label={`${on ? '✓ ' : ''}${c.label}`}
                selected={on}
                onPress={() => toggleSlot(key)}
              />
            );
          })}
        </View>
        {slotKeys.length ? (
          <TouchableOpacity onPress={() => setSlotKeys([])}>
            <Text style={styles.clear}>清除時段篩選</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={[styles.groupTitle, { marginTop: 10 }]}>鄰汪夥伴</Text>
        <Text style={styles.sub}>全域假資料 · 每位登入的人都看得到</Text>
        {guides.map((o) => (
          <OwnerRow key={o.id} owner={o} onPress={() => onOpenOwner(o.id)} />
        ))}

        <Text style={[styles.groupTitle, { marginTop: 10 }]}>附近主人</Text>
        {sorted.length === 0 ? (
          <Text style={styles.empty}>這個篩選還沒有主人</Text>
        ) : (
          sorted.map((o) => (
            <OwnerRow
              key={o.id}
              owner={o}
              crown={district ? crowns[o.id] : undefined}
              onPress={() => onOpenOwner(o.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { paddingHorizontal: 16, paddingBottom: 4 },
  city: { fontSize: 24, fontWeight: '800', color: colors.ink },
  hint: { marginTop: 4, marginBottom: 10, fontSize: 12, color: colors.muted },
  modes: { paddingBottom: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  groupTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.brandDeep,
    marginBottom: 4,
    marginTop: 8,
  },
  sub: { fontSize: 12, color: colors.muted, marginBottom: 8 },
  empty: { marginTop: 8, marginBottom: 8, color: colors.muted },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  clear: { color: colors.brandDeep, fontWeight: '800', marginBottom: 8 },
  gCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 10,
  },
  gPark: { fontSize: 16, fontWeight: '800', color: colors.ink },
  gMeta: { marginTop: 4, fontSize: 13, color: colors.muted },
  gNote: { marginTop: 6, fontSize: 12, color: colors.ink },
  gBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  gBtnOff: { backgroundColor: '#D9CFC3' },
  gBtnTxt: { color: '#fff', fontWeight: '800' },
});
