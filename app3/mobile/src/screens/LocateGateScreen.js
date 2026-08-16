import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';
import { TRIAL_CITIES } from '../data/constants';

export default function LocateGateScreen({ status, city, error, onPick, onRetry }) {
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
          {loading ? '正在載入行政區…' : failed ? '行政區載入失敗' : '選擇縣市'}
        </Text>
        <Text style={styles.sub}>
          {loading
            ? `目前選擇：${city}`
            : failed
              ? error || '請確認網路後重試。'
              : '目前開放高雄市、臺南市、新北市、臺北市。'}
        </Text>
        {loading ? null : failed ? (
          <TouchableOpacity style={styles.btn} onPress={onRetry}>
            <Text style={styles.btnText}>重試</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.cities}>
            {TRIAL_CITIES.map((c) => (
              <TouchableOpacity key={c} style={styles.cityBtn} onPress={() => onPick(c)}>
                <Text style={styles.cityText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
  cities: { marginTop: 24, width: '100%', gap: 10 },
  cityBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  cityText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btn: {
    marginTop: 24,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: radius.pill,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
