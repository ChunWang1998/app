import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert, Switch, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors, useTheme } from '../theme/useTheme';
import { restoreProUnlock } from '../lib/iap';
import { isProUnlocked } from '../lib/entitlements';
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon, RestoreIcon, MailIcon, LockIcon, PaintIcon, ClockIcon } from '../components/Icons';

const PRIVACY_URL = 'https://chunwang1998.github.io/app/app3/store/privacy.html';
const SUPPORT_URL = 'https://chunwang1998.github.io/app/app3/store/support.html';

const APPEARANCE_LABEL = { auto: '自動', light: '淺色', dark: '深色' };
const APPEARANCE_ORDER = ['auto', 'light', 'dark'];
const TIMES = ['08:00', '09:00', '10:00', '18:00', '21:00'];

function Sq({ bg, children }) {
  return <View style={[styles.sq, { backgroundColor: bg }]}>{children}</View>;
}

export default function SettingsScreen() {
  const c = useThemeColors();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { appearance, setAppearance, preciseTime, setPreciseTime, reminderTime, setReminderTime } = useTheme();
  const [pro, setPro] = React.useState(false);
  React.useEffect(() => { isProUnlocked().then(setPro); }, []);

  async function restore() {
    const r = await restoreProUnlock();
    if (r.ok && r.restored !== false) {
      setPro(true);
      return;
    }
    if (r.error) {
      Alert.alert('失敗', r.error);
      return;
    }
    if (r.ok && r.restored === false) {
      Alert.alert('恢復購買', '找不到已購買紀錄');
    }
  }

  function open(url) {
    Linking.openURL(url).catch(() => {});
  }

  function cycleAppearance() {
    const i = APPEARANCE_ORDER.indexOf(appearance);
    setAppearance(APPEARANCE_ORDER[(i + 1) % APPEARANCE_ORDER.length]);
  }

  function cycleTime() {
    const i = TIMES.indexOf(reminderTime);
    setReminderTime(TIMES[(i + 1) % TIMES.length]);
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
      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
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

        <Text style={[styles.sec, { color: c.label }]}>顯示</Text>
        <View style={[styles.grp, { backgroundColor: c.cell }]}>
          <Row
            icon={<Sq bg="#5856D6"><PaintIcon color="#fff" size={15} /></Sq>}
            title="外觀"
            value={APPEARANCE_LABEL[appearance] || '自動'}
            onPress={cycleAppearance}
            chev
            c={c}
          />
          <Row
            icon={<Sq bg="#007AFF"><ClockIcon color="#fff" size={15} /></Sq>}
            title="精確時間"
            right={(
              <Switch
                value={preciseTime}
                onValueChange={setPreciseTime}
                trackColor={{ false: c.fill, true: c.brand }}
              />
            )}
            c={c}
          />
          <Row
            icon={<Sq bg="#FF9500"><ClockIcon color="#fff" size={15} /></Sq>}
            title="提醒時間"
            value={reminderTime}
            onPress={cycleTime}
            chev
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
          Been Ages 1.1
        </Text>
      </ScrollView>
    </View>
  );
}

function Row({ icon, title, value, onPress, chev, c, last, right }) {
  const inner = (
    <>
      {icon}
      <Text style={[styles.rowTitle, { color: c.label }]}>{title}</Text>
      {value ? <Text style={[styles.rowVal, { color: c.l2 }]}>{value}</Text> : null}
      {right || null}
      {chev ? <ChevronRightIcon color={c.l3} /> : null}
    </>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={[styles.row, !last && styles.rowLine]} activeOpacity={0.6}>
        {inner}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.row, !last && styles.rowLine]}>{inner}</View>;
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
  sec: { fontSize: 20, fontFamily: 'NaikaiSubset-Bold', paddingTop: 28, paddingHorizontal: 20, paddingBottom: 8 },
  grp: { marginHorizontal: 16, borderRadius: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingHorizontal: 16, gap: 12 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(46,41,37,0.09)' },
  rowTitle: { fontSize: 17, fontFamily: 'NaikaiSubset-Regular', flex: 1 },
  rowVal: { fontSize: 17, fontFamily: 'NaikaiSubset-Regular', marginRight: 8 },
  sq: { width: 29, height: 29, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
});
