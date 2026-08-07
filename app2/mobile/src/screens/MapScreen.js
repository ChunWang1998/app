import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors, radius, voteTone } from '../theme';
import { nearestOpen } from '../lib/geo';
import {
  fetchVoteState,
  fetchComments,
  submitVote,
  submitComment,
  mergeVoteState,
} from '../lib/community';
import { isSupabaseConfigured } from '../lib/supabase';
import { cellKey, loadPlacesNear } from '@shared/places';
import { loadCellSync } from '../data/cellRegistry';
import PlaceCard from '../components/PlaceCard';
import PlaceDetailSheet from '../components/PlaceDetailSheet';
import HelpModal from '../components/HelpModal';
import PlaceActionsModal from '../components/PlaceActionsModal';

const DEFAULT_CENTER = { lat: 22.6273, lng: 120.3014 }; // Kaohsiung
const LOCATE_TIMEOUT_MS = 6000;
const POOL_SIZE = 25;
const PLACES_BASE_URL = (process.env.EXPO_PUBLIC_PLACES_URL || '').replace(/\/$/, '');

function coordsFrom(loc) {
  return { lat: loc.coords.latitude, lng: loc.coords.longitude };
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('location timeout')), ms);
    }),
  ]);
}

function placeLabel(place) {
  return `${place.type}${place.name ? ` ${place.name}` : ''}`;
}

function shareMessage(place) {
  return `${placeLabel(place)}\n${place.地址 || ''}`;
}

