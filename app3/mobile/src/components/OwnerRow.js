import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { colors, radius } from '../theme';
import { isNewUser } from '../lib/sort';

const CROWN = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function OwnerRow({ owner, crown, onPress }) {
  const newbie = isNewUser(owner);
  const slots = (owner.slots || []).slice(0, 3);
  const places = (owner.places || []).slice(0, 3);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.row, newbie && !owner.isGuide && styles.glow]}
    >
      <View style={styles.photo}>
        {owner.photoUri ? (
          <Image source={{ uri: owner.photoUri }} style={styles.photoImg} />
        ) : (
          <Text style={styles.emoji}>🐕</Text>
        )}
        {crown ? <Text style={styles.crown}>{CROWN[crown]}</Text> : null}
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {owner.dogName}
            {owner.ownerNick ? ` · ${owner.ownerNick}` : ''}
          </Text>
          {owner.isGuide ? <Text style={styles.guideTag}>範例</Text> : null}
          {newbie && !owner.isGuide ? <Text style={styles.newTag}>新</Text> : null}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {slots.map((s) => s.label || `${s.day}${s.slot}`).join('、') || '時段未填'}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {places.join('、') || '地點未填'}
        </Text>
      </View>
      <View style={styles.countWrap}>
        <Text style={styles.count}>{owner.outingCount || 0}</Text>
        <Text style={styles.countLabel}>出去次數</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.row,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  glow: {
    borderColor: colors.newGlow,
    borderWidth: 2,
    shadowColor: colors.newGlow,
    shadowOpacity: 0.55,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#F8EBD8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  photoImg: { width: 64, height: 64 },
  emoji: { fontSize: 28 },
  crown: { position: 'absolute', right: -4, top: -6, fontSize: 16 },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 16, fontWeight: '800', color: colors.ink, flexShrink: 1 },
  newTag: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brandDeep,
    backgroundColor: '#FFE2C8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  guideTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    backgroundColor: colors.ok,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  meta: { marginTop: 3, fontSize: 12, color: colors.muted },
  countWrap: { alignItems: 'center', paddingLeft: 8, minWidth: 56 },
  count: { fontSize: 18, fontWeight: '800', color: colors.brandDeep },
  countLabel: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
    textAlign: 'center',
  },
});
