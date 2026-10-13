import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '../theme/useTheme';
import { exportToJson } from '../data/repository';
import { restoreProUnlock } from '../lib/iap';
import { isProUnlocked } from '../lib/entitlements';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { importFromJson } from '../data/repository';

const STORE_PRIVACY_URL = 'https://chunwang1998.github.io/app/app3/store/privacy.html';
const STORE_SUPPORT_URL = 'https://chunwang1998.github.io/app/app3/store/support.html';

export default function SettingsScreen() {
  const c = useThemeColors();
  const nav = useNavigation();
  const [pro, setPro] = React.useState(false);
  React.useEffect(() => { isProUnlocked().then(setPro); }, []);

  async function doExport() {
    const blob = await exportToJson();
    const path = `${FileSystem.cacheDirectory}been-ages-export-${Date.now()}.json`;
    try {
      await FileSystem.writeAsStringAsync(path, JSON.stringify(blob, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Export Been Ages' });
      } else {
        Alert.alert('匯出完成', '已產生 JSON 檔案');
      }
    } finally {
      // Clean up
      try { await FileSystem.deleteAsync(path, { idempotent: true }); } catch {}
    }
  }

  async function doImport() {
    try {
      const pick = await DocumentPicker.getDocumentAsync({ type: 'application/json', multiple: false, copyToCacheDirectory: true });
      if (pick.canceled) return;
      const file = pick.assets?.[0];
      if (!file?.uri) {
        Alert.alert('匯入失敗', '找不到檔案');
        return;
      }
      let byteSize = file.size != null ? Number(file.size) : NaN;
      if (!Number.isFinite(byteSize) || byteSize <= 0) {
        try {
          const info = await FileSystem.getInfoAsync(file.uri);
          byteSize = Number(info?.size);
        } catch {
          byteSize = NaN;
        }
      }
      if (Number.isFinite(byteSize) && byteSize > 1024 * 1024) {
        Alert.alert('匯入失敗', '檔案太大（超過 1MB）');
        return;
      }
      const raw = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        Alert.alert('匯入失敗', '不是合法的 JSON 檔');
        return;
      }
      // Confirm
      Alert.alert('匯入', '將以檔案內容覆蓋目前資料，是否繼續？', [
        { text: '取消', style: 'cancel' },
        {
          text: '匯入',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await importFromJson(data);
              if (result?.truncated) {
                Alert.alert('完成', '已匯入資料。免費版只保留 3 個項目。');
              } else {
                Alert.alert('完成', '已匯入資料');
              }
            } catch (e) {
              Alert.alert('匯入失敗', String(e?.message || e));
            }
          },
        },
      ]);
    } catch (e) {
      Alert.alert('匯入失敗', String(e?.message || e));
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.set }}>
      <View style={{ padding: 20 }}>
        <View style={[styles.grp, { backgroundColor: c.cell }]}>
          <TouchableOpacity style={styles.row} onPress={() => nav.navigate('Paywall')}>
            <Text style={[styles.rowTitle, { color: c.label }]}>{pro ? '完整版（已解鎖）' : '完整版'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={async () => { const r = await restoreProUnlock(); if (r.ok) setPro(true); }}>
            <Text style={[styles.rowTitle, { color: c.label }]}>恢復購買</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.grp, { backgroundColor: c.cell, marginTop: 14 }]}>
          <TouchableOpacity style={styles.row} onPress={doExport}>
            <Text style={[styles.rowTitle, { color: c.label }]}>匯出</Text>
            <Text style={{ marginLeft: 'auto', color: c.l2 }}>JSON</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={doImport}>
            <Text style={[styles.rowTitle, { color: c.label }]}>匯入</Text>
            <Text style={{ marginLeft: 'auto', color: c.l2 }}>JSON</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => nav.navigate('RecentlyDeleted')}>
            <Text style={[styles.rowTitle, { color: c.label }]}>最近刪除</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.grp, { backgroundColor: c.cell, marginTop: 14 }]}>
          <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('itms-apps://itunes.apple.com/app/id6822311922?action=write-review')}>
            <Text style={[styles.rowTitle, { color: c.label }]}>給個評分</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('mailto:tinytoolshedhq@gmail.com')}>
            <Text style={[styles.rowTitle, { color: c.label }]}>聯絡我們</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(STORE_SUPPORT_URL)}>
            <Text style={[styles.rowTitle, { color: c.label }]}>支援</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(STORE_PRIVACY_URL)}>
            <Text style={[styles.rowTitle, { color: c.label }]}>隱私權政策</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ textAlign: 'center', marginTop: 20, color: c.l2 }}>Been Ages 1.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grp: { borderRadius: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.09)' },
  rowTitle: { fontSize: 17 }
});
