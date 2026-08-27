import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { allSlotCombos, slotKey, taiwanCityFilterOptions } from '../data/constants';
import { flattenOwnersToDogCards } from '../lib/dogs';
import { sortOwners, crownsForDistrict } from '../lib/sort';
import OwnerRow from '../components/OwnerRow';
import Chip from '../components/Chip';
import ScreenHeader from '../components/ScreenHeader';
import DropdownSelect from '../components/DropdownSelect';

export default function ExploreScreen({
  districtsByCity = {},
  onNeedDistricts,
  owners,
  profile,
  onOpenOwner,
  onProfile,
}) {
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [slotKeys, setSlotKeys] = useState([]);

  useEffect(() => {
    setDistrict('');
    if (city && onNeedDistricts) onNeedDistricts(city);
  }, [city]);

  const districts = city ? districtsByCity[city] || [] : [];
  const cards = useMemo(() => flattenOwnersToDogCards(owners), [owners]);
  const guides = cards.filter((o) => o.isGuide);
  const people = cards.filter((o) => !o.isGuide);
  const byCity = city ? people.filter((o) => o.city === city) : people;
  const byDistrict = district
    ? byCity.filter((o) => o.district === district)
    : byCity;

  const filtered = byDistrict.filter((o) => {
    if (!slotKeys.length) return true;
    return (o.slots || []).some((s) => slotKeys.includes(slotKey(s)));
  });

  const sorted = useMemo(() => sortOwners(filtered), [filtered]);
  const crowns = useMemo(
    () => (district ? crownsForDistrict(byCity, district) : {}),
    [byCity, district],
  );

  const cityOptions = useMemo(() => taiwanCityFilterOptions(), []);

  const districtOptions = useMemo(
    () => [
      { value: '', label: '全區' },
      ...districts.map((d) => ({ value: d, label: d })),
    ],
    [districts],
  );

  const toggleSlot = (key) => {
    setSlotKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  return (
    <View style={styles.fill}>
      <ScreenHeader
        title="鄰汪夥伴"
        subtitle="全台配對 · 可用縣市與時段篩選"
        photoUri={profile?.photoUri}
        onProfile={onProfile}
      />
      <View style={styles.filters}>
        <DropdownSelect
          label="縣市"
          value={city}
          options={cityOptions}
          onChange={setCity}
          placeholder="全台"
          style={styles.filterHalf}
        />
        <DropdownSelect
          label="行政區"
          value={district}
          options={districtOptions}
          onChange={setDistrict}
          placeholder={city ? '全區' : '先選縣市'}
          disabled={!city}
          style={styles.filterHalf}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.groupTitle}>範例汪汪</Text>
        <Text style={styles.sub}>團團／可可 · 每位登入的人都看得到</Text>
        {guides.map((o) => (
          <OwnerRow
            key={o.cardKey}
            owner={o}
            onPress={() => onOpenOwner(o.ownerId || o.id, o.dogId)}
          />
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
              key={o.cardKey}
              owner={o}
              crown={district ? crowns[o.ownerId || o.id] : undefined}
              onPress={() => onOpenOwner(o.ownerId || o.id, o.dogId)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },
  filterHalf: { flex: 1 },
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
