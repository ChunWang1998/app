import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getRecentlyDeleted, undoDelete } from '../data/repository';
import { useThemeColors } from '../theme/useTheme';
import { useNavigation } from '@react-navigation/native';

export default function RecentlyDeletedScreen() {
  const c = useThemeColors();
  const nav = useNavigation();
  const [items, setItems] = React.useState([]);
  React.useEffect(() => {
    setItems(getRecentlyDeleted());
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: c.set }}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => nav.goBack()}><Text style={{ color: c.label }}>返回</Text></TouchableOpacity>
        <Text style={[styles.title, { color: c.label }]}>最近刪除</Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        {items.length === 0 ? (
          <Text style={{ color: c.l2, marginTop: 16 }}>沒有項目</Text>
        ) : items.map((it) => (
          <View key={it.id} style={[styles.row, { backgroundColor: c.cell }]}>
            <Text style={{ color: c.label, fontWeight: '600', flex: 1 }}>{it.title}</Text>
            <TouchableOpacity onPress={async () => { await undoDelete(it.id); setItems(getRecentlyDeleted()); }} style={[styles.btn, { borderColor: c.brand }]}>
              <Text style={{ color: c.brand, fontWeight: '700' }}>還原</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  title: { fontWeight: '600', fontSize: 17 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, marginTop: 10 },
  btn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5 }
});
