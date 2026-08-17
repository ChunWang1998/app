import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';

export default function LocateGateScreen({ status, city, error, onRetry }) {
  const loading = status === 'loading';
  const failed = status === 'error';

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <View style={styles.box}>
        {loading ? (
          <ActivityIndicator color={colors.brand} size="large" />
        ) : (
          <Text style={styles.mark}>🗺️</Text>
        )}
        <Text style={styles.title}>
          {loading ? '正在定位…' : '無法使用定位'}
        </Text>
        <Text style={styles.sub}>
          {loading
            ? city
              ? `目前縣市：${city}`
              : '縣市由定位判定，不能手選。'
            : error || '請開啟定位後重試。試用只開放臺北、新北、臺南、高雄。'}
        </Text>
        {loading || !failed ? null : (
          <TouchableOpacity style={styles.btn} onPress={onRetry}>
            <Text style={styles.btnText}>重試定位</Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'center', padding: 28 },
  box: { alignItems: 'center' },
  mark: { fontSize: 40, marginBottom: 16 },
  title: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
  },
  sub: {
    marginTop: 10,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  btn: {
    marginTop: 24,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: radius.pill,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
