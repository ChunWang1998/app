import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { usePrefs } from '../context/AppPrefs';
import { allSlotCombos, slotKey, taiwanCityFilterOptions } from '../data/constants';
import { flattenOwnersToDogCards } from '../lib/dogs';
import { sortOwners, crownsForDistrict } from '../lib/sort';
import OwnerRow from '../components/OwnerRow';
import Chip from '../components/Chip';
import ScreenHeader from '../components/ScreenHeader';
import DropdownSelect from '../components/DropdownSelect';
import { radius } from '../theme';

export default function ExploreScreen({
  districtsByCity = {},
  onNeedDistricts,
  owners,
  profile,
  session,
  subscribed,
  connects = [],
  ownersById = {},
  onOpenOwner,
  onProfile,
  onAccept,
  onDecline,
  onNeedRegister,
  onNeedSubscribe,
  hasUnreadChat = false,
}) {
  const { colors, t } = usePrefs();
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [slotKeys, setSlotKeys] = useState([]);

  useEffect(() => {
    setDistrict('');
    if (city && onNeedDistricts) onNeedDistricts(city);
  }, [city]);

  const districts = city ? districtsByCity[city] || [] : [];
  const cards = useMemo(() => flattenOwnersToDogCards(owners), [owners]);
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
      { value: '', label: t('allDistricts') },
      ...districts.map((d) => ({ value: d, label: d })),
    ],
    [districts, t],
  );

  const incoming = (connects || []).filter(
    (c) => c.toId === session?.id && c.status === 'pending',
  );

  const nameOf = (id) => {
    const o = ownersById[id];
    return o?.dogName || o?.ownerNick || id;
  };

  const toggleSlot = (key) => {
    setSlotKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  return (
    <View style={styles.fill}>
      <ScreenHeader
        title={t('partnersTitle')}
        photoUri={profile?.photoUri}
        onProfile={onProfile}
        showAlert={hasUnreadChat}
      />
      <View style={styles.filters}>
        <DropdownSelect
          label={t('city')}
          value={city}
          options={cityOptions}
          onChange={setCity}
          placeholder={t('allTaiwan')}
          style={styles.filterHalf}
        />
        <DropdownSelect
          label={t('district')}
          value={district}
          options={districtOptions}
          onChange={setDistrict}
          placeholder={city ? t('allDistricts') : t('pickCityFirst')}
          disabled={!city}
          style={styles.filterHalf}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.groupTitle, { color: colors.brandDeep }]}>
          {t('pendingSection')}
        </Text>
        {!session ? (
          <View style={[styles.pendingCard, { backgroundColor: colors.card, borderColor: colors.line }]}>
            <Text style={[styles.pendingHint, { color: colors.muted }]}>
              {t('pendingNeedRegister')}
            </Text>
            <TouchableOpacity
              style={[styles.pendingBtn, { backgroundColor: colors.brand }]}
              onPress={onNeedRegister}
            >
              <Text style={styles.pendingBtnTxt}>{t('goRegister')}</Text>
            </TouchableOpacity>
          </View>
        ) : !subscribed ? (
          <View style={[styles.pendingCard, { backgroundColor: colors.card, borderColor: colors.line }]}>
            <Text style={[styles.pendingHint, { color: colors.muted }]}>
              {t('pendingNeedSubscribe')}
            </Text>
            <TouchableOpacity
              style={[styles.pendingBtn, { backgroundColor: colors.brand }]}
              onPress={onNeedSubscribe}
            >
              <Text style={styles.pendingBtnTxt}>{t('goSubscribe')}</Text>
            </TouchableOpacity>
          </View>
        ) : incoming.length === 0 ? (
          <Text style={[styles.empty, { color: colors.muted }]}>{t('pendingEmpty')}</Text>
        ) : (
          incoming.map((c) => (
            <View
              key={c.id}
              style={[styles.pendingCard, { backgroundColor: colors.card, borderColor: colors.line }]}
            >
              <Text style={[styles.pendingName, { color: colors.ink }]}>
                {nameOf(c.fromId)} {t('wantsConnect')}
              </Text>
              <View style={styles.pendingRow}>
                <TouchableOpacity
                  style={[styles.pendingBtn, { backgroundColor: colors.brand }]}
                  onPress={() => onAccept?.(c.id)}
                >
                  <Text style={styles.pendingBtnTxt}>{t('accept')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.pendingBtn,
                    { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
                  ]}
                  onPress={() => onDecline?.(c.id)}
                >
                  <Text style={[styles.pendingBtnTxt, { color: colors.ink }]}>
                    {t('decline')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <Text style={[styles.groupTitle, { marginTop: 10, color: colors.brandDeep }]}>
          {t('slotFilter')}
        </Text>
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
            <Text style={[styles.clear, { color: colors.brandDeep }]}>{t('clearSlots')}</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={[styles.groupTitle, { marginTop: 10, color: colors.brandDeep }]}>
          {t('partnersTitle')}
        </Text>
        {sorted.length === 0 ? (
          <Text style={[styles.empty, { color: colors.muted }]}>{t('noOwners')}</Text>
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
  filterHalf: { flex: 1, alignSelf: 'stretch' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  groupTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
    marginTop: 8,
  },
  empty: { marginTop: 8, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  clear: { fontWeight: '800', marginBottom: 8 },
  pendingCard: {
    borderRadius: radius.row,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  pendingHint: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  pendingName: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  pendingRow: { flexDirection: 'row', gap: 10 },
  pendingBtn: {
    flex: 1,
    borderRadius: radius.pill,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pendingBtnTxt: { color: '#fff', fontWeight: '800' },
});
