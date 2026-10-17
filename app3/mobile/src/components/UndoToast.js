import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors } from '../theme/useTheme';
import { Mascot } from './Mascot';
import { t } from '../i18n';

/** In-app undo toast lifetime (fade-out starts after this). */
export const TOAST_MS = 2000;
const FADE_MS = 180;

/**
 * Shared fade-in / fade-out toast for log and delete undo.
 * Undo stays tappable until the fade-out finishes.
 */
export function UndoToast({ text, undo, onDone, bottom }) {
  const c = useThemeColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef(null);
  const gone = useRef(false);

  useEffect(() => {
    gone.current = false;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
    hideTimer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(({ finished }) => {
        if (finished && !gone.current) {
          gone.current = true;
          onDone?.();
        }
      });
    }, TOAST_MS);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [opacity, onDone]);

  return (
    <Animated.View
      testID="undo-toast"
      style={[styles.toast, { backgroundColor: c.cell, borderColor: c.sep, bottom, opacity }]}
    >
      <Mascot size={38} mood="happy" />
      <Text style={{ fontFamily: 'BeenAgesRounded-SemiBold', color: c.label, fontSize: 15 }}>{text}</Text>
      {undo ? (
        <TouchableOpacity
          testID="undo-toast-action"
          onPress={async () => {
            const ok = await undo();
            if (ok !== false && !gone.current) {
              gone.current = true;
              if (hideTimer.current) clearTimeout(hideTimer.current);
              onDone?.();
            }
          }}
          hitSlop={8}
        >
          <Text style={{ color: c.brand, fontFamily: 'BeenAgesRounded-SemiBold', fontSize: 15 }}>{t('common.undo')}</Text>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 24,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
  },
});
