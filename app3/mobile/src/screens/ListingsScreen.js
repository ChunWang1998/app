import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchApprovedListings } from '../lib/api';
import { categoryLabel, colors, rewardLabel, spacing } from '../theme';

function formatSlots(item) {
  const left = Math.max(0, (item.quota || 0) - (item.redeemed_count || 0));
  return `${left}/${item.quota} 名額`;
}

export default function ListingsScreen({ onOpenListing, active = true }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await fetchApprovedListings();
      setItems(data);
    } catch (e) {
      setError(e.message || '載入失敗');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (active) load();
  }, [active, load]);

  const categories = ['all', 'academic', 'product', 'ux', 'course', 'other'];
  const visible =
    filter === 'all' ? items : items.filter((x) => x.category === filter);

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>找問卷</Text>
      <Text style={styles.sub}>外連填答 → 貼完成碼 → 領禮券</Text>

      <View style={styles.filters}>
        {categories.map((key) => (
          <Pressable
            key={key}
            onPress={() => setFilter(key)}
            style={[styles.chip, filter === key && styles.chipOn]}
          >
            <Text style={[styles.chipText, filter === key && styles.chipTextOn]}>
              {key === 'all' ? '全部' : categoryLabel[key]}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.mint} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>{error || '目前沒有開放案件'}</Text>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => onOpenListing(item.id)}>
              <View style={styles.cardTop}>
                <Text style={styles.cat}>{categoryLabel[item.category] || item.category}</Text>
                <Text style={styles.slots}>{formatSlots(item)}</Text>
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>約 {item.estimated_minutes} 分鐘</Text>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.meta}>{rewardLabel[item.reward_type]}</Text>
              </View>
              <Text style={styles.reward}>{item.reward_description}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  heading: {
    fontFamily: 'Syne_700Bold',
    fontSize: 34,
    color: colors.ink,
    letterSpacing: -0.8,
  },
  sub: {
    marginTop: 4,
    marginBottom: spacing.md,
    fontFamily: 'IBMPlexSans_400Regular',
    fontSize: 14,
    color: colors.inkSoft,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.paper,
  },
  chipOn: {
    backgroundColor: colors.ink,
  },
  chipText: {
    fontFamily: 'IBMPlexSans_500Medium',
    fontSize: 12,
    color: colors.inkMuted,
  },
  chipTextOn: {
    color: colors.cream,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cat: {
    fontFamily: 'IBMPlexSans_500Medium',
    fontSize: 12,
    color: colors.mintDeep,
  },
  slots: {
    fontFamily: 'IBMPlexSans_400Regular',
    fontSize: 12,
    color: colors.inkSoft,
  },
  title: {
    fontFamily: 'Syne_700Bold',
    fontSize: 18,
    color: colors.ink,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: {
    fontFamily: 'IBMPlexSans_400Regular',
    fontSize: 13,
    color: colors.inkMuted,
  },
  dot: {
    color: colors.inkSoft,
  },
  reward: {
    marginTop: 8,
    fontFamily: 'IBMPlexSans_500Medium',
    fontSize: 14,
    color: colors.amber,
  },
  empty: {
    marginTop: 40,
    textAlign: 'center',
    fontFamily: 'IBMPlexSans_400Regular',
    color: colors.inkSoft,
  },
});
