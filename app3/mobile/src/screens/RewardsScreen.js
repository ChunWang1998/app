import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { fetchMyRewards } from '../lib/api';
import { colors, rewardLabel, spacing } from '../theme';

export default function RewardsScreen({ active = true }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await fetchMyRewards();
      setItems(Array.isArray(data) ? data : []);
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

  async function copyCode(code) {
    await Clipboard.setStringAsync(code);
    Alert.alert('已複製', code);
  }

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>我的獎勵</Text>
      <Text style={styles.sub}>已核銷發放的禮券碼</Text>

      {loading ? (
        <ActivityIndicator color={colors.mint} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>{error || '尚無領獎紀錄'}</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.type}>
                {rewardLabel[item.reward_type] || item.reward_type}
              </Text>
              <Text style={styles.title}>{item.listing_title}</Text>
              <Text style={styles.desc}>{item.reward_description}</Text>
              <Pressable style={styles.codeRow} onPress={() => copyCode(item.voucher_code)}>
                <Text style={styles.code}>{item.voucher_code}</Text>
                <Text style={styles.copy}>複製</Text>
              </Pressable>
              <Text style={styles.time}>
                {new Date(item.created_at).toLocaleString('zh-TW')}
              </Text>
            </View>
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
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  type: {
    fontFamily: 'IBMPlexSans_500Medium',
    fontSize: 12,
    color: colors.mintDeep,
  },
  title: {
    marginTop: 4,
    fontFamily: 'Syne_700Bold',
    fontSize: 18,
    color: colors.ink,
  },
  desc: {
    marginTop: 4,
    fontFamily: 'IBMPlexSans_400Regular',
    fontSize: 13,
    color: colors.inkMuted,
  },
  codeRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.mintSoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  code: {
    fontFamily: 'Syne_700Bold',
    fontSize: 16,
    letterSpacing: 1,
    color: colors.ink,
  },
  copy: {
    fontFamily: 'IBMPlexSans_500Medium',
    color: colors.mintDeep,
  },
  time: {
    marginTop: 8,
    fontFamily: 'IBMPlexSans_400Regular',
    fontSize: 12,
    color: colors.inkSoft,
  },
  empty: {
    marginTop: 40,
    textAlign: 'center',
    fontFamily: 'IBMPlexSans_400Regular',
    color: colors.inkSoft,
  },
});
