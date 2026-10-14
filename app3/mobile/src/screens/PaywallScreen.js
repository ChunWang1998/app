import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme/useTheme';
import { Mascot } from '../components/Mascot';
import { ChevronLeftIcon, InfinityIcon, GridIcon, ShareIcon } from '../components/Icons';
import { purchaseProUnlock, restoreProUnlock, getProDisplayPrice } from '../lib/iap';
import { isProUnlocked } from '../lib/entitlements';
import { FREE_ACTIVITY_LIMIT } from '../data/repository';
import { t } from '../i18n';

export default function PaywallScreen() {
  const c = useThemeColors();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const [pro, setPro] = React.useState(false);
  const [price, setPrice] = React.useState(null);
  const [priceReady, setPriceReady] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const loadPrice = React.useCallback(async () => {
    setPriceReady(false);
    try {
      const p = await getProDisplayPrice();
      setPrice(p);
    } catch {
      setPrice(null);
    } finally {
      setPriceReady(true);
    }
  }, []);

  React.useEffect(() => {
    isProUnlocked().then(setPro);
    loadPrice();
  }, [loadPrice]);

  async function buy() {
    if (busy || pro) return;
    setBusy(true);
    try {
      const r = await purchaseProUnlock();
      if (r.ok) {
        setPro(true);
        return;
      }
      if (!r.cancelled && r.error) {
        Alert.alert(t('common.fail'), r.error);
      }
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await restoreProUnlock();
      if (r.ok && r.restored !== false) {
        setPro(true);
        return;
      }
      if (r.error) {
        Alert.alert(t('common.fail'), r.error);
        return;
      }
      if (r.ok && r.restored === false) {
        Alert.alert(t('settings.restore'), t('iap.nothingToRestore'));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.pwblk, { backgroundColor: c.pwband, paddingTop: insets.top }]}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.navBtn} accessibilityLabel={t('common.back')}>
            <ChevronLeftIcon color={c.brand} />
          </TouchableOpacity>
          <View style={styles.navBtn} />
        </View>
        <View style={styles.heroArt}>
          <Mascot size={96} mood="happy" />
        </View>
      </View>
      <View style={styles.pw}>
        <Text style={[styles.h1, { color: c.label }]}>{t('paywall.headline')}</Text>
        <View style={{ marginTop: 32 }}>
          <Feature
            icon={<InfinityIcon color={c.brand} size={22} />}
            title={t('paywall.unlimited')}
            sub={t('paywall.unlimitedSub', { n: FREE_ACTIVITY_LIMIT })}
          />
          <Feature
            icon={<GridIcon color={c.brand} size={20} />}
            title={t('paywall.widgets')}
            sub={t('paywall.widgetsSub')}
          />
          <Feature
            icon={<ShareIcon color={c.brand} size={20} />}
            title={t('paywall.share')}
            sub={t('paywall.shareSub')}
          />
        </View>
      </View>
      <View style={[styles.bottom, { paddingBottom: 34 + insets.bottom }]}>
        {priceReady ? (
          price ? (
            <Text style={[styles.price, { color: c.label }]}>{price}</Text>
          ) : (
            <TouchableOpacity onPress={loadPrice} style={styles.retry} accessibilityLabel={t('common.retry')}>
              <Text style={[styles.priceFail, { color: c.label }]}>{t('paywall.priceFail')}</Text>
              <Text style={{ color: c.brand, fontSize: 15, fontFamily: 'NaikaiSubset-SemiBold', marginTop: 4 }}>{t('common.retry')}</Text>
            </TouchableOpacity>
          )
        ) : (
          <ActivityIndicator color={c.brand} />
        )}
        <Text style={[styles.once, { color: c.l2 }]}>{t('paywall.once')}</Text>
        <TouchableOpacity
          onPress={buy}
          disabled={busy || pro}
          style={[styles.cta, { backgroundColor: c.brand, opacity: busy ? 0.7 : 1 }]}
        >
          <Text style={[styles.ctaText, { color: c.onbrand }]}>{pro ? t('common.unlocked') : t('paywall.buy')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={restore} disabled={busy} style={{ alignItems: 'center', padding: 16 }}>
          <Text style={{ color: c.brand, fontSize: 15, fontFamily: 'NaikaiSubset-Regular' }}>{t('settings.restore')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Feature({ icon, title, sub }) {
  const c = useThemeColors();
  return (
    <View style={styles.f}>
      <View style={[styles.g, { backgroundColor: c.band }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.label, fontFamily: 'NaikaiSubset-SemiBold', fontSize: 17 }}>{title}</Text>
        <Text style={{ color: c.l2, fontSize: 13, fontFamily: 'NaikaiSubset-Regular', marginTop: 1 }}>{sub}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pwblk: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingBottom: 18 },
  nav: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heroArt: { alignItems: 'center', paddingBottom: 8 },
  pw: { paddingHorizontal: 28, paddingTop: 24 },
  h1: { fontSize: 34, fontFamily: 'NaikaiSubset-Bold', lineHeight: 44 },
  f: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14 },
  g: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bottom: { marginTop: 'auto', paddingHorizontal: 20 },
  price: { textAlign: 'center', fontFamily: 'NaikaiSubset-SemiBold', fontSize: 34 },
  priceFail: { textAlign: 'center', fontFamily: 'NaikaiSubset-SemiBold', fontSize: 20 },
  retry: { alignItems: 'center', paddingVertical: 4 },
  once: { textAlign: 'center', fontSize: 13, marginTop: 2, fontFamily: 'NaikaiSubset-Regular' },
  cta: { marginTop: 18, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 18, fontFamily: 'NaikaiSubset-SemiBold' },
});
