import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { colors, radius } from '../theme';

export default function HelpModal({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>說明</Text>

          <Text style={styles.label}>支援類型</Text>
          <Text style={styles.body}>7-11</Text>
          <Text style={styles.note}>陸續開放路易莎、全家等等</Text>

          <Text style={[styles.label, { marginTop: 14 }]}>支援地點</Text>
          <Text style={styles.body}>高雄市、台南市、新北市、台北市</Text>
          <Text style={styles.note}>陸續開放其他縣市</Text>

          <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.btnText}>知道了</Text>
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
