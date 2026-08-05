import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { playClick } from '../audio/sfx';

/** Compact top-right control for background music on/off. */
export default function MusicToggle({ on, onToggle, style }) {
  const handlePress = () => {
    playClick();
    onToggle?.();
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={on ? '關閉背景音樂' : '開啟背景音樂'}
      activeOpacity={0.75}
      onPress={handlePress}
      style={[styles.btn, on ? styles.btnOn : styles.btnOff, style]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text style={[styles.icon, on && styles.iconOn]}>{on ? '♪' : '♩'}</Text>
      {!on && <View style={styles.slash} pointerEvents="none" />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  btnOn: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: colors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  btnOff: {
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  icon: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMuted,
  },
  iconOn: {
    color: colors.accent,
  },
  slash: {
    position: 'absolute',
    width: 22,
    height: 2,
    backgroundColor: colors.textMuted,
    transform: [{ rotate: '-40deg' }],
    borderRadius: 1,
  },
});
