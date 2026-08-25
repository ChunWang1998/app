import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';
import LogoMark from '../components/LogoMark';

export default function LandingScreen({ onStart }) {
  return (
    <LinearGradient
      colors={['#FFE7C4', colors.bgTop, '#E7F7EE', '#D8F0E4']}
      locations={[0, 0.28, 0.72, 1]}
      style={styles.fill}
    >
      <View pointerEvents="none" style={styles.decor}>
        <View style={[styles.blob, styles.blobSun]} />
        <View style={[styles.blob, styles.blobOrange]} />
        <View style={[styles.blob, styles.blobMint]} />
        <View style={[styles.blob, styles.blobPeach]} />
        <Text style={[styles.paw, styles.paw1]}>🐾</Text>
        <Text style={[styles.paw, styles.paw2]}>🐾</Text>
        <Text style={[styles.paw, styles.paw3]}>🐾</Text>
        <Text style={[styles.paw, styles.paw4]}>🐾</Text>
        <Text style={[styles.paw, styles.bone]}>🦴</Text>
        <View style={styles.park} />
        <View style={styles.parkHill} />
      </View>

      <View style={styles.container}>
        <LogoMark size={148} />
        <Text style={styles.brand}>鄰汪</Text>
        <Text style={styles.headline}>找到一起出門的狗夥伴</Text>
        <TouchableOpacity activeOpacity={0.85} style={styles.cta} onPress={onStart}>
          <Text style={styles.ctaText}>開始探索</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  decor: { ...StyleSheet.absoluteFillObject },
  blob: { position: 'absolute', borderRadius: 999 },
  blobSun: {
    width: 160,
    height: 160,
    backgroundColor: 'rgba(255, 214, 120, 0.55)',
    top: -36,
    right: -28,
  },
  blobOrange: {
    width: 220,
    height: 220,
    backgroundColor: 'rgba(224, 122, 61, 0.16)',
    top: 88,
    left: -90,
  },
  blobMint: {
    width: 180,
    height: 180,
    backgroundColor: 'rgba(47, 143, 107, 0.16)',
    bottom: 140,
    right: -70,
  },
  blobPeach: {
    width: 90,
    height: 90,
    backgroundColor: 'rgba(255, 176, 140, 0.45)',
    top: 56,
    left: 36,
  },
  paw: { position: 'absolute', opacity: 0.28 },
  paw1: { fontSize: 34, top: 72, right: 42, transform: [{ rotate: '18deg' }] },
  paw2: { fontSize: 26, top: 210, left: 28, transform: [{ rotate: '-22deg' }] },
  paw3: { fontSize: 42, bottom: 210, left: 48, transform: [{ rotate: '8deg' }] },
  paw4: { fontSize: 22, bottom: 280, right: 36, transform: [{ rotate: '-12deg' }] },
  bone: { fontSize: 28, top: 168, right: 86, opacity: 0.22, transform: [{ rotate: '28deg' }] },
  park: {
    position: 'absolute',
    left: -40,
    right: -40,
    bottom: -40,
    height: 160,
    borderRadius: 180,
    backgroundColor: 'rgba(47, 143, 107, 0.18)',
  },
  parkHill: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(47, 143, 107, 0.12)',
    bottom: -90,
    right: -30,
  },
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
