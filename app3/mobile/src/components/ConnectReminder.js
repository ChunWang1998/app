import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { colors, radius } from '../theme';
import { CONNECT_REMINDER } from '../data/constants';

export default function ConnectReminder({ visible, peerName, onClose }) {
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade">
      <View style={styles.mask}>
        <View style={styles.card}>
          <Text style={styles.k}>CONNECT 成功</Text>
          <Text style={styles.title}>
            {peerName ? `已與 ${peerName} 連上` : '已連上'}
          </Text>
          <ScrollView style={styles.scroll}>
            <Text style={styles.body}>{CONNECT_REMINDER}</Text>
          </ScrollView>
          <TouchableOpacity style={styles.cta} onPress={onClose}>
            <Text style={styles.ctaText}>知道了</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: {
    flex: 1,
    backgroundColor: 'rgba(44,36,22,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.sheet,
    padding: 22,
    maxHeight: '80%',
  },
  k: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.ok,
    letterSpacing: 1.2,
  },
  title: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
  },
  scroll: { marginTop: 12, maxHeight: 220 },
  body: { fontSize: 14, lineHeight: 22, color: colors.ink },
  cta: {
    marginTop: 16,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
