import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePrefs } from '../context/AppPrefs';

export default function ScreenHeader({
  title,
  subtitle,
  photoUri,
  onProfile,
  showAlert = false,
}) {
  const insets = useSafeAreaInsets();
  const { colors } = usePrefs();
  return (
    <View style={[styles.row, { paddingTop: insets.top + 8 }]}>
      <View style={styles.text}>
        <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sub, { color: colors.muted }]}>{subtitle}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={[
          styles.avatar,
          { backgroundColor: colors.chipOn, borderColor: colors.line },
        ]}
        onPress={onProfile}
        activeOpacity={0.8}
      >
        <View style={styles.avatarClip}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <Ionicons name="person" size={20} color={colors.brandDeep} />
          )}
        </View>
        {showAlert ? (
          <View style={[styles.badge, { backgroundColor: colors.danger }]}>
            <Text style={styles.badgeTxt}>!</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  text: { flex: 1, paddingRight: 12 },
  title: { fontSize: 24, fontWeight: '800' },
  sub: { marginTop: 4, fontSize: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    borderWidth: 1,
  },
  avatarClip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: 40, height: 40 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '900', lineHeight: 14 },
});
