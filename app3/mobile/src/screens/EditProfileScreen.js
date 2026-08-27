import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import {
  PERSONALITIES,
  SIZES,
  AGE_RANGES,
  DAY_TYPES,
  TIME_SLOTS,
  PLAY_OPTIONS,
  MAX_SLOTS,
  MAX_PLACES,
  MAX_DOGS,
  MAX_INTRO,
  MAX_PERSONALITIES,
  MAX_PERSONALITY_LEN,
  TAIWAN_CITIES,
  taiwanCityPickOptions,
  slotLabel,
} from '../data/constants';
import { fetchDistrictsForCity } from '../lib/districts';
import { emptyDog, normalizeProfile } from '../lib/dogs';
import { AwareTextInput, useKeyboardAwareScroll } from '../lib/keyboard';
import Chip from '../components/Chip';
import DropdownSelect from '../components/DropdownSelect';

export default function EditProfileScreen({
  initial,
  registerMode,
  onBack,
  onSave,
  onCityChange,
}) {
  const insets = useSafeAreaInsets();
  const { scrollRef, onScroll, onInputFocus, onInputBlur } =
    useKeyboardAwareScroll();
  const base = normalizeProfile(initial) || normalizeProfile({});
  const [ownerNick, setOwnerNick] = useState(base.ownerNick || '');
  const [slots, setSlots] = useState(base.slots || []);
  const [places, setPlaces] = useState(base.places || []);
  const [placeDraft, setPlaceDraft] = useState('');
  const [city, setCity] = useState(base.city || TAIWAN_CITIES[0]);
  const [districtList, setDistrictList] = useState([]);
  const [district, setDistrict] = useState(base.district || '');
  const [loadingTowns, setLoadingTowns] = useState(false);
  const [personalityDraft, setPersonalityDraft] = useState('');
  const [dogs, setDogs] = useState(
    (base.dogs || [emptyDog()]).map((d) => emptyDog(d)),
  );
  const [dogIndex, setDogIndex] = useState(0);

  const dog = dogs[dogIndex] || dogs[0];

  const updateDog = (patch) => {
    setDogs((prev) =>
      prev.map((d, i) => (i === dogIndex ? emptyDog({ ...d, ...patch }) : d)),
    );
  };

  useEffect(() => {
    let cancelled = false;
    const loadTowns = async () => {
      if (!city) return;
      if (onCityChange) onCityChange(city);
      setLoadingTowns(true);
      try {
        const towns = await fetchDistrictsForCity(city);
        if (cancelled) return;
        setDistrictList(towns);
        setDistrict((prev) => (towns.includes(prev) ? prev : towns[0] || ''));
      } catch {
        if (!cancelled) {
          setDistrictList([]);
          Alert.alert('行政區載入失敗', '請確認網路後再試一次。');
        }
      } finally {
        if (!cancelled) setLoadingTowns(false);
      }
    };
    loadTowns();
    return () => {
      cancelled = true;
    };
  }, [city]);

  const togglePersonality = (p) => {
    const list = dog.personalities || [];
    if (list.includes(p)) {
      updateDog({ personalities: list.filter((x) => x !== p) });
      return;
    }
    if (list.length >= MAX_PERSONALITIES) {
      Alert.alert('個性最多 4 個');
      return;
    }
    updateDog({ personalities: [...list, p] });
  };

  const addCustomPersonality = () => {
    const p = personalityDraft.trim().slice(0, MAX_PERSONALITY_LEN);
    if (!p) return;
    const list = dog.personalities || [];
    if (list.includes(p)) {
      Alert.alert('已有這個標籤');
      return;
    }
    if (list.length >= MAX_PERSONALITIES) {
      Alert.alert('個性最多 4 個');
      return;
    }
    updateDog({ personalities: [...list, p] });
    setPersonalityDraft('');
  };

  const customPersonalities = (dog?.personalities || []).filter(
    (p) => !PERSONALITIES.includes(p),
  );

  const toggleSlot = (day, slot) => {
    const i = slots.findIndex((s) => s.day === day && s.slot === slot);
    if (i >= 0) {
      setSlots(slots.filter((_, idx) => idx !== i));
      return;
    }
    if (slots.length >= MAX_SLOTS) {
      Alert.alert('時段最多 3 個');
      return;
    }
    const next = { day, slot };
    setSlots([...slots, { ...next, label: slotLabel(next) }]);
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('需要相簿權限', '大頭貼必須是主人與狗的合照。');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      updateDog({ photoUri: res.assets[0].uri, photoOk: true });
    }
  };

  const addDog = () => {
    if (dogs.length >= MAX_DOGS) {
      Alert.alert('最多 3 隻狗');
      return;
    }
    setDogs([...dogs, emptyDog()]);
    setDogIndex(dogs.length);
  };

  const removeDog = () => {
    if (dogs.length <= 1) {
      Alert.alert('至少要有一隻狗');
      return;
    }
    Alert.alert('移除這隻狗？', dog.dogName || '未命名', [
      { text: '取消', style: 'cancel' },
      {
        text: '移除',
        style: 'destructive',
        onPress: () => {
          const next = dogs.filter((_, i) => i !== dogIndex);
          setDogs(next);
          setDogIndex(Math.max(0, dogIndex - 1));
        },
      },
    ]);
  };

  const save = () => {
    for (const d of dogs) {
      if (!d.dogName.trim()) {
        Alert.alert('請填狗名', '每隻狗都要有名字。');
        return;
      }
      if (!d.photoUri && !d.photoOk) {
        Alert.alert('請上傳合照', `「${d.dogName}」需要主人與狗都入鏡的合照。`);
        return;
      }
    }
    if (!city) {
      Alert.alert('請選手選縣市');
      return;
    }
    if (!district) {
      Alert.alert('請選行政區');
      return;
    }
    onSave(
      normalizeProfile({
        ownerNick: ownerNick.trim(),
        slots,
        places,
        district,
        city,
        dogs: dogs.map((d) =>
          emptyDog({
            ...d,
            dogName: d.dogName.trim(),
            breed: (d.breed || '').trim(),
            intro: (d.intro || '').trim().slice(0, MAX_INTRO),
            photoOk: Boolean(d.photoUri) || Boolean(d.photoOk),
          }),
        ),
        outingCount: initial?.outingCount || 0,
        connectCount: initial?.connectCount || 0,
        captainCount: initial?.captainCount || 0,
        memberCount: initial?.memberCount || 0,
        captainScore: initial?.captainScore || 0,
        registeredAt: initial?.registeredAt || new Date().toISOString(),
      }),
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets={false}
        contentContainerStyle={[
          styles.pad,
          { paddingTop: insets.top + 8, paddingBottom: 48 },
        ]}
      >
        {registerMode ? null : (
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.back}>← 返回</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.h}>{registerMode ? '免費註冊' : '汪汪檔案'}</Text>
        {registerMode ? (
          <Text style={styles.hint}>
            填手機號的同時必須建立汪汪檔案，才算完成註冊。可新增最多 {MAX_DOGS}{' '}
            隻狗。
          </Text>
        ) : (
          <View style={{ height: 12 }} />
        )}

        <AwareTextInput
          style={styles.input}
          placeholder="主人暱稱（選填）"
          value={ownerNick}
          onChangeText={setOwnerNick}
          scrollOnFocus={onInputFocus}
          scrollOnBlur={onInputBlur}
        />

        <Text style={styles.k}>縣市（手選）</Text>
        <DropdownSelect
          value={city}
          options={taiwanCityPickOptions()}
          onChange={setCity}
          placeholder="請選縣市"
        />
        <View style={{ height: 8 }} />

        <Text style={styles.k}>行政區</Text>
        {loadingTowns ? (
          <ActivityIndicator color={colors.brand} style={{ marginVertical: 8 }} />
        ) : (
          <View style={styles.wrap}>
            {districtList.map((d) => (
              <Chip
                key={d}
                label={d}
                selected={district === d}
                onPress={() => setDistrict(d)}
              />
            ))}
          </View>
        )}

        <Text style={styles.k}>時段（最多 3，全家共用）</Text>
        {DAY_TYPES.map((d) => (
          <View key={d.id} style={{ marginBottom: 6 }}>
            <Text style={styles.subk}>{d.label}</Text>
            <View style={styles.wrap}>
              {TIME_SLOTS.map((t) => (
                <Chip
                  key={t.id}
                  label={t.label}
                  selected={slots.some((s) => s.day === d.id && s.slot === t.id)}
                  onPress={() => toggleSlot(d.id, t.id)}
                />
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.k}>地點（最多 3，全家共用）</Text>
        <View style={styles.addRow}>
          <AwareTextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="例如 中央公園"
            value={placeDraft}
            onChangeText={setPlaceDraft}
            scrollOnFocus={onInputFocus}
            scrollOnBlur={onInputBlur}
          />
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              const p = placeDraft.trim();
              if (!p) return;
              if (places.length >= MAX_PLACES) {
                Alert.alert('地點最多 3 個');
                return;
              }
              if (!places.includes(p)) setPlaces([...places, p]);
              setPlaceDraft('');
            }}
          >
            <Text style={styles.addTxt}>加入</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.wrap}>
          {places.map((p) => (
            <Chip
              key={p}
              label={`${p} ×`}
              selected
              onPress={() => setPlaces(places.filter((x) => x !== p))}
            />
          ))}
        </View>

        <Text style={styles.k}>我的汪汪（{dogs.length}/{MAX_DOGS}）</Text>
        <View style={styles.wrap}>
          {dogs.map((d, i) => (
            <Chip
              key={d.id}
              label={d.dogName || `狗 ${i + 1}`}
              selected={dogIndex === i}
              onPress={() => setDogIndex(i)}
            />
          ))}
          {dogs.length < MAX_DOGS ? (
            <Chip label="+ 新增" selected={false} onPress={addDog} />
          ) : null}
        </View>
        {dogs.length > 1 ? (
          <TouchableOpacity onPress={removeDog}>
            <Text style={styles.removeDog}>移除這隻狗</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.photoWrap}>
          <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
            {dog?.photoUri ? (
              <Image source={{ uri: dog.photoUri }} style={styles.photo} />
            ) : (
              <Text style={styles.photoTxt}>合照</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.photoHint}>上傳主人＋這隻狗的合照</Text>
        </View>

        <AwareTextInput
          style={styles.input}
          placeholder="狗名"
          value={dog?.dogName || ''}
          onChangeText={(t) => updateDog({ dogName: t })}
          scrollOnFocus={onInputFocus}
          scrollOnBlur={onInputBlur}
        />
        <AwareTextInput
          style={[styles.input, styles.intro]}
          placeholder="簡短介紹（50 字內）"
          value={dog?.intro || ''}
          maxLength={MAX_INTRO}
          multiline
          onChangeText={(t) => updateDog({ intro: t.slice(0, MAX_INTRO) })}
          scrollOnFocus={onInputFocus}
          scrollOnBlur={onInputBlur}
        />
        <Text style={styles.count}>
          {(dog?.intro || '').length}/{MAX_INTRO}
        </Text>
        <AwareTextInput
          style={styles.input}
          placeholder="品種／混種"
          value={dog?.breed || ''}
          onChangeText={(t) => updateDog({ breed: t })}
          scrollOnFocus={onInputFocus}
          scrollOnBlur={onInputBlur}
        />

        <Text style={styles.k}>體型</Text>
        <RowChips
          items={SIZES}
          value={dog?.size || '中型'}
          onPick={(v) => updateDog({ size: v })}
        />
        <Text style={styles.k}>年齡</Text>
        <RowChips
          items={AGE_RANGES}
          value={dog?.ageRange || AGE_RANGES[1]}
          onPick={(v) => updateDog({ ageRange: v })}
        />

        <Text style={styles.k}>個性（最多 {MAX_PERSONALITIES}，可自訂）</Text>
        <View style={styles.wrap}>
          {PERSONALITIES.map((p) => (
            <Chip
              key={p}
              label={p}
              selected={(dog?.personalities || []).includes(p)}
              onPress={() => togglePersonality(p)}
            />
          ))}
          {customPersonalities.map((p) => (
            <Chip
              key={p}
              label={`${p} ×`}
              selected
              onPress={() => togglePersonality(p)}
            />
          ))}
        </View>
        <View style={styles.addRow}>
          <AwareTextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="自訂個性（8 字內）"
            value={personalityDraft}
            maxLength={MAX_PERSONALITY_LEN}
            onChangeText={setPersonalityDraft}
            scrollOnFocus={onInputFocus}
            scrollOnBlur={onInputBlur}
          />
          <TouchableOpacity style={styles.addBtn} onPress={addCustomPersonality}>
            <Text style={styles.addTxt}>加入</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.k}>與其他狗</Text>
        <View style={styles.wrap}>
          {PLAY_OPTIONS.map((p) => (
            <Chip
              key={p.id}
              label={p.label}
              selected={(dog?.playWith || 'parallel') === p.id}
              onPress={() => updateDog({ playWith: p.id })}
            />
          ))}
        </View>

        <Text style={styles.k}>可否合照</Text>
        <View style={styles.wrap}>
          <Chip
            label="可以"
            selected={dog?.canPhoto !== false}
            onPress={() => updateDog({ canPhoto: true })}
          />
          <Chip
            label="先不要"
            selected={dog?.canPhoto === false}
            onPress={() => updateDog({ canPhoto: false })}
          />
        </View>

        <TouchableOpacity style={styles.save} onPress={save}>
          <Text style={styles.saveTxt}>
            {registerMode ? '完成註冊' : '儲存檔案'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RowChips({ items, value, onPick }) {
  return (
    <View style={styles.wrap}>
      {items.map((x) => (
        <Chip key={x} label={x} selected={value === x} onPress={() => onPick(x)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { paddingHorizontal: 16 },
  back: { color: colors.brandDeep, fontWeight: '800', marginBottom: 8 },
  h: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 4 },
  hint: {
    marginTop: 6,
    marginBottom: 8,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  photoWrap: { alignItems: 'center', marginTop: 12, marginBottom: 18 },
  photoBtn: {
    width: 108,
    height: 108,
    borderRadius: 24,
    backgroundColor: '#F8EBD8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  photo: { width: 108, height: 108 },
  photoTxt: { fontWeight: '800', color: colors.brandDeep },
  photoHint: { marginTop: 8, fontSize: 12, fontWeight: '700', color: colors.muted },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  intro: { minHeight: 72, textAlignVertical: 'top' },
  count: {
    alignSelf: 'flex-end',
    fontSize: 11,
    color: colors.muted,
    marginTop: -6,
    marginBottom: 8,
  },
  k: { marginTop: 8, marginBottom: 6, fontWeight: '800', color: colors.ink },
  subk: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  addBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  addTxt: { color: '#fff', fontWeight: '800' },
  removeDog: {
    color: colors.danger,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
  },
  save: {
    marginTop: 16,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
