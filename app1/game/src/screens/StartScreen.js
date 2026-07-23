import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';
import Mascot from '../components/Mascot';

export default function StartScreen({ onStart }) {
  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Mascot size={110} color="#B9E3A8" happy />
          <Text style={styles.title}>看圖猜字</Text>
          <Text style={styles.subtitle}>FUN WORD GUESSING</Text>
          <Text style={styles.motto}>嘿對 認真你就輸了：）</Text>
          <Text style={styles.tagline}>看圖猜諧音梗，一起動動腦！</Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.button}
            onPress={onStart}
          >
            <Text style={styles.buttonText}>開始遊戲</Text>
          </TouchableOpacity>
          <Text style={styles.hintLine}>準備好了嗎？點擊開始吧！</Text>
        </View>
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
  },
  hero: { alignItems: 'center', marginBottom: 36 },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.textDark,
    marginTop: 20,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 3,
    marginTop: 4,
  },
  motto: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
    marginTop: 16,
    letterSpacing: 1,
  },
  tagline: { fontSize: 15, color: colors.textDark, marginTop: 8 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 24,
    shadowColor: colors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  hintLine: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 14,
  },
});
