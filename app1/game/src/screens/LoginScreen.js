import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';
import Mascot from '../components/Mascot';

export default function LoginScreen({ onLogin }) {
  const [name, setName] = useState('');

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.hero}>
            <Mascot size={110} color="#B9E3A8" happy />
            <Text style={styles.title}>看圖猜字</Text>
            <Text style={styles.subtitle}>FUN WORD GUESSING</Text>
            <Text style={styles.tagline}>看圖猜諧音梗，一起動動腦！</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>玩家暱稱</Text>
            <TextInput
              style={styles.input}
              placeholder="輸入你的名字"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              returnKeyType="go"
              onSubmitEditing={() => onLogin(name.trim() || '玩家')}
            />
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.button}
              onPress={() => onLogin(name.trim() || '玩家')}
            >
              <Text style={styles.buttonText}>開始遊戲</Text>
            </TouchableOpacity>
            <Text style={styles.hintLine}>不填也沒關係，直接開始吧！</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  tagline: { fontSize: 15, color: colors.textDark, marginTop: 16 },
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
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#F4F1F8',
    borderRadius: radius.inner,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textDark,
  },
  button: {
    marginTop: 18,
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
