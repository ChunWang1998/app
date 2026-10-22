import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../i18n';
import { OFFSET_MAX, OFFSET_MIN, formatOffset } from '../lib/meter';

export default function SettingsSheet({ visible, offset, onChangeOffset, onClose }) {
  const insets = useSafeAreaInsets();
  const minusDisabled = offset <= OFFSET_MIN;
  const plusDisabled = offset >= OFFSET_MAX;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('settings.done')} />
        <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
          <Text style={styles.title}>{t('settings.title')}</Text>
          <Text style={styles.label}>{t('settings.offset')}</Text>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => onChangeOffset(offset - 1)}
              disabled={minusDisabled}
              style={[styles.stepBtn, minusDisabled && styles.stepBtnOff]}
              accessibilityLabel={t('settings.minus')}
              accessibilityRole="button"
            >
              <Text style={styles.stepBtnText}>-</Text>
            </Pressable>
            <Text style={styles.value} accessibilityLabel={`${t('settings.offset')} ${formatOffset(offset)} ${t('settings.unit')}`}>
              {formatOffset(offset)} {t('settings.unit')}
            </Text>
            <Pressable
              onPress={() => onChangeOffset(offset + 1)}
              disabled={plusDisabled}
              style={[styles.stepBtn, plusDisabled && styles.stepBtnOff]}
              accessibilityLabel={t('settings.plus')}
              accessibilityRole="button"
            >
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.help}>{t('settings.offsetHelp')}</Text>
          <Pressable onPress={onClose} style={styles.done} accessibilityRole="button">
            <Text style={styles.doneText}>{t('settings.done')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 26, 23, 0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#F7F5F2',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1A17',
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    color: '#6B6560',
    marginBottom: 12,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 12,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1C1A17',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnOff: {
    opacity: 0.3,
  },
  stepBtnText: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '500',
  },
  value: {
    minWidth: 96,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '600',
    color: '#1C1A17',
    fontVariant: ['tabular-nums'],
  },
  help: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B6560',
    textAlign: 'center',
    marginBottom: 20,
  },
  done: {
    backgroundColor: '#1C1A17',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
