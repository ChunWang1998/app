import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors } from '../theme/useTheme';
import { Mascot } from '../components/Mascot';
import { purchaseProUnlock, restoreProUnlock } from '../lib/iap';
import { isProUnlocked } from '../lib/entitlements';

export default function PaywallScreen() {
  const c = useThemeColors();
  const [pro, setPro] = React.useState(false);
  React.useEffect(() => { isProUnlocked().then(setPro); }, []);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.pwblk, { backgroundColor: c.pwband }]}>
        <View style={{ paddingHorizontal: 28, paddingTop: 22 }}>
          <Mascot size={60} mood="happy" />
          <Text style={[styles.h1, { color: c.label }]}>不只記 3 件事</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 28, paddingTop: 6 }}>
        <Feature icon="∞" title="無限項目" sub="完整版" />
        <Feature icon="▦" title="桌面小工具" sub="v1.1" />
        <Feature icon="☁" title="iCloud 備份" sub="v1.2" />
        <Text style={{ textAlign: 'center', marginTop: 10, color: c.l2 }}>US$2.99 一次買斷</Text>
        <TouchableOpacity onPress={async () => { const r = await purchaseProUnlock(); if (r.ok) setPro(true); }} style={[styles.cta, { backgroundColor: c.brand }]}>
          <Text style={[styles.ctaText, { color: c.onbrand }]}>{pro ? '已解鎖' : '購買'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={async () => { const r = await restoreProUnlock(); if (r.ok) setPro(true); }} style={{ alignItems: 'center', padding: 12 }}>
          <Text style={{ color: c.brand, fontWeight: '700' }}>恢復購買</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Feature({ icon, title, sub }) {
  const c = useThemeColors();
  return (
    <View style={styles.f}>
      <View style={[styles.g, { backgroundColor: c.band }]}><Text style={{ color: c.brand, fontWeight: '700' }}>{icon}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.label, fontWeight: '600', fontSize: 17 }}>{title}</Text>
        <Text style={{ color: c.l2, fontSize: 13 }}>{sub}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pwblk: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingBottom: 12 },
  h1: { fontSize: 34, fontWeight: '700', marginTop: 8, fontFamily: 'Naikai-Bold' },
  f: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14 },
  g: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cta: { marginTop: 8, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 18, fontWeight: '700', fontFamily: 'Naikai-SemiBold' }
});
