import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';
import Mascot from '../components/Mascot';
import MusicToggle from '../components/MusicToggle';

export default function StartScreen({ onStart, bgmOn, onToggleBgm, hasProgress }) {
  const bob = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: -10,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  const onPressIn = () => {
    Animated.spring(press, { toValue: 0.96, useNativeDriver: true, speed: 40 }).start();
  };
  const onPressOut = () => {
    Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 40 }).start();
  };

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <View style={styles.safe}>
        <MusicToggle on={bgmOn} onToggle={onToggleBgm} style={styles.musicBtn} />

        <View style={styles.hero}>
          <Animated.View style={{ transform: [{ translateY: bob }] }}>
            <Mascot size={128} color="#B9E3A8" happy />
          </Animated.View>
          <Text style={styles.title}>諧音猜猜</Text>
          <Text style={styles.motto}>嘿對 認真你就輸了：）</Text>
        </View>

        <View style={styles.footer}>
          <Animated.View style={{ transform: [{ scale: press }] }}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.button}
              onPress={onStart}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
            >
              <Text style={styles.buttonText}>
                {hasProgress ? '繼續遊戲' : '開始遊戲'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safe: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  musicBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    right: 20,
    zIndex: 10,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },
  title: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.textDark,
    marginTop: 28,
    letterSpacing: 6,
  },
  motto: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 14,
    letterSpacing: 1,
  },
  footer: {
    paddingBottom: 8,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
