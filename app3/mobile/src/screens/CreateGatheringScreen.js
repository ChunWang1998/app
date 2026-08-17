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
import { colors, radius } from '../theme';
import {
  GATHERING_TYPES,
  GATHERING_FEE_PRESETS,
  GATHERING_CAPACITY_PRESETS,
  DEFAULT_GATHERING_CAPACITY,
  MAX_GATHERING_NAME,
  MAX_GATHERING_INTRO,
  formatGatheringDate,
  startOfDay,
} from '../data/constants';
import Chip from '../components/Chip';
import { AwareTextInput, useKeyboardAwareScroll } from '../lib/keyboard';

function offsetDate(n) {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + n);
  return d;
}

export default function CreateGatheringScreen({ onBack, onSave }) {
  const insets = useSafeAreaInsets();
  const { scrollRef, onScroll, onInputFocus, onInputBlur } =
    useKeyboardAwareScroll();
  const [name, setName] = useState('');
  const [place, setPlace] = useState('');
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
        <Text style={styles.back}>← 返回</Text>
      </TouchableOpacity>
      <Text style={styles.h}>創辦汪汪聚會</Text>
      <Text style={styles.hint}>
        必須附上 LINE 群組連結。收費由主辦者依活動類型決定，平台不經手。
      </Text>

      <Text style={styles.k}>名字（10 字內）</Text>
      <AwareTextInput
        style={styles.input}
        value={name}
        maxLength={MAX_GATHERING_NAME}
        placeholder="例如 左營野餐"
        onChangeText={(t) => setName(t.slice(0, MAX_GATHERING_NAME))}
        scrollOnFocus={onInputFocus}
        scrollOnBlur={onInputBlur}
      />
      <Text style={styles.count}>
        {name.length}/{MAX_GATHERING_NAME}
      </Text>

      <Text style={styles.k}>日期</Text>
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
      <Text style={styles.picked}>已選 {formatGatheringDate(date)}</Text>

      <Text style={styles.k}>地點</Text>
      <AwareTextInput
        style={styles.input}
        value={place}
        placeholder="公園、餐廳或步道名稱"
        onChangeText={setPlace}
        scrollOnFocus={onInputFocus}
        scrollOnBlur={onInputBlur}
      />

      <Text style={styles.k}>類型</Text>
      <View style={styles.wrap}>
        {GATHERING_TYPES.map((t) => (
          <Chip key={t} label={t} selected={type === t} onPress={() => setType(t)} />
        ))}
      </View>

      <Text style={styles.k}>收費（請依活動類型決定）</Text>
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
          style={styles.input}
          keyboardType="number-pad"
          placeholder="自訂金額"
          value={customFee}
          onChangeText={setCustomFee}
          scrollOnFocus={onInputFocus}
          scrollOnBlur={onInputBlur}
        />
      ) : null}

      <Text style={styles.k}>人數上限</Text>
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

      <Text style={styles.k}>簡介（50 字內）</Text>
      <AwareTextInput
        style={[styles.input, styles.intro]}
        value={intro}
        maxLength={MAX_GATHERING_INTRO}
        multiline
        placeholder="活動怎麼走、集合注意事項"
        onChangeText={(t) => setIntro(t.slice(0, MAX_GATHERING_INTRO))}
        scrollOnFocus={onInputFocus}
        scrollOnBlur={onInputBlur}
      />
      <Text style={styles.count}>
        {intro.length}/{MAX_GATHERING_INTRO}
      </Text>

      <Text style={styles.k}>LINE 群組連結（必填）</Text>
      <AwareTextInput
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="https://line.me/ti/g/…"
        value={lineGroupUrl}
        onChangeText={setLineGroupUrl}
        scrollOnFocus={onInputFocus}
        scrollOnBlur={onInputBlur}
      />
      {lineGroupUrl.trim() ? (
        <TouchableOpacity onPress={() => Linking.openURL(lineGroupUrl.trim()).catch(() => {})}>
          <Text style={styles.link}>預覽連結</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.save} onPress={save}>
        <Text style={styles.saveTxt}>建立聚會</Text>
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { paddingHorizontal: 16 },
  back: { color: colors.brandDeep, fontWeight: '800', marginBottom: 8 },
  h: { fontSize: 24, fontWeight: '800', color: colors.ink },
  hint: {
    marginTop: 6,
    marginBottom: 8,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  k: { marginTop: 8, marginBottom: 6, fontWeight: '800', color: colors.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  picked: { fontSize: 12, color: colors.muted, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    backgroundColor: '#fff',
  },
  intro: { minHeight: 72, textAlignVertical: 'top' },
  count: {
    alignSelf: 'flex-end',
    fontSize: 11,
    color: colors.muted,
    marginBottom: 8,
  },
  link: { color: colors.brandDeep, fontWeight: '800', marginBottom: 8 },
  save: {
    marginTop: 12,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
