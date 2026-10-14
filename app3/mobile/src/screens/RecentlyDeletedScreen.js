import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRecentlyDeleted, undoDelete, subscribe } from '../data/repository';
import { useThemeColors } from '../theme/useTheme';
import { ChevronLeftIcon } from '../components/Icons';
import { formatDate } from '../lib/time';
import { t } from '../i18n';

export default function RecentlyDeletedScreen() {
  const c = useThemeColors();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const [items, setItems] = React.useState(() => getRecentlyDeleted());
  React.useEffect(() => subscribe(() => setItems(getRecentlyDeleted())), []);

  async function restore(it) {
    try {
      await undoDelete(it.id);
    } catch (e) {
      if (e?.code === 'FREE_LIMIT') {
        nav.navigate('Paywall');
        return;
      }
      Alert.alert(t('common.fail'), String(e?.message || e));
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.set, paddingTop: insets.top }}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.navBtn} accessibilityLabel={t('common.back')}>
          <ChevronLeftIcon color={c.brand} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.label }]}>{t('deleted.title')}</Text>
        <View style={styles.navBtn} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom, paddingHorizontal: 16 }}>
        {items.length === 0 ? (
          <Text style={{ color: c.l2, marginTop: 24, fontFamily: 'BeenAgesRounded-Regular', textAlign: 'center' }}>{t('deleted.empty')}</Text>
        ) : items.map((it) => (
          <View key={it.id} style={[styles.row, { backgroundColor: c.cell }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.label, fontFamily: 'BeenAgesRounded-SemiBold', fontSize: 17 }}>{it.title}</Text>
              <Text style={{ color: c.l2, fontFamily: 'BeenAgesRounded-Regular', marginTop: 2, fontSize: 13 }}>
                {it.deletedAt ? formatDate(it.deletedAt) : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => restore(it)} style={[styles.btn, { borderColor: c.brand }]}>
              <Text style={{ color: c.brand, fontFamily: 'BeenAgesRounded-SemiBold' }}>{t('deleted.restore')}</Text>
            </TouchableOpacity>
          </View>
        ))}
        <Text style={{ color: c.l3, fontSize: 13, marginTop: 20, textAlign: 'center', fontFamily: 'BeenAgesRounded-Regular' }}>
          {t('deleted.purge')}
        </Text>
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
  title: { fontFamily: 'BeenAgesRounded-SemiBold', fontSize: 17 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, marginTop: 12, gap: 10 },
  btn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5 },
});
