import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { colors, radius, voteTone } from '../theme';
import { formatDistance, formatHours } from '../lib/geo';
import GoldSparkle from './GoldSparkle';

const voteIcons = require('../../assets/vote-icons.jpeg');
const SRC_W = 584;
const SRC_H = 349;
const BADGE = 56;
const IMG_H = BADGE;
const IMG_W = BADGE * (SRC_W / SRC_H);
const HALF_W = IMG_W / 2;

function VoteBadge({ up }) {
  return (
    <View style={styles.badgeClip}>
      <Image
        source={voteIcons}
        style={[styles.badgeImg, { marginLeft: up ? 0 : -HALF_W }]}
        resizeMode="stretch"
        accessibilityLabel={up ? '讚' : '倒讚'}
      />
    </View>
  );
}

function ActionStrip({ up, align }) {
  return (
    <View style={[styles.strip, { justifyContent: align }]}>
      <VoteBadge up={up} />
    </View>
  );
}

export default function PlaceCard({
  place,
  index,
  vote = 0,
  hasVoted = false,
  onPress,
  onLongPress,
  onVoteUp,
  onVoteDown,
  onNavigate,
}) {
  const swipeRef = useRef(null);
  const tone = voteTone(vote);

  const close = () => swipeRef.current?.close();

  return (
    <Swipeable
      ref={swipeRef}
      enabled={!hasVoted}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={() => <ActionStrip up align="flex-start" />}
      renderRightActions={() => <ActionStrip align="flex-end" />}
      onSwipeableOpen={(direction) => {
        if (hasVoted) {
          close();
          Alert.alert('已投過票', '每個廁所只能投票一次');
          return;
        }
        if (direction === 'left') {
          onVoteUp?.(place);
        } else {
          onVoteDown?.(place);
        }
        close();
      }}
    >
      <GoldSparkle active={!!tone.sparkle}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => onPress?.(place)}
          onLongPress={() => onLongPress?.(place)}
          delayLongPress={380}
          style={[
            styles.card,
            {
              borderColor: tone.border,
              backgroundColor: tone.bg,
              borderWidth: tone.sparkle ? 2 : 1.5,
            },
          ]}
        >
          <View
            style={[
              styles.rank,
              {
                backgroundColor: tone.fill,
                borderColor: tone.sparkle ? colors.voteGoldBright : 'transparent',
                borderWidth: tone.sparkle ? 1.5 : 0,
              },
            ]}
          >
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
              <Text style={styles.meta}>{formatHours(place.營業時間)}</Text>
              {vote !== 0 && (
                <Text
                  style={[
                    styles.meta,
                    tone.sparkle && styles.metaGold,
                    { color: tone.sparkle ? colors.voteGoldDeep : tone.fill },
                  ]}
                >
                  {vote > 0 ? `★ +${vote}` : vote}
                </Text>
              )}
              {hasVoted && <Text style={styles.meta}>已投票</Text>}
            </View>
          </View>
          <TouchableOpacity
            style={styles.navBtn}
            activeOpacity={0.85}
            onPress={() => onNavigate?.(place)}
          >
            <Text style={styles.navText}>導航</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </GoldSparkle>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  strip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  badgeClip: {
    width: HALF_W,
    height: IMG_H,
    overflow: 'hidden',
  },
  badgeImg: {
    width: IMG_W,
    height: IMG_H,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.card,
    backgroundColor: '#fff',
  },
  rank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: '#fff',
    fontWeight: '800',
    textShadowColor: 'rgba(184,134,11,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
  metaGold: {
    backgroundColor: colors.voteGoldBright,
    fontWeight: '800',
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
