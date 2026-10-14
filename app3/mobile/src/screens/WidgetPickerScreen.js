import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivities } from '../data/repository';
import { useThemeColors } from '../theme/useTheme';
import { ChevronLeftIcon, CheckIcon } from '../components/Icons';
import { ItemGlyph } from '../components/ItemGlyph';
import { itemPalette } from '../theme/colors';
import { loadWidgetSelection, saveWidgetSelection } from '../widgets/sync';

export default function WidgetPickerScreen() {
  const nav = useNavigation();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { activities } = useActivities();
  const [sel, setSel] = React.useState({ small: 'auto', medium: [] });

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
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.navBtn} accessibilityLabel="返回">
          <ChevronLeftIcon color={c.brand} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.label }]}>小工具</Text>
        <View style={styles.navBtn} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <Text style={[styles.hint, { color: c.l2 }]}>長按桌面小工具也可選項目。沒選時顯示最該做的。</Text>
        <Text style={[styles.sec, { color: c.l2 }]}>小尺寸</Text>
        <View style={[styles.grp, { backgroundColor: c.cell }]}>
          <Row
            title="最該做的"
            on={sel.small === 'auto'}
            onPress={() => setSmall('auto')}
            c={c}
          />
          {activities.map((a, i) => (
            <Row
              key={a.id}
              title={a.title}
              icon={a.icon}
              on={sel.small === a.id}
              onPress={() => setSmall(a.id)}
              c={c}
              last={i === activities.length - 1}
            />
          ))}
        </View>
        <Text style={[styles.sec, { color: c.l2 }]}>中尺寸（最多 3 個）</Text>
        <View style={[styles.grp, { backgroundColor: c.cell }]}>
          <Row
            title="最該做的"
            on={!sel.medium?.length}
            onPress={() => saveWidgetSelection({ ...sel, medium: [] }).then(() => setSel({ ...sel, medium: [] }))}
            c={c}
            last={!activities.length}
          />
          {activities.map((a, i) => (
            <Row
              key={a.id}
              title={a.title}
              icon={a.icon}
              on={(sel.medium || []).includes(a.id)}
              onPress={() => toggleMedium(a.id)}
              c={c}
              last={i === activities.length - 1}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ title, icon, on, onPress, c, last }) {
  const pal = itemPalette[icon || 'brush'] || itemPalette.brush;
  return (
    <TouchableOpacity onPress={onPress} style={[styles.row, !last && styles.line]} activeOpacity={0.6}>
      {icon ? (
        <View style={[styles.gl, { backgroundColor: pal.light.ac }]}>
          <ItemGlyph kind={icon} color={pal.light.acf} size={16} />
        </View>
      ) : null}
      <Text style={[styles.rowTitle, { color: c.label }]}>{title}</Text>
      {on ? <CheckIcon color={c.brand} size={16} /> : null}
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
  hint: { marginHorizontal: 20, marginTop: 8, marginBottom: 16, fontSize: 13, fontFamily: 'NaikaiSubset-Regular', lineHeight: 20 },
  sec: { marginHorizontal: 28, marginBottom: 8, marginTop: 8, fontSize: 13, fontFamily: 'NaikaiSubset-Regular' },
  grp: { marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingHorizontal: 16, gap: 12 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(46,41,37,0.09)' },
  rowTitle: { fontSize: 17, fontFamily: 'NaikaiSubset-Regular', flex: 1 },
  gl: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
