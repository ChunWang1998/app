import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';
import WcFlag from '../components/WcFlag';

export default function LandingScreen({ onStart }) {
  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <View style={styles.wash} />
      <View style={styles.container}>
        <Text style={styles.brand}>急廁 Go</Text>
        <Text style={styles.headline}>趕快找到你附近的廁所！</Text>

        <View style={styles.flagWrap}>
          <WcFlag />
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.cta}
          onPress={onStart}
        >
          <Text style={styles.ctaText}>開始找廁所</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  wash: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brand: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.brandDeep,
    letterSpacing: 1,
    marginBottom: 12,
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  flagWrap: {
    marginVertical: 36,
  },
  cta: {
    backgroundColor: colors.brand,
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: radius.pill,
    shadowColor: colors.brand,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
});
