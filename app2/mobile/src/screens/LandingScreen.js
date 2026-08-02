import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';

export default function LandingScreen({ onStart }) {
  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <View style={styles.wash} />
      <View style={styles.container}>
        <Text style={styles.brand}>急廁 Go</Text>
        <Text style={styles.headline}>趕快找到你附近的廁所！</Text>
        <Text style={styles.sub}>
          定位後立刻告訴你最近、還在營業的三間廁所。
        </Text>

        <View style={styles.doorWrap} accessibilityElementsHidden>
          <View style={styles.door}>
            <View style={styles.doorWindow} />
            <View style={styles.doorKnob} />
          </View>
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
  sub: {
    marginTop: 12,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  doorWrap: {
    marginVertical: 36,
  },
  door: {
    width: 110,
    height: 140,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doorWindow: {
    width: 56,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#D7F4EF',
    borderWidth: 2,
    borderColor: colors.brand,
  },
  doorKnob: {
    position: 'absolute',
    right: 16,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.brand,
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
