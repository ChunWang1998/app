import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';

/** Soft metallic glow + sliding highlight for vote > 0 cards. */
export default function GoldSparkle({ active, children, style }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    if (!active) {
      shimmer.setValue(0);
      pulse.setValue(0.45);
      return undefined;
    }
    const slide = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 2200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    slide.start();
    glow.start();
    return () => {
      slide.stop();
      glow.stop();
    };
  }, [active, shimmer, pulse]);

  if (!active) {
    return <View style={style}>{children}</View>;
  }

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 220],
  });

  return (
    <View style={[styles.wrap, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            opacity: pulse,
          },
        ]}
      />
      {children}
      <Animated.View
        pointerEvents="none"
        style={[styles.shimmerTrack, { transform: [{ translateX }, { rotate: '18deg' }] }]}
      >
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255,255,255,0.15)',
            'rgba(255,229,102,0.65)',
            'rgba(255,255,255,0.35)',
            'transparent',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shimmerBar}
        />
      </Animated.View>
      <View pointerEvents="none" style={styles.sparkDotA} />
      <View pointerEvents="none" style={styles.sparkDotB} />
      <View pointerEvents="none" style={styles.sparkDotC} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius.card,
    marginBottom: 10,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.voteGoldBright,
    shadowColor: colors.voteGoldBright,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  shimmerTrack: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 56,
  },
  shimmerBar: {
    flex: 1,
    width: 56,
  },
  sparkDotA: {
    position: 'absolute',
    top: 8,
    right: 18,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFFBEA',
    opacity: 0.95,
  },
  sparkDotB: {
    position: 'absolute',
    top: 22,
    right: 36,
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.voteGoldBright,
    opacity: 0.85,
  },
  sparkDotC: {
    position: 'absolute',
    bottom: 14,
    left: 48,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFF8DC',
    opacity: 0.8,
  },
});
