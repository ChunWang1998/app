import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivities } from '../data/repository';
import { useThemeColors } from '../theme/useTheme';
import { ChevronLeftIcon, CheckIcon } from '../components/Icons';
import { ItemGlyph } from '../components/ItemGlyph';
import { paletteForItem } from '../theme/colors';
import { SettingsRow } from '../components/SettingsRow';
import { loadWidgetSelection, saveWidgetSelection } from '../widgets/sync';
import { t } from '../i18n';
import { isProUnlocked } from '../lib/entitlements';

export default function WidgetPickerScreen() {
  const nav = useNavigation();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { activities } = useActivities();
  const [sel, setSel] = React.useState({ small: 'auto', medium: [] });

  React.useEffect(() => {
    let live = true;
    isProUnlocked()
      .then((pro) => { if (live && !pro) nav.replace('Paywall'); })
      .catch(() => { if (live) nav.replace('Paywall'); });
    return () => { live = false; };
  }, [nav]);

  React.useEffect(() => {
    loadWidgetSelection().then(setSel).catch(() => {});
  }, []);

  async function setSmall(id) {
    const next = { ...sel, small: id };
    setSel(next);
    await saveWidgetSelection(next);
  }

  async function toggleMedium(id) {
    const cur = sel.medium || [];
    let medium;
    if (cur.includes(id)) medium = cur.filter((x) => x !== id);
    else if (cur.length >= 3) medium = [...cur.slice(1), id];
    else medium = [...cur, id];
    const next = { ...sel, medium };
    setSel(next);
    await saveWidgetSelection(next);
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.set, paddingTop: insets.top }}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.navBtn} accessibilityLabel={t('common.back')}>
          <ChevronLeftIcon color={c.brand} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.label }]}>{t('widget.title')}</Text>
        <View style={styles.navBtn} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <Text style={[styles.hint, { color: c.l2 }]}>{t('widget.hint')}</Text>
        <Text style={[styles.sec, { color: c.l2 }]}>{t('widget.small')}</Text>
        <View style={[styles.grp, { backgroundColor: c.cell }]}>
          <PickRow
            title={t('widget.mostDue')}
            on={sel.small === 'auto'}
            onPress={() => setSmall('auto')}
            last={!activities.length}
          />
          {activities.map((a, i) => (
            <PickRow
              key={a.id}
              title={a.title}
              icon={a.icon}
              on={sel.small === a.id}
              onPress={() => setSmall(a.id)}
              last={i === activities.length - 1}
            />
          ))}
        </View>
        <Text style={[styles.sec, { color: c.l2 }]}>{t('widget.medium')}</Text>
        <View style={[styles.grp, { backgroundColor: c.cell }]}>
          <PickRow
            title={t('widget.mostDue')}
            on={!sel.medium?.length}
            onPress={() => saveWidgetSelection({ ...sel, medium: [] }).then(() => setSel({ ...sel, medium: [] }))}
            last={!activities.length}
          />
          {activities.map((a, i) => (
            <PickRow
              key={a.id}
              title={a.title}
              icon={a.icon}
              on={(sel.medium || []).includes(a.id)}
              onPress={() => toggleMedium(a.id)}
              last={i === activities.length - 1}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function PickRow({ title, icon, on, onPress, last }) {
  const pal = paletteForItem(icon, title).light;
  return (
    <SettingsRow
      title={title}
      onPress={onPress}
      last={last}
      icon={icon ? (
        <View style={[styles.gl, { backgroundColor: pal.ac }]}>
          <ItemGlyph kind={icon} color={pal.acf} size={16} letter={title} />
        </View>
      ) : null}
      right={on ? <CheckIcon color={pal.acf} size={16} /> : null}
    />
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
  hint: { marginHorizontal: 20, marginTop: 8, marginBottom: 12, fontSize: 13, fontFamily: 'NaikaiSubset-Regular' },
  sec: { marginHorizontal: 28, marginBottom: 8, marginTop: 8, fontSize: 13, fontFamily: 'NaikaiSubset-Regular' },
  grp: { marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  gl: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
