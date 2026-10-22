import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GaugeBar from '../components/GaugeBar';
import SettingsSheet from '../components/SettingsSheet';
import { getOffset, setOffset as persistOffset, subscribePrefs } from '../data/prefs';
import { t } from '../i18n';
import { useMetering } from '../hooks/useMetering';
import { formatDb } from '../lib/meter';

export default function MeterScreen() {
  const insets = useSafeAreaInsets();
  const [offset, setOffsetState] = useState(getOffset);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const meter = useMetering(offset);

  useEffect(() => subscribePrefs((prefs) => setOffsetState(prefs.offset)), []);

  async function changeOffset(next) {
    const saved = await persistOffset(next);
    setOffsetState(saved.offset);
  }

  const showDenied = meter.permission === 'denied';

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.top}>
        <Text style={styles.title}>{t('app.title')}</Text>
        <Pressable
          onPress={() => setSettingsOpen(true)}
          style={styles.calibrate}
          accessibilityRole="button"
          accessibilityLabel={t('settings.open')}
        >
          <Text style={styles.calibrateText}>{t('settings.open')}</Text>
        </Pressable>
      </View>

      <View style={styles.center}>
        {showDenied ? (
          <View style={styles.deniedBox}>
            <Text style={styles.denied}>{t('permission.denied')}</Text>
            <Pressable onPress={meter.start} style={styles.secondary} accessibilityRole="button">
              <Text style={styles.secondaryText}>{t('permission.tryAgain')}</Text>
            </Pressable>
            <Pressable onPress={() => Linking.openSettings()} style={styles.link} accessibilityRole="button">
              <Text style={styles.linkText}>{t('permission.openSettings')}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text
              style={styles.value}
              accessibilityRole="text"
              accessibilityLabel={`${formatDb(meter.displayDb)} ${t('app.unit')}`}
            >
              {formatDb(meter.displayDb)}
            </Text>
            <Text style={styles.unit}>{t('app.unit')}</Text>
            <View style={styles.gaugeWrap}>
              <GaugeBar value={meter.displayDb} />
            </View>
            <View style={styles.stats}>
              <Text style={styles.stat}>{t('meter.max')} {formatDb(meter.max)}</Text>
              <Text style={styles.stat}>{t('meter.avg')} {formatDb(meter.avg)}</Text>
            </View>
          </>
        )}
      </View>

      {!showDenied && (
        <Pressable
          onPress={meter.running ? meter.stop : meter.start}
          style={styles.primary}
          accessibilityRole="button"
          accessibilityLabel={meter.running ? t('meter.stop') : t('meter.start')}
        >
          <Text style={styles.primaryText}>{meter.running ? t('meter.stop') : t('meter.start')}</Text>
        </Pressable>
      )}

      <Text style={styles.note}>{t('meter.estimate')}</Text>

      <SettingsSheet
        visible={settingsOpen}
        offset={offset}
        onChangeOffset={changeOffset}
        onClose={() => setSettingsOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F5F2',
    paddingHorizontal: 24,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1A17',
  },
  calibrate: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  calibrateText: {
    fontSize: 16,
    color: '#3F8A57',
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 96,
    lineHeight: 104,
    fontWeight: '700',
    color: '#1C1A17',
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 20,
    color: '#6B6560',
    marginBottom: 28,
  },
  gaugeWrap: {
    width: '100%',
    maxWidth: 360,
  },
  stats: {
    flexDirection: 'row',
    gap: 28,
    marginTop: 20,
  },
  stat: {
    fontSize: 16,
    color: '#6B6560',
    fontVariant: ['tabular-nums'],
  },
  primary: {
    backgroundColor: '#1C1A17',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    color: '#8A837C',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  deniedBox: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  denied: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1C1A17',
    textAlign: 'center',
    marginBottom: 20,
  },
  secondary: {
    backgroundColor: '#1C1A17',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  secondaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    paddingVertical: 8,
  },
  linkText: {
    color: '#3F8A57',
    fontSize: 16,
    fontWeight: '600',
  },
});
