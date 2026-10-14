import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert, Switch, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors, useTheme } from '../theme/useTheme';
import { restoreProUnlock } from '../lib/iap';
import { isProUnlocked } from '../lib/entitlements';
import { getPrefs, subscribePrefs, updatePrefs } from '../data/prefs';
import { exportToJson, exportToCsv, importFromJson, getRecentlyDeleted, subscribe, refreshReminders } from '../data/repository';
import { exportFileName } from '../data/csv';
import { finiteSize, importSizeError, utf8ByteLength } from '../data/importLimit';
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon, RestoreIcon, MailIcon, LockIcon, GridIcon, PaintIcon, ClockIcon, BellIcon } from '../components/Icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { t } from '../i18n';

const PRIVACY_URL = 'https://chunwang1998.github.io/app/app3/store/privacy.html';
const SUPPORT_URL = 'https://chunwang1998.github.io/app/app3/store/support.html';

const APPEARANCE_ORDER = ['auto', 'light', 'dark'];
const TIMES = ['08:00', '09:00', '10:00', '18:00', '21:00'];
const APPEARANCE_KEYS = { auto: 'settings.appearanceAuto', light: 'settings.appearanceLight', dark: 'settings.appearanceDark' };

function Sq({ bg, children }) {
  return <View style={[styles.sq, { backgroundColor: bg }]}>{children}</View>;
}