async function openGoogleMaps(place) {
  const dest = `${place.lat},${place.lng}`;
  const appUrl = `comgooglemaps://?daddr=${dest}&directionsmode=walking`;
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking`;
  try {
    const canOpenApp = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canOpenApp ? appUrl : webUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}

export default function MapScreen() {
  const mapRef = useRef(null);
  const [status, setStatus] = useState('locating');
  const [userPos, setUserPos] = useState(null);
  const [places, setPlaces] = useState([]);
  const [placesStatus, setPlacesStatus] = useState('idle');
  const [votes, setVotes] = useState({ scores: {}, myVotes: {} });
  const [comments, setComments] = useState({});
  const [hiddenIds, setHiddenIds] = useState(() => new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [actionPlace, setActionPlace] = useState(null);

  const userCell = userPos ? cellKey(userPos.lat, userPos.lng) : null;

  useEffect(() => {
    if (!isSupabaseConfigured) {
      Alert.alert(
        '尚未連接雲端',
        '請在 mobile/.env 設定 EXPO_PUBLIC_SUPABASE_URL 與 EXPO_PUBLIC_SUPABASE_ANON_KEY，並在 Supabase 執行 supabase/schema.sql。投票與留言需連線後才會同步給所有人。',
      );
    }
  }, []);

  useEffect(() => {
    if (!userPos) return;
    let cancelled = false;
    setPlacesStatus('loading');
    loadPlacesNear(userPos.lat, userPos.lng, {
      baseUrl: PLACES_BASE_URL,
      loadCellSync: PLACES_BASE_URL ? undefined : loadCellSync,
    })
      .then((rows) => {
        if (cancelled) return;
        setPlaces(rows);
        setPlacesStatus('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        console.warn('places load failed', e?.message || e);
        setPlaces([]);
        setPlacesStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [userCell]);

  const refreshCommunity = useCallback(async (placeIds) => {
    if (!isSupabaseConfigured || !placeIds?.length) return;
    try {
      const [v, c] = await Promise.all([
        fetchVoteState(placeIds),
        fetchComments(placeIds),
      ]);
      setVotes((prev) => mergeVoteState(prev, v));
      setComments((prev) => ({ ...prev, ...c }));
    } catch (e) {
      const msg = e?.message || String(e);
      const details = e?.details || e?.hint || '';
      console.warn('community refresh failed', msg, details || '');
    }
  }, []);

  useEffect(() => {
    if (!userPos || !places.length || !isSupabaseConfigured) return;
    const ids = nearestOpen(userPos, places, POOL_SIZE).map((p) => p.id);
    refreshCommunity(ids);
  }, [userPos, places, refreshCommunity]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { status: perm } = await Location.requestForegroundPermissionsAsync();
        if (!alive) return;
        if (perm !== 'granted') {
          setUserPos(DEFAULT_CENTER);
          setStatus('denied');
          return;
        }

        const last = await Location.getLastKnownPositionAsync();
        if (!alive) return;
        if (last) {
          setUserPos(coordsFrom(last));
          setStatus('ready');
        }

        try {
          const loc = await withTimeout(
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Low,
            }),
            LOCATE_TIMEOUT_MS,
          );
          if (!alive) return;
          setUserPos(coordsFrom(loc));
          setStatus('ready');
        } catch {
          if (!alive) return;
          if (!last) {
            setUserPos(DEFAULT_CENTER);
            setStatus('error');
          }
        }
      } catch {
        if (!alive) return;
        setUserPos(DEFAULT_CENTER);
        setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const pool = useMemo(() => {
    if (!userPos || !places.length) return [];
    return nearestOpen(userPos, places, POOL_SIZE);
  }, [userPos, places]);

  const nearest = useMemo(
    () => pool.filter((p) => !hiddenIds.has(p.id)).slice(0, 3),
    [pool, hiddenIds],
  );

  const selected = useMemo(
    () => pool.find((p) => p.id === selectedId) || nearest.find((p) => p.id === selectedId) || null,
    [pool, nearest, selectedId],
  );

  useEffect(() => {
    if (!mapRef.current || !userPos) return;
    const coords = [
      { latitude: userPos.lat, longitude: userPos.lng },
      ...nearest.map((p) => ({ latitude: p.lat, longitude: p.lng })),
    ];
    if (coords.length === 1) {
      mapRef.current.animateToRegion(
        {
          latitude: userPos.lat,
          longitude: userPos.lng,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        },
        400,
      );
      return;
    }
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 60, right: 40, bottom: selected ? 280 : 40, left: 40 },
      animated: true,
    });
  }, [userPos, nearest, selected]);

  const selectPlace = useCallback((place) => {
    setSelectedId(place.id);
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: place.lat,
          longitude: place.lng,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        350,
      );
    }
  }, []);

  const handleVoteUp = useCallback(
    async (place) => {
      if (!isSupabaseConfigured) {
        Alert.alert('尚未連接雲端', '請先設定 Supabase 後再投票。');
        return;
      }
      if (votes.myVotes?.[place.id]) {
        Alert.alert('已投過票', '每個廁所只能投票一次');
        return;
      }
      try {
        const result = await submitVote(place.id, 1);
        if (!result.applied) {
          Alert.alert('已投過票', '每個廁所只能投票一次');
        }
        setVotes((prev) => mergeVoteState(prev, result));
      } catch (e) {
        Alert.alert('投票失敗', e?.message || '請稍後再試');
      }
    },
    [votes.myVotes],
  );

  const handleVoteDown = useCallback(
    async (place) => {
      if (!isSupabaseConfigured) {
        Alert.alert('尚未連接雲端', '請先設定 Supabase 後再投票。');
        return;
      }
      if (votes.myVotes?.[place.id]) {
        Alert.alert('已投過票', '每個廁所只能投票一次');
        return;
      }
      try {
        const result = await submitVote(place.id, -1);
        if (!result.applied) {
          Alert.alert('已投過票', '每個廁所只能投票一次');
          setVotes((prev) => mergeVoteState(prev, result));
          return;
        }
        setVotes((prev) => mergeVoteState(prev, result));
        setHiddenIds((ids) => {
          const next = new Set(ids);
          next.add(place.id);
          return next;
        });
        if (selectedId === place.id) setSelectedId(null);
      } catch (e) {
        Alert.alert('投票失敗', e?.message || '請稍後再試');
      }
    },
    [votes.myVotes, selectedId],
  );

  const handleSubmitComment = useCallback(
    async (text) => {
      if (!selectedId) return;
      if (!isSupabaseConfigured) {
        Alert.alert('尚未連接雲端', '請先設定 Supabase 後再留言。');
        return;
      }
      try {
        const list = await submitComment(selectedId, text);
        setComments((prev) => ({ ...prev, [selectedId]: list }));
      } catch (e) {
        Alert.alert('留言失敗', e?.message || '請稍後再試');
      }
    },
    [selectedId],
  );

  const handleCopy = useCallback(async () => {
    if (!actionPlace) return;
    const payload = actionPlace.地址 || placeLabel(actionPlace);
    await Clipboard.setStringAsync(payload);
    setActionPlace(null);
    Alert.alert('已複製地址', payload);
  }, [actionPlace]);

  const handleShare = useCallback(async () => {
    if (!actionPlace) return;
    try {
      await Share.share({ message: shareMessage(actionPlace) });
    } catch {
      // user cancelled
    }
    setActionPlace(null);
  }, [actionPlace]);

  const statusText = (() => {
    if (status === 'locating') return '正在定位…';
    if (placesStatus === 'loading') return '載入附近地點…';
    if (placesStatus === 'error') return '地點資料載入失敗';
    if (status === 'denied') return '無法取得定位，改用高雄市中心示範';
    if (status === 'error') return '定位失敗，改用高雄市中心示範';
    return '';
  })();

  return (
    <GestureHandlerRootView style={styles.fill}>
      <View style={styles.fill}>
        <View style={styles.bar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>急廁 Go</Text>
            {!!statusText && <Text style={styles.status}>{statusText}</Text>}
          </View>
          <TouchableOpacity
            style={styles.helpBtn}
            onPress={() => setHelpOpen(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.helpText}>說明</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mapWrap}>
          {userPos ? (
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              initialRegion={{
                latitude: userPos.lat,
                longitude: userPos.lng,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
              }}
              showsUserLocation={status === 'ready'}
              showsMyLocationButton={false}
            >
              {nearest.map((place, index) => {
                const tone = voteTone(votes.scores?.[place.id] || 0);
                return (
                  <Marker
                    key={place.id}
                    coordinate={{ latitude: place.lat, longitude: place.lng }}
                    title={`${index + 1}. ${placeLabel(place)}`}
                    description={place.地址}
                    pinColor={tone.sparkle ? '#FFD700' : tone.fill}
                    onPress={() => selectPlace(place)}
                  />
                );
              })}
            </MapView>
          ) : (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.brand} />
            </View>
          )}
        </View>

        {!selected && (
          <View style={styles.sheet}>
            <ScrollView contentContainerStyle={styles.sheetContent}>
              {(status === 'locating' || placesStatus === 'loading') && (
                <Text style={styles.empty}>
                  {status === 'locating' ? '定位中，請稍候…' : '載入附近地點…'}
                </Text>
              )}
              {status !== 'locating' &&
                placesStatus !== 'loading' &&
                nearest.length === 0 && (
                <Text style={styles.empty}>
                  {placesStatus === 'error'
                    ? '地點資料載入失敗'
                    : '附近找不到營業中的廁所'}
                </Text>
              )}
              {nearest.map((place, index) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  index={index}
                  vote={votes.scores?.[place.id] || 0}
                  hasVoted={!!votes.myVotes?.[place.id]}
                  onPress={selectPlace}
                  onLongPress={setActionPlace}
                  onVoteUp={handleVoteUp}
                  onVoteDown={handleVoteDown}
                  onNavigate={openGoogleMaps}
                />
              ))}
              {nearest.length > 0 && (
                <Text style={styles.hint}>
                  右滑讚 · 左滑倒讚換下一間 · 長按可複製／分享 · 點選看詳情
                </Text>
              )}
            </ScrollView>
          </View>
        )}

        {selected && (
          <PlaceDetailSheet
            key={selected.id}
            place={selected}
            vote={votes.scores?.[selected.id] || 0}
            comments={comments[selected.id] || []}
            seedNotes={selected.備註 || []}
            onClose={() => setSelectedId(null)}
            onNavigate={openGoogleMaps}
            onSubmitComment={handleSubmitComment}
          />
        )}

        <HelpModal
          visible={helpOpen}
          onClose={() => setHelpOpen(false)}
        />

        <PlaceActionsModal
          visible={!!actionPlace}
          place={actionPlace}
          onCopy={handleCopy}
          onShare={handleShare}
          onClose={() => setActionPlace(null)}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.mapBg,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 56 : 18,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,155,142,0.15)',
    zIndex: 2,
  },
  brand: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.brandDeep,
  },
  status: {
    marginTop: 2,
    fontSize: 13,
    color: colors.muted,
  },
  helpBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: '#E7F6F3',
  },
  helpText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brandDeep,
  },
  mapWrap: {
    flex: 1.1,
    backgroundColor: colors.mapBg,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    flex: 0.95,
    marginTop: -18,
    backgroundColor: colors.sheet,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    shadowColor: '#17332F',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
    zIndex: 1,
  },
  sheetContent: {
    padding: 14,
    paddingBottom: 28,
  },
  empty: {
    textAlign: 'center',
    color: colors.muted,
    marginVertical: 12,
  },
  hint: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});
