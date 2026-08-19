import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';
import { formatDistance, formatHours, isHoursUnknown } from '../lib/geo';

export default function PlaceCard({
  place,
  index,
  onPress,
  onLongPress,
  onNavigate,
}) {
  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardPress}
        activeOpacity={0.88}
        onPress={() => onPress?.(place)}
        onLongPress={() => onLongPress?.(place)}
        delayLongPress={380}
      >
        <View style={styles.rank}>
          <Text style={styles.rankText}>{index + 1}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>
            {place.type}
            {place.name ? ` ${place.name}` : ''}
          </Text>
          <Text style={styles.cardAddr} numberOfLines={1}>
            {place.地址}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{formatDistance(place.distance)}</Text>
            <Text style={[styles.meta, isHoursUnknown(place.營業時間) && styles.metaUnknown]}>
              {formatHours(place.營業時間)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navBtn}
        activeOpacity={0.85}
        onPress={() => onNavigate?.(place)}
      >
        <Text style={styles.navText}>導航</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.card,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.brand,
  },
  cardPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  rankText: {
    color: '#fff',
    fontWeight: '800',
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  cardAddr: {
    marginTop: 2,
    fontSize: 13,
    color: colors.muted,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  meta: {
    fontSize: 11,
    color: colors.brandDeep,
    backgroundColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    maxWidth: '100%',
  },
  metaUnknown: {
    color: '#999',
    backgroundColor: '#F0F0F0',
  },
  navBtn: {
    backgroundColor: colors.ink,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  navText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
