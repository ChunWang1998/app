import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme/useTheme';
import { restoreProUnlock } from '../lib/iap';
import { isProUnlocked } from '../lib/entitlements';
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon, RestoreIcon, MailIcon, LockIcon } from '../components/Icons';

const PRIVACY_URL = 'https://chunwang1998.github.io/app/app3/store/privacy.html';
const SUPPORT_URL = 'https://chunwang1998.github.io/app/app3/store/support.html';

function Sq({ bg, children }) {
  return <View style={[styles.sq, { backgroundColor: bg }]}>{children}</View>;
}

export default function SettingsScreen() {
  const c = useThemeColors();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const [pro, setPro] = React.useState(false);
  React.useEffect(() => { isProUnlocked().then(setPro); }, []);

  async function restore() {
    const r = await restoreProUnlock();
    if (r.ok && r.restored !== false) {
      setPro(true);
      return;
    }
    if (r.ok && r.restored === false) {
      Alert.alert('恢復購買', '找不到已購買紀錄');
    }
  }

  function open(url) {
    Linking.openURL(url).catch(() => {});
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.set, paddingTop: insets.top }}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.navBtn} accessibilityLabel="返回">
          <ChevronLeftIcon color={c.brand} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.label }]}>設定</Text>
        <View style={styles.navBtn} />
      </View>
      <View style={{ paddingTop: 12 }}>
        <View style={[styles.grp, { backgroundColor: c.cell }]}>
          <Row
            icon={<Sq bg={c.brand}><CheckIcon color="#fff" size={15} /></Sq>}
            title="完整版"
            value={pro ? '已解鎖' : ''}
            onPress={() => nav.navigate('Paywall')}
            chev
            c={c}
          />
          <Row
            icon={<Sq bg="#8E8E93"><RestoreIcon color="#fff" size={15} /></Sq>}
            title="恢復購買"
            onPress={restore}
            c={c}
            last
          />
        </View>
        <View style={[styles.grp, { backgroundColor: c.cell, marginTop: 32 }]}>
          <Row
            icon={<Sq bg="#30B0C7"><MailIcon color="#fff" size={16} /></Sq>}
            title="支援"
            onPress={() => open(SUPPORT_URL)}
            chev
            c={c}
          />
          <Row
            icon={<Sq bg="#8E8E93"><LockIcon color="#fff" size={15} /></Sq>}
            title="隱私權政策"
            onPress={() => open(PRIVACY_URL)}
            chev
            c={c}
            last
          />
        </View>
        <Text style={{ textAlign: 'center', marginTop: 28, color: c.l3, fontSize: 13, fontFamily: 'NaikaiSubset-Regular' }}>
          Been Ages 1.0
        </Text>
      </View>
    </View>
  );
}

function Row({ icon, title, value, onPress, chev, c, last }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.row, !last && styles.rowLine]} activeOpacity={0.6}>
      {icon}
      <Text style={[styles.rowTitle, { color: c.label }]}>{title}</Text>
      {value ? <Text style={[styles.rowVal, { color: c.l2 }]}>{value}</Text> : null}
      {chev ? <ChevronRightIcon color={c.l3} /> : null}
    </TouchableOpacity>
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
  grp: { marginHorizontal: 16, borderRadius: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingHorizontal: 16, gap: 12 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(46,41,37,0.09)' },
  rowTitle: { fontSize: 17, fontFamily: 'NaikaiSubset-Regular', flex: 1 },
  rowVal: { fontSize: 17, fontFamily: 'NaikaiSubset-Regular', marginRight: 8 },
  sq: { width: 29, height: 29, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
});
