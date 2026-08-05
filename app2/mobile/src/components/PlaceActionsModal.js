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

export default function PlaceActionsModal({ visible, place, onCopy, onShare, onClose }) {
  const title = place
    ? `${place.type}${place.name ? ` ${place.name}` : ''}`
    : '';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity style={styles.row} onPress={onCopy} activeOpacity={0.85}>
            <Text style={styles.rowText}>複製地址</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={onShare} activeOpacity={0.85}>
            <Text style={styles.rowText}>分享</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.cancelText}>取消</Text>
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
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 36,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(23,51,47,0.15)',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(23,51,47,0.08)',
  },
  rowText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  cancel: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: radius.pill,
    backgroundColor: '#F0F5F4',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.muted,
  },
});
