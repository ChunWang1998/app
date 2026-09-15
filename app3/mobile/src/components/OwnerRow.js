import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { usePrefs } from '../context/AppPrefs';
import { radius } from '../theme';
import { isNewUser } from '../lib/sort';

const CROWN = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function OwnerRow({ owner, crown, onPress }) {
  const { colors, t } = usePrefs();
  const newbie = isNewUser(owner);
  const slots = (owner.slots || []).slice(0, 3);
  const places = (owner.places || []).slice(0, 3);
  const subscribed = Boolean(owner.subscribed);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: newbie && !owner.isGuide ? colors.newGlow : colors.line,
          borderWidth: newbie && !owner.isGuide ? 2 : 1,
        },
        newbie && !owner.isGuide
          ? {
              shadowColor: colors.newGlow,
              shadowOpacity: 0.55,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 0 },
              elevation: 4,
            }
          : null,
      ]}
    >
      <View style={[styles.photo, { backgroundColor: colors.chipOn }]}>
        {owner.photoUri ? (
          <Image source={{ uri: owner.photoUri }} style={styles.photoImg} />
        ) : (
          <Text style={styles.emoji}>🐕</Text>
        )}
        {crown ? <Text style={styles.crown}>{CROWN[crown]}</Text> : null}
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
            {owner.dogName}
            {owner.ownerNick ? ` · ${owner.ownerNick}` : ''}
          </Text>
          {!owner.isGuide && !owner.isSeed ? (
            <Text
              style={[
                styles.subTag,
                {
                  color: subscribed ? '#fff' : colors.brandDeep,
                  backgroundColor: subscribed ? colors.ok : colors.chipOn,
                },
              ]}
            >
              {subscribed ? t('subscribedTag') : t('unsubscribedTag')}
            </Text>
          ) : null}
          {owner.ownerDogCount > 1 ? (
            <Text
              style={[
                styles.subTag,
                { color: colors.brandDeep, backgroundColor: colors.chipOn },
              ]}
            >
              同一主人
            </Text>
          ) : null}
          {newbie && !owner.isGuide ? (
            <Text
              style={[
                styles.subTag,
                { color: colors.brandDeep, backgroundColor: colors.chipOn },
              ]}
            >
              新
            </Text>
          ) : null}
        </View>
        <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={1}>
          {[owner.city, owner.district].filter(Boolean).join(' · ') || '地區未填'}
        </Text>
        <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={1}>
          {slots.map((s) => s.label || `${s.day}${s.slot}`).join('、') || '時段未填'}
        </Text>
        <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={1}>
          {places.join('、') || '地點未填'}
        </Text>
      </View>
      <View style={styles.countWrap}>
        <Text style={[styles.count, { color: colors.brandDeep }]}>
          {owner.outingCount || 0}
        </Text>
        <Text style={[styles.countLabel, { color: colors.muted }]}>出去次數</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.row,
    padding: 12,
    marginBottom: 10,
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  photoImg: { width: 64, height: 64 },
  emoji: { fontSize: 28 },
  crown: { position: 'absolute', right: -4, top: -6, fontSize: 16 },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 16, fontWeight: '800', flexShrink: 1 },
  subTag: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  meta: { marginTop: 3, fontSize: 12 },
  countWrap: { alignItems: 'center', paddingLeft: 8, minWidth: 56 },
  count: { fontSize: 18, fontWeight: '800' },
  countLabel: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
});
