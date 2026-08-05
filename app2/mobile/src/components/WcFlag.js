import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme';

/** Q-style wooden WC flag stuck in a soil mound. */
export default function WcFlag({ size = 1 }) {
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: -6,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  const s = size;

  return (
    <Animated.View
      style={[styles.wrap, { transform: [{ translateY: bob }, { scale: s }] }]}
      accessibilityElementsHidden
    >
      <View style={styles.flagBoard}>
        <Text style={styles.wc}>WC</Text>
        <View style={styles.nail} />
      </View>
      <View style={styles.pole} />
      <View style={styles.mound} />
      <View style={styles.moundShade} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 140,
    height: 160,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  flagBoard: {
    width: 86,
    height: 58,
    borderRadius: 10,
    backgroundColor: colors.woodLight,
    borderWidth: 3,
    borderColor: colors.wood,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: colors.wood,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  wc: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.brandDeep,
    letterSpacing: 2,
  },
  nail: {
    position: 'absolute',
    bottom: -6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.wood,
  },
  pole: {
    width: 10,
    height: 72,
    marginTop: -4,
    backgroundColor: colors.wood,
    borderRadius: 4,
    zIndex: 1,
  },
  mound: {
    width: 88,
    height: 22,
    marginTop: -6,
    borderRadius: 44,
    backgroundColor: colors.soil,
    opacity: 0.9,
  },
  moundShade: {
    position: 'absolute',
    bottom: 2,
    width: 110,
    height: 14,
    borderRadius: 40,
    backgroundColor: 'rgba(26,155,142,0.12)',
    zIndex: -1,
  },
});
