import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { colors, radius } from '../theme';
import { isLevelUnlocked } from '../storage/progress';

export default function LevelDirectory({
  total,
  currentIndex,
  completed,
  onSelect,
}) {
  const scrollRef = useRef(null);
  const completedSet = new Set(completed);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        x: Math.max(0, currentIndex * 56 - 80),
        animated: true,
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>關卡目錄 · 左右滑動切換已解鎖關卡</Text>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {Array.from({ length: total }, (_, i) => {
          const unlocked = isLevelUnlocked(i, completed);
          const done = completedSet.has(i);
          const active = i === currentIndex;
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.chip,
                active && styles.chipActive,
                done && !active && styles.chipDone,
                !unlocked && styles.chipLocked,
              ]}
              activeOpacity={unlocked ? 0.85 : 1}
              disabled={!unlocked}
              onPress={() => unlocked && onSelect(i)}
            >
              <Text
                style={[
                  styles.chipNum,
                  active && styles.chipTextActive,
                  !unlocked && styles.chipTextLocked,
                ]}
              >
                {unlocked ? i + 1 : '🔒'}
              </Text>
              {done && (
                <Text style={[styles.chipMark, active && styles.chipTextActive]}>✓</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 22 : 10,
    paddingHorizontal: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    paddingHorizontal: 4,
    paddingBottom: 2,
    alignItems: 'center',
  },
  chip: {
    width: 48,
    height: 48,
    borderRadius: radius.inner,
    backgroundColor: '#F4F1F8',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  chipDone: {
    backgroundColor: colors.greenSoft,
  },
  chipLocked: {
    backgroundColor: '#EDEAF2',
    opacity: 0.75,
  },
  chipNum: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textDark,
  },
  chipMark: {
    position: 'absolute',
    top: 2,
    right: 4,
    fontSize: 10,
    fontWeight: '800',
    color: colors.green,
  },
  chipTextActive: {
    color: '#fff',
  },
  chipTextLocked: {
    color: colors.disabledText,
    fontSize: 12,
  },
});
