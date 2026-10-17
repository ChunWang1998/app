import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme/useTheme';
import { Mascot } from './Mascot';
import { CloseXIcon, CheckIcon } from './Icons';
import { getLocale, t } from '../i18n';
import { startSpeech, requestSpeechPermission, isSpeechAvailable } from '../lib/ai/speech';

const BARS = 21;

export function AiVoiceView({ onCancel, onDone }) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const stopRef = useRef(null);
  const amps = useRef(Array.from({ length: BARS }, () => new Animated.Value(8))).current;

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isSpeechAvailable()) {
        setErr(t('ai.speechUnavailable'));
        return;
      }
      const perm = await requestSpeechPermission();
      if (!alive) return;
      if (!perm.granted) {
        setErr(t('ai.speechDenied'));
        return;
      }
      stopRef.current = startSpeech({
        locale: getLocale(),
        onResult: (tr) => { if (alive) setText(tr); },
        onError: () => { if (alive) setErr(t('ai.speechUnavailable')); },
      });
    })();
    const loop = Animated.loop(
      Animated.stagger(40, amps.map((v, i) => {
        const peak = 8 + (1 - Math.abs(i - 10) / 11) * 32;
        return Animated.sequence([
          Animated.timing(v, { toValue: peak, duration: 180 + (i % 5) * 40, useNativeDriver: false }),
          Animated.timing(v, { toValue: 8, duration: 180 + (i % 4) * 40, useNativeDriver: false }),
        ]);
      })),
    );
    loop.start();
    return () => {
      alive = false;
      loop.stop();
      try { stopRef.current?.(); } catch { /* */ }
    };
  }, [amps]);

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]} testID="ai-voice">
      <View style={styles.stage}>
        <View style={styles.orb}>
          <View pointerEvents="none" style={[styles.ring, { backgroundColor: c.tint }]} />
          <View pointerEvents="none" style={[styles.ring, styles.r2, { backgroundColor: c.band }]} />
          <View style={styles.mascot}>
            <Mascot size={112} mood="listen" />
          </View>
        </View>
        <View style={styles.wave}>
          {amps.map((v, i) => (
            <Animated.View key={i} style={[styles.bar, { backgroundColor: c.brand, height: v }]} />
          ))}
        </View>
        <Text style={[styles.vtx, { color: c.label }]}>{err || text}</Text>
      </View>
      <View style={[styles.vctl, { paddingBottom: 54 + insets.bottom }]}>
        <TouchableOpacity testID="ai-voice-cancel" onPress={onCancel} style={[styles.vb, { backgroundColor: c.fill }]} accessibilityLabel={t('common.cancel')}>
          <CloseXIcon color={c.label} size={22} />
        </TouchableOpacity>
        <TouchableOpacity
          testID="ai-voice-done"
          onPress={() => onDone(text)}
          style={[styles.vb, { backgroundColor: c.brand }]}
          accessibilityLabel={t('common.done')}
        >
          <CheckIcon color={c.onbrand} size={26} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 20 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, paddingBottom: 40 },
  orb: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 110 },
  r2: { top: 22, left: 22, right: 22, bottom: 22, borderRadius: 88 },
  mascot: { zIndex: 1, elevation: 1 },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 44 },
  bar: { width: 5, borderRadius: 3 },
  vtx: { fontSize: 22, fontFamily: 'BeenAgesRounded-SemiBold', minHeight: 34, textAlign: 'center', paddingHorizontal: 30, lineHeight: 32 },
  vctl: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 44 },
  vb: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
