import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePrefs } from '../context/AppPrefs';
import { radius } from '../theme';
import {
  GATHERING_TYPES,
  GATHERING_FEE_PRESETS,
  GATHERING_CAPACITY_PRESETS,
  DEFAULT_GATHERING_CAPACITY,
  MAX_GATHERING_NAME,
  MAX_GATHERING_INTRO,
  TAIWAN_CITIES,
  taiwanCityPickOptions,
  formatGatheringDate,
  startOfDay,
} from '../data/constants';
import Chip from '../components/Chip';
import DropdownSelect from '../components/DropdownSelect';
import { AwareTextInput, useKeyboardAwareScroll } from '../lib/keyboard';

function offsetDate(n) {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + n);
  return d;
}

export default function CreateGatheringScreen({ onBack, onSave, defaultCity }) {
  const insets = useSafeAreaInsets();
  const { colors } = usePrefs();
  const { scrollRef, onScroll, onInputFocus, onInputBlur } =
    useKeyboardAwareScroll();
  const [name, setName] = useState('');
  const [place, setPlace] = useState('');
  const [city, setCity] = useState(defaultCity || TAIWAN_CITIES[0]);
  const [type, setType] = useState(GATHERING_TYPES[2]);
  const [fee, setFee] = useState(0);
  const [customFee, setCustomFee] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [intro, setIntro] = useState('');
  const [lineGroupUrl, setLineGroupUrl] = useState('');
  const [date, setDate] = useState(offsetDate(1));
  const [capacity, setCapacity] = useState(DEFAULT_GATHERING_CAPACITY);

  const presets = [
    { label: '明天', d: offsetDate(1) },
    { label: '後天', d: offsetDate(2) },
    { label: '三天後', d: offsetDate(3) },
    { label: '四天後', d: offsetDate(4) },
    { label: '五天後', d: offsetDate(5) },
    { label: '六天後', d: offsetDate(6) },
    { label: '一週後', d: offsetDate(7) },
  ];

  const inputStyle = [
    styles.input,
    {
      borderColor: colors.line,
      backgroundColor: colors.card,
      color: colors.ink,
    },
  ];

  const save = () => {
    const feeNum = useCustom ? Number(customFee) : fee;
    if (!name.trim()) {
      Alert.alert('請填名字', '聚會名字 10 字內。');
      return;
    }
    if (!place.trim()) {
      Alert.alert('請填地點');
      return;
    }
    if (!city) {
      Alert.alert('請選縣市');
      return;
    }
    if (!lineGroupUrl.trim()) {
      Alert.alert('請附上 LINE 群組連結');
      return;
    }
    if (useCustom && (!Number.isFinite(feeNum) || feeNum < 0)) {
      Alert.alert('請填正確收費');
      return;
    }
    onSave({
      name: name.trim().slice(0, MAX_GATHERING_NAME),
      place: place.trim(),
      city,
      type,
      fee: feeNum,
      intro: intro.trim().slice(0, MAX_GATHERING_INTRO),
      lineGroupUrl: lineGroupUrl.trim(),
      dateISO: date.toISOString(),
      capacity,
    });
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
        contentContainerStyle={[
          styles.pad,
          { paddingTop: insets.top + 8, paddingBottom: 48 },
        ]}
      >
        <TouchableOpacity onPress={onBack}>
          <Text style={[styles.back, { color: colors.brandDeep }]}>← 返回</Text>
        </TouchableOpacity>
        <Text style={[styles.h, { color: colors.ink }]}>創辦汪汪聚會</Text>
        <Text style={[styles.hint, { color: colors.muted }]}>
          必須附上 LINE 群組連結。收費由主辦者依活動類型決定，平台不經手。
        </Text>

        <Text style={[styles.k, { color: colors.ink }]}>名字（10 字內）</Text>
        <AwareTextInput
          style={inputStyle}
          value={name}
          maxLength={MAX_GATHERING_NAME}
          placeholder="例如 左營野餐"
          placeholderTextColor={colors.muted}
          onChangeText={(t) => setName(t.slice(0, MAX_GATHERING_NAME))}
          scrollOnFocus={onInputFocus}
          scrollOnBlur={onInputBlur}
        />
        <Text style={[styles.count, { color: colors.muted }]}>
          {name.length}/{MAX_GATHERING_NAME}
        </Text>

        <Text style={[styles.k, { color: colors.ink }]}>日期</Text>
        <View style={styles.wrap}>
          {presets.map((p) => (
            <Chip
              key={p.label}
              label={`${p.label} ${formatGatheringDate(p.d)}`}
              selected={startOfDay(date).getTime() === p.d.getTime()}
              onPress={() => setDate(p.d)}
            />
          ))}
        </View>
        <Text style={[styles.picked, { color: colors.muted }]}>
          已選 {formatGatheringDate(date)}
        </Text>

        <Text style={[styles.k, { color: colors.ink }]}>縣市</Text>
        <DropdownSelect
          value={city}
          options={taiwanCityPickOptions()}
          onChange={setCity}
          placeholder="請選縣市"
        />
        <View style={{ height: 8 }} />

        <Text style={[styles.k, { color: colors.ink }]}>地點</Text>
        <AwareTextInput
          style={inputStyle}
          value={place}
          placeholder="公園、餐廳或步道名稱"
          placeholderTextColor={colors.muted}
          onChangeText={setPlace}
          scrollOnFocus={onInputFocus}
          scrollOnBlur={onInputBlur}
        />

        <Text style={[styles.k, { color: colors.ink }]}>類型</Text>
        <View style={styles.wrap}>
          {GATHERING_TYPES.map((t) => (
            <Chip key={t} label={t} selected={type === t} onPress={() => setType(t)} />
          ))}
        </View>

        <Text style={[styles.k, { color: colors.ink }]}>收費（請依活動類型決定）</Text>
        <View style={styles.wrap}>
          {GATHERING_FEE_PRESETS.map((n) => (
            <Chip
              key={n}
              label={n === 0 ? '免費 0' : String(n)}
              selected={!useCustom && fee === n}
              onPress={() => {
                setUseCustom(false);
                setFee(n);
              }}
            />
          ))}
          <Chip
            label="自訂"
            selected={useCustom}
            onPress={() => setUseCustom(true)}
          />
        </View>
        {useCustom ? (
          <AwareTextInput
            style={inputStyle}
            keyboardType="number-pad"
            placeholder="自訂金額"
            placeholderTextColor={colors.muted}
            value={customFee}
            onChangeText={setCustomFee}
            scrollOnFocus={onInputFocus}
            scrollOnBlur={onInputBlur}
          />
        ) : null}

        <Text style={[styles.k, { color: colors.ink }]}>人數上限</Text>
        <View style={styles.wrap}>
          {GATHERING_CAPACITY_PRESETS.map((n) => (
            <Chip
              key={n}
              label={`${n} 人`}
              selected={capacity === n}
              onPress={() => setCapacity(n)}
            />
          ))}
        </View>

        <Text style={[styles.k, { color: colors.ink }]}>簡介（50 字內）</Text>
        <AwareTextInput
          style={[...inputStyle, styles.intro]}
          value={intro}
          maxLength={MAX_GATHERING_INTRO}
          multiline
          placeholder="活動怎麼走、集合注意事項"
          placeholderTextColor={colors.muted}
          onChangeText={(t) => setIntro(t.slice(0, MAX_GATHERING_INTRO))}
          scrollOnFocus={onInputFocus}
          scrollOnBlur={onInputBlur}
        />
        <Text style={[styles.count, { color: colors.muted }]}>
          {intro.length}/{MAX_GATHERING_INTRO}
        </Text>

        <Text style={[styles.k, { color: colors.ink }]}>LINE 群組連結（必填）</Text>
        <AwareTextInput
          style={inputStyle}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="https://line.me/ti/g/…"
          placeholderTextColor={colors.muted}
          value={lineGroupUrl}
          onChangeText={setLineGroupUrl}
          scrollOnFocus={onInputFocus}
          scrollOnBlur={onInputBlur}
        />
        {lineGroupUrl.trim() ? (
          <TouchableOpacity
            onPress={() => Linking.openURL(lineGroupUrl.trim()).catch(() => {})}
          >
            <Text style={[styles.link, { color: colors.brandDeep }]}>預覽連結</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.save, { backgroundColor: colors.brand }]}
          onPress={save}
        >
          <Text style={styles.saveTxt}>建立聚會</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { paddingHorizontal: 16 },
  back: { fontWeight: '800', marginBottom: 8 },
  h: { fontSize: 24, fontWeight: '800' },
  hint: {
    marginTop: 6,
    marginBottom: 8,
    fontSize: 12,
    lineHeight: 18,
  },
  k: { marginTop: 8, marginBottom: 6, fontWeight: '800' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  picked: { fontSize: 12, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },
  intro: { minHeight: 72, textAlignVertical: 'top' },
  count: {
    alignSelf: 'flex-end',
    fontSize: 11,
    marginBottom: 8,
  },
  link: { fontWeight: '800', marginBottom: 8 },
  save: {
    marginTop: 12,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
