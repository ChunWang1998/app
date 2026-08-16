import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';

export default function LocateGateScreen({ status, city, error, onRetry }) {
  const copy = {
    locating: ['正在判斷所在縣市…', '定位後只載入這一市的行政區'],
    denied: ['需要定位才能使用', '規格不提供縣市下拉。請開啟定位權限後重試。'],
    error: ['定位或行政區載入失敗', error || '請確認網路後重試。行政區來自即時 API，沒有寫死名單。'],
    blocked: [
      '試用尚未開放此縣市',
      city ? `目前判定：${city}` : '僅開放臺北市、新北市、臺南市、高雄市。',
    ],
  }[status] || ['載入中', ''];

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <View style={styles.box}>
        {status === 'locating' ? (
          <ActivityIndicator color={colors.brand} size="large" />
        ) : (
          <Text style={styles.mark}>📍</Text>
        )}
        <Text style={styles.title}>{copy[0]}</Text>
        <Text style={styles.sub}>{copy[1]}</Text>
        {status !== 'locating' ? (
          <TouchableOpacity style={styles.btn} onPress={onRetry}>
            <Text style={styles.btnText}>重試定位</Text>
          </TouchableOpacity>
        ) : null}
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
