import React from 'react';
import {
  Modal,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { colors, radius } from '../theme';
import { t, useLanguage } from '../i18n';

export default function HelpModal({ visible, onClose }) {
  useLanguage();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{t('help.title')}</Text>

          <Text style={styles.label}>{t('help.freeLabel')}</Text>
          <Text style={styles.body}>{t('help.freeBody')}</Text>
          <Text style={styles.note}>{t('help.freeNote')}</Text>

          <Text style={[styles.label, { marginTop: 14 }]}>{t('help.fullLabel')}</Text>
          <Text style={styles.body}>{t('help.fullBody')}</Text>
          <Text style={styles.price}>{t('help.price')}</Text>
          <Text style={styles.note}>{t('help.offlineNote')}</Text>

          <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.btnText}>{t('help.ok')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(23,51,47,0.4)',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.sheet,
    padding: 22,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.brandDeep,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 4,
  },
  body: {
    fontSize: 16,
    color: colors.ink,
    lineHeight: 24,
    fontWeight: '700',
  },
  price: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '800',
    color: colors.brandDeep,
  },
  note: {
    marginTop: 4,
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  btn: {
    marginTop: 20,
    backgroundColor: colors.brand,
    paddingVertical: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});
