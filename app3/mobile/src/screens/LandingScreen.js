import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';
import LogoMark from '../components/LogoMark';

export default function LandingScreen({ onStart }) {
  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <View style={styles.container}>
        <LogoMark size={148} />
        <Text style={styles.brand}>鄰汪</Text>
        <Text style={styles.headline}>找到附近一起出門的狗鄰居</Text>
        <TouchableOpacity activeOpacity={0.85} style={styles.cta} onPress={onStart}>
          <Text style={styles.ctaText}>開始探索</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brand: {
    marginTop: 22,
    fontSize: 52,
    fontWeight: '800',
    color: colors.brandDeep,
    letterSpacing: 2,
    marginBottom: 12,
  },
  headline: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  cta: {
    marginTop: 40,
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
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