export default function SettingsScreen() {
  const c = useThemeColors();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const {
    appearance, setAppearance, preciseTime, setPreciseTime,
    reminderTime, setReminderTime,
    showNameInNotifications, setShowNameInNotifications,
  } = useTheme();
  const [pro, setPro] = React.useState(false);
  const [hideName, setHideName] = React.useState(() => !!getPrefs().hideName);
  const [trash, setTrash] = React.useState(() => getRecentlyDeleted().length);
  React.useEffect(() => { isProUnlocked().then(setPro); }, []);
  React.useEffect(() => subscribePrefs((p) => setHideName(!!p.hideName)), []);
  React.useEffect(() => subscribe(() => setTrash(getRecentlyDeleted().length)), []);

  async function restore() {
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

  async function shareExport(kind) {
    const body = kind === 'csv' ? await exportToCsv() : JSON.stringify(await exportToJson(), null, 2);
    const name = exportFileName(kind);
    const mime = kind === 'csv' ? 'text/csv' : 'application/json';
    const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    const path = `${dir}${name}`;
    try {
      await FileSystem.writeAsStringAsync(path, body);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: mime, dialogTitle: t('settings.export') });
      } else {
        Alert.alert(t('settings.exportDone'), kind === 'csv' ? t('settings.exportCsv') : t('settings.exportJson'));
      }
    } finally {
      try {
        await FileSystem.deleteAsync(path, { idempotent: true });
      } catch {
        // temp file cleanup is best-effort
      }
    }
  }

  function doExport() {
    Alert.alert(t('settings.export'), t('settings.exportPick'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: 'JSON', onPress: () => shareExport('json').catch((e) => Alert.alert(t('common.fail'), String(e?.message || e))) },
      { text: 'CSV', onPress: () => shareExport('csv').catch((e) => Alert.alert(t('common.fail'), String(e?.message || e))) },
    ]);
  }

  async function doImport() {
    try {
      const pick = await DocumentPicker.getDocumentAsync({ type: 'application/json', multiple: false, copyToCacheDirectory: true });
      if (pick.canceled) return;
      const file = pick.assets?.[0];
      if (!file?.uri) {
        Alert.alert(t('settings.importFail'), t('settings.importNoFile'));
        return;
      }
      let size = finiteSize(file.size);
      if (size == null) {
        try {
          const info = await FileSystem.getInfoAsync(file.uri);
          size = finiteSize(info?.size);
        } catch {
          size = null;
        }
      }
      if (size != null) {
        const early = importSizeError(size);
        if (early) {
          Alert.alert(t('settings.importFail'), early);
          return;
        }
      }
      const raw = await FileSystem.readAsStringAsync(file.uri);
      const after = importSizeError(utf8ByteLength(raw) ?? size);
      if (after) {
        Alert.alert(t('settings.importFail'), after);
        return;
      }
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        Alert.alert(t('settings.importFail'), t('settings.importBadJson'));
        return;
      }
      Alert.alert(t('settings.import'), t('settings.importConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.import'),
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await importFromJson(data);
              Alert.alert(t('settings.importDone'), result?.truncated ? t('settings.importOkTruncated') : t('settings.importOk'));
            } catch (e) {
              Alert.alert(t('settings.importFail'), String(e?.message || e));
            }
          },
        },
      ]);
    } catch (e) {
      Alert.alert(t('settings.importFail'), String(e?.message || e));
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.set, paddingTop: insets.top }}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.navBtn} accessibilityLabel={t('common.back')}>
          <ChevronLeftIcon color={c.brand} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.label }]}>{t('settings.title')}</Text>
        <View style={styles.navBtn} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <View style={[styles.grp, { backgroundColor: c.cell }]}>
          <Row
            icon={<Sq bg={c.brand}><CheckIcon color="#fff" size={15} /></Sq>}
            title={t('settings.pro')}
            value={pro ? t('common.unlocked') : ''}
            onPress={() => nav.navigate('Paywall')}
            chev
            c={c}
          />
          <Row
            icon={<Sq bg="#8E8E93"><RestoreIcon color="#fff" size={15} /></Sq>}
            title={t('settings.restore')}
            onPress={restore}
            c={c}
          />
          <Row
            icon={<Sq bg="#5DBB7A"><GridIcon color="#fff" size={15} /></Sq>}
            title={t('settings.widgets')}
            onPress={() => nav.navigate('WidgetPicker')}
            chev
            c={c}
            last
          />
        </View>

        <Text style={[styles.sec, { color: c.label }]}>{t('settings.data')}</Text>
        <View style={[styles.grp, { backgroundColor: c.cell }]}>
          <Row title={t('settings.export')} value={t('settings.exportFormats')} onPress={doExport} chev c={c} />
          <Row title={t('settings.import')} value={t('settings.importFormat')} onPress={doImport} chev c={c} />
          <Row
            title={t('settings.recentlyDeleted')}
            value={String(trash)}
            onPress={() => nav.navigate('RecentlyDeleted')}
            chev
            c={c}
            last
          />
        </View>

        <Text style={[styles.sec, { color: c.label }]}>{t('settings.display')}</Text>
        <View style={[styles.grp, { backgroundColor: c.cell }]}>
          <Row
            icon={<Sq bg="#5856D6"><PaintIcon color="#fff" size={15} /></Sq>}
            title={t('settings.appearance')}
            value={t(APPEARANCE_KEYS[appearance] || 'settings.appearanceAuto')}
            onPress={cycleAppearance}
            chev
            c={c}
          />
          <Row
            icon={<Sq bg="#007AFF"><ClockIcon color="#fff" size={15} /></Sq>}
            title={t('settings.preciseTime')}
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
            title={t('settings.reminderTime')}
            value={reminderTime}
            onPress={cycleTime}
            chev
            c={c}
          />
          <Row
            icon={<Sq bg="#FF9F0A"><BellIcon color="#fff" size={15} /></Sq>}
            title={t('settings.notifyWithName')}
            right={(
              <Switch
                value={showNameInNotifications}
                onValueChange={async (v) => {
                  await setShowNameInNotifications(v);
                  await refreshReminders();
                }}
                trackColor={{ false: c.fill, true: c.brand }}
              />
            )}
            c={c}
          />
          <Row
            icon={<Sq bg="#8E8E93"><LockIcon color="#fff" size={15} /></Sq>}
            title={t('settings.hideName')}
            right={(
              <Switch
                value={hideName}
                onValueChange={(v) => {
                  setHideName(v);
                  updatePrefs({ hideName: v }).catch(() => {});
                }}
                trackColor={{ false: c.fill, true: c.brand }}
              />
            )}
            c={c}
            last
          />
        </View>

        <View style={[styles.grp, { backgroundColor: c.cell, marginTop: 32 }]}>
          <Row
            title={t('settings.rate')}
            onPress={() => open('itms-apps://itunes.apple.com/app/id6822311922?action=write-review')}
            chev
            c={c}
          />
          <Row
            title={t('settings.contact')}
            onPress={() => open('mailto:tinytoolshedhq@gmail.com')}
            chev
            c={c}
          />
          <Row
            icon={<Sq bg="#30B0C7"><MailIcon color="#fff" size={16} /></Sq>}
            title={t('settings.support')}
            onPress={() => open(SUPPORT_URL)}
            chev
            c={c}
          />
          <Row
            icon={<Sq bg="#8E8E93"><LockIcon color="#fff" size={15} /></Sq>}
            title={t('settings.privacy')}
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
