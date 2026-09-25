import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';
import { categoryStatGroups } from '../data/identities';

export function formatHeadcount(count) {
  if (typeof count === 'number' && Number.isFinite(count) && count >= 50) {
    return `${count} 人`;
  }
  return '<50 人';
}

export default function StatsScreen({ onLoad, onBack }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const columnWidth = Math.min(width - 40, 640);
  const groups = categoryStatGroups();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [successful, setSuccessful] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await onLoad(
          groups.map((group) => ({ id: group.id, ids: group.ids })),
        );
        if (!alive) return;
        if (!data?.ok) {
          setError('無法載入人數');
          return;
        }
        const byId = Object.fromEntries(
          (data.categories || []).map((row) => [row.id, row.count]),
        );
        setRows(groups.map((group) => ({ ...group, count: byId[group.id] })));
        setSuccessful(data.successful_people);
      } catch (e) {
        if (alive) setError(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [onLoad]);

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <ScrollView
        contentContainerStyle={[
          styles.pad,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
            alignItems: 'center',
          },
        ]}
      >
        <View style={{ width: columnWidth, gap: 12 }}>
          <Text style={styles.brand}>統計人數</Text>
          <Text style={styles.sub}>
            依身份大類統計目前人數。未滿 50 人時只顯示「&lt;50 人」。
          </Text>

          {loading ? (
            <ActivityIndicator color={colors.brand} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <>
              {rows.map((row) => (
                <View key={row.id} style={styles.row}>
                  <Text style={styles.label}>{row.label}</Text>
                  <Text style={styles.count}>{formatHeadcount(row.count)}</Text>
                </View>
              ))}
              <View style={[styles.row, styles.success]}>
                <Text style={styles.label}>成功配對人數</Text>
                <Text style={styles.count}>{formatHeadcount(successful)}</Text>
              </View>
              <Text style={styles.hint}>
                成功配對指雙方已同意並交換 LINE 的不重複人數。同一人只計一次。
              </Text>
            </>
          )}

          <TouchableOpacity style={styles.secondary} onPress={onBack}>
            <Text style={styles.secondaryText}>返回</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { paddingHorizontal: 20 },
  brand: { fontSize: 26, fontWeight: '700', color: colors.ink },
  sub: { color: colors.muted, lineHeight: 20 },
  error: { color: colors.danger },
  row: {
    backgroundColor: colors.card,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  success: { borderColor: colors.brand },
  label: { color: colors.ink, fontSize: 16, fontWeight: '600', flex: 1 },
  count: { color: colors.brandDeep, fontSize: 16, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  secondary: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingVertical: 14,
    borderRadius: radius.row,
    alignItems: 'center',
  },
  secondaryText: { color: colors.ink, fontWeight: '600' },
});
