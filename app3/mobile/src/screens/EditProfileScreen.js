import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
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
  MAX_INTRO,
  TRIAL_CITIES,
  slotLabel,
} from '../data/constants';
import { fetchDistrictsForCity } from '../lib/districts';
import Chip from '../components/Chip';

export default function EditProfileScreen({
  city,
  districts,
  initial,
  registerMode,
  onBack,
  onSave,
}) {
  const insets = useSafeAreaInsets();
  const [dogName, setDogName] = useState(initial?.dogName || '');
  const [ownerNick, setOwnerNick] = useState(initial?.ownerNick || '');
  const [intro, setIntro] = useState(initial?.intro || '');
  const [breed, setBreed] = useState(initial?.breed || '');
  const [size, setSize] = useState(initial?.size || '中型');
  const [ageRange, setAgeRange] = useState(initial?.ageRange || AGE_RANGES[1]);
  const [personalities, setPersonalities] = useState(initial?.personalities || []);
  const [slots, setSlots] = useState(initial?.slots || []);
  const [places, setPlaces] = useState(initial?.places || []);
  const [placeDraft, setPlaceDraft] = useState('');
  const [cityPick, setCityPick] = useState(initial?.city || city || TRIAL_CITIES[0]);
  const [districtList, setDistrictList] = useState(districts || []);
  const [district, setDistrict] = useState(initial?.district || districts?.[0] || '');
  const [loadingTowns, setLoadingTowns] = useState(false);
  const [playWith, setPlayWith] = useState(initial?.playWith || 'parallel');
  const [photoUri, setPhotoUri] = useState(initial?.photoUri || null);

  useEffect(() => {
    let cancelled = false;
    const loadTowns = async () => {
      if (cityPick === city && districts?.length) {
        setDistrictList(districts);
        if (!districts.includes(district)) setDistrict(districts[0] || '');
        return;
      }
      setLoadingTowns(true);
      try {
        const towns = await fetchDistrictsForCity(cityPick);
        if (cancelled) return;
        setDistrictList(towns);
        setDistrict((prev) => (towns.includes(prev) ? prev : towns[0] || ''));
      } catch {
        if (!cancelled) {
          setDistrictList([]);
          Alert.alert('行政區載入失敗', '請確認網路後再選一次縣市。');
        }
      } finally {
        if (!cancelled) setLoadingTowns(false);
      }
    };
    loadTowns();
    return () => {
      cancelled = true;
    };
  }, [cityPick]);

  const toggle = (arr, setArr, id) => {
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  };

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
      setPhotoUri(res.assets[0].uri);
    }
  };

  const save = () => {
    if (!dogName.trim()) {
      Alert.alert('請填狗名');
      return;
    }
    if (!photoUri && !initial?.photoOk) {
      Alert.alert('請上傳合照', '清單只接受主人與狗都入鏡的合照（示範：選一張照片即可）。');
      return;
    }
    if (!cityPick) {
      Alert.alert('請選縣市');
      return;
    }
    if (!district) {
      Alert.alert('請選行政區');
      return;
    }
    onSave({
      dogName: dogName.trim(),
      ownerNick: ownerNick.trim(),
      intro: intro.trim().slice(0, MAX_INTRO),
      breed: breed.trim(),
      size,
      ageRange,
      personalities,
      slots,
      places,
      district,
      city: cityPick,
      playWith,
      photoUri,
      photoOk: Boolean(photoUri) || initial?.photoOk,
      outingCount: initial?.outingCount || 0,
      connectCount: initial?.connectCount || 0,
      captainCount: initial?.captainCount || 0,
      memberCount: initial?.memberCount || 0,
      captainScore: initial?.captainScore || 0,
      registeredAt: initial?.registeredAt || new Date().toISOString(),
    });
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.pad, { paddingTop: insets.top + 8, paddingBottom: 40 }]}
    >
      {registerMode ? null : (
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>← 返回</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.h}>{registerMode ? '免費註冊' : '汪汪檔案'}</Text>
      {registerMode ? (
        <Text style={styles.hint}>
          填手機號的同時必須建立汪汪檔案，才算完成註冊。
        </Text>
      ) : (
        <View style={{ height: 18 }} />
      )}

      <View style={styles.photoWrap}>
        <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <Text style={styles.photoTxt}>合照</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.photoHint}>上傳主人＋狗合照</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="狗名"
        value={dogName}
        onChangeText={setDogName}
      />
      <TextInput
        style={styles.input}
        placeholder="主人暱稱（選填）"
        value={ownerNick}
        onChangeText={setOwnerNick}
      />
      <TextInput
        style={[styles.input, styles.intro]}
        placeholder="簡短介紹（50 字內）"
        value={intro}
        maxLength={MAX_INTRO}
        multiline
        onChangeText={(t) => setIntro(t.slice(0, MAX_INTRO))}
      />
      <Text style={styles.count}>{intro.length}/{MAX_INTRO}</Text>
      <TextInput
        style={styles.input}
        placeholder="品種／混種"
        value={breed}
        onChangeText={setBreed}
      />

      <Text style={styles.k}>體型</Text>
      <RowChips items={SIZES} value={size} onPick={setSize} />
      <Text style={styles.k}>年齡</Text>
      <RowChips items={AGE_RANGES} value={ageRange} onPick={setAgeRange} />

      <Text style={styles.k}>個性</Text>
      <View style={styles.wrap}>
        {PERSONALITIES.map((p) => (
          <Chip
            key={p}
            label={p}
            selected={personalities.includes(p)}
            onPress={() => toggle(personalities, setPersonalities, p)}
          />
        ))}
      </View>

      <Text style={styles.k}>時段（最多 3）</Text>
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

      <Text style={styles.k}>縣市</Text>
      <View style={styles.wrap}>
        {TRIAL_CITIES.map((c) => (
          <Chip
            key={c}
            label={c}
            selected={cityPick === c}
            onPress={() => setCityPick(c)}
          />
        ))}
      </View>

      <Text style={styles.k}>行政區</Text>
      {loadingTowns ? (
        <ActivityIndicator color={colors.brand} style={{ marginVertical: 8 }} />
      ) : (
        <View style={styles.wrap}>
          {districtList.map((d) => (
            <Chip key={d} label={d} selected={district === d} onPress={() => setDistrict(d)} />
          ))}
        </View>
      )}

      <Text style={styles.k}>地點（最多 3）</Text>
      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          placeholder="例如 中央公園"
          value={placeDraft}
          onChangeText={setPlaceDraft}
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

      <Text style={styles.k}>與其他狗</Text>
      <View style={styles.wrap}>
        {PLAY_OPTIONS.map((p) => (
          <Chip
            key={p.id}
            label={p.label}
            selected={playWith === p.id}
            onPress={() => setPlayWith(p.id)}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.save} onPress={save}>
        <Text style={styles.saveTxt}>{registerMode ? '完成註冊' : '儲存檔案'}</Text>
      </TouchableOpacity>
    </ScrollView>
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
  pad: { paddingHorizontal: 16 },
  back: { color: colors.brandDeep, fontWeight: '800', marginBottom: 8 },
  h: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 4 },
  hint: { marginTop: 6, marginBottom: 8, color: colors.muted, fontSize: 12, lineHeight: 18 },
  photoWrap: { alignItems: 'center', marginTop: 16, marginBottom: 18 },
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
  count: { alignSelf: 'flex-end', fontSize: 11, color: colors.muted, marginTop: -6, marginBottom: 8 },
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
  save: {
    marginTop: 16,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
