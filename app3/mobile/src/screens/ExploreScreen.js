import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { allSlotCombos, slotKey } from '../data/constants';
import { sortOwners, crownsForDistrict } from '../lib/sort';
import OwnerRow from '../components/OwnerRow';
import Chip from '../components/Chip';
import ScreenHeader from '../components/ScreenHeader';

export default function ExploreScreen({
  city,
  districts,
  guessedDistrict,
  owners,
  profile,
  onOpenOwner,
  onProfile,
}) {
  const [district, setDistrict] = useState(guessedDistrict || '');
  const [slotKeys, setSlotKeys] = useState([]);

  useEffect(() => {
    setDistrict('');
  }, [city]);

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
      <ScreenHeader
        title={city}
        subtitle="鄰汪夥伴可用時段篩選"
        photoUri={profile?.photoUri}
        onProfile={onProfile}
      />
      <View style={styles.districts}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modes}
        >
          <Chip label="全區" selected={!district} onPress={() => setDistrict('')} />
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
        <Text style={styles.groupTitle}>範例汪汪</Text>
        <Text style={styles.sub}>團團／可可 · 每位登入的人都看得到</Text>
        {guides.map((o) => (
          <OwnerRow key={o.id} owner={o} onPress={() => onOpenOwner(o.id)} />
        ))}

        <Text style={[styles.groupTitle, { marginTop: 10 }]}>時段篩選</Text>
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
  districts: { paddingHorizontal: 16, paddingBottom: 4 },
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
});
