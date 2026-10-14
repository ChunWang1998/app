import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivities } from '../data/repository';
import { useThemeColors } from '../theme/useTheme';
import { ChevronLeftIcon } from '../components/Icons';
import { isProUnlocked } from '../lib/entitlements';
import { elapsedMs, formatSpanParts } from '../lib/time';
import ShareCardView from '../share/ShareCardView';
import { SHARE_SIZES, SHARE_STYLES, canUseStyle, styleById } from '../share/config';
import { captureCard } from '../share/capture';
import { cleanupShareFile, shareCardImage } from '../share/shareSheet';

const PREVIEW_W = 220;

export default function ShareCardScreen() {
  const nav = useNavigation();
  const { params } = useRoute();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { activities } = useActivities();
  const item = useMemo(() => activities.find((a) => a.id === params?.id), [activities, params]);
  const cardRef = useRef(null);
  const [hideName, setHideName] = useState(false);
  const [styleId, setStyleId] = useState('cream');
  const [sizeKey, setSizeKey] = useState('story');
  const [pro, setPro] = useState(false);
  const [busy, setBusy] = useState(false);

  React.useEffect(() => { isProUnlocked().then(setPro); }, []);

  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <TouchableOpacity onPress={() => nav.goBack()} style={{ padding: 16 }}>
          <ChevronLeftIcon color={c.label} />
        </TouchableOpacity>
      </View>
    );
  }

  const theme = styleById(styleId);
  const size = SHARE_SIZES[sizeKey];
  const previewH = Math.round(PREVIEW_W / size.ratio);
  const elapsed = elapsedMs(item);
  const part = elapsed == null ? null : formatSpanParts(elapsed, 1)[0];

  async function pickStyle(id) {
    const next = styleById(id);
    if (!canUseStyle(next, pro)) {
      nav.navigate('Paywall');
      return;
    }
    setStyleId(id);
  }

  async function share() {
    if (busy) return;
    if (!canUseStyle(theme, pro)) {
      nav.navigate('Paywall');
      return;
    }
    setBusy(true);
    let uri = null;
    try {
      uri = await captureCard(cardRef, sizeKey);
      await shareCardImage(uri);
    } catch (e) {
      Alert.alert('失敗', String(e?.message || e));
    } finally {
      await cleanupShareFile(uri);
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.sheetbg, paddingTop: insets.top }}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.navBtn} accessibilityLabel="返回">
          <ChevronLeftIcon color={c.brand} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.label }]}>分享卡片</Text>
        <View style={styles.navBtn} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom, alignItems: 'center' }}>
        <View style={{ width: PREVIEW_W, height: previewH, overflow: 'hidden', borderRadius: 20 }}>
          <View
            ref={cardRef}
            collapsable={false}
            style={{ transform: [{ scale: PREVIEW_W / size.width }], transformOrigin: 'top left' }}
          >
            <ShareCardView
              style={theme}
              title={item.title}
              hideName={hideName}
              daysNum={part?.n ?? null}
              daysUnit={part?.unit || '天'}
              icon={item.icon}
              width={size.width}
              height={size.height}
            />
          </View>
        </View>

        <View style={[styles.grp, { backgroundColor: c.cell, marginTop: 22 }]}>
          <View style={styles.row}>
            <Text style={[styles.rowTitle, { color: c.label }]}>隱藏名稱</Text>
            <Switch value={hideName} onValueChange={setHideName} trackColor={{ false: c.fill, true: c.brand }} />
          </View>
        </View>

        <Text style={[styles.sec, { color: c.l2 }]}>樣式</Text>
        <View style={styles.swatches}>
          {SHARE_STYLES.map((s) => {
            const locked = !canUseStyle(s, pro);
            const on = styleId === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => pickStyle(s.id)}
                style={[styles.swatch, { backgroundColor: s.bg, borderColor: on ? c.brand : 'transparent' }]}
                accessibilityLabel={s.name}
              >
                <Text style={{ color: s.ink, fontFamily: 'NaikaiSubset-Regular', fontSize: 13 }}>
                  {s.name}{locked ? ' ·Pro' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sizes}>
          {Object.values(SHARE_SIZES).map((s) => (
            <TouchableOpacity
              key={s.key}
              onPress={() => setSizeKey(s.key)}
              style={[styles.sizeBtn, { backgroundColor: sizeKey === s.key ? c.brand : c.cell }]}
            >
              <Text style={{ color: sizeKey === s.key ? c.onbrand : c.label, fontFamily: 'NaikaiSubset-SemiBold' }}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={share}
          disabled={busy}
          style={[styles.cta, { backgroundColor: c.brand, opacity: busy ? 0.7 : 1 }]}
          accessibilityLabel="分享"
        >
          {busy ? <ActivityIndicator color={c.onbrand} /> : (
            <Text style={{ color: c.onbrand, fontFamily: 'NaikaiSubset-SemiBold', fontSize: 18 }}>分享</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'NaikaiSubset-SemiBold', fontSize: 17 },
  grp: { width: 320, borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingHorizontal: 16 },
  rowTitle: { flex: 1, fontSize: 17, fontFamily: 'NaikaiSubset-Regular' },
  sec: { alignSelf: 'flex-start', marginLeft: 36, marginTop: 18, marginBottom: 8, fontFamily: 'NaikaiSubset-Regular' },
  swatches: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  swatch: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 2 },
  sizes: { flexDirection: 'row', gap: 10, marginTop: 18 },
  sizeBtn: { paddingHorizontal: 18, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cta: {
    marginTop: 22,
    height: 56,
    paddingHorizontal: 40,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
