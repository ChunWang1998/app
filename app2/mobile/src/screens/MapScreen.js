import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
import { colors, radius, voteTone } from '../theme';
import { nearestOpen, cityNear, placeInRegion, haversineMeters } from '../lib/geo';
import {
  fetchVoteState,
  fetchComments,
  submitVote,
  submitComment,
  mergeVoteState,
} from '../lib/community';
import { isSupabaseConfigured } from '../lib/supabase';
import { cellKey, loadPlacesNear, loadPlacesByCity } from '@shared/places';

let _loadCellSync;
let _loadCitySync;
try {
  const reg = require('../data/cellRegistry');
  _loadCellSync = reg.loadCellSync;
  _loadCitySync = reg.loadCitySync;
} catch {
  _loadCellSync = undefined;
  _loadCitySync = undefined;
}
import PlaceCard from '../components/PlaceCard';
import PlaceDetailSheet from '../components/PlaceDetailSheet';
import HelpModal from '../components/HelpModal';
import PlaceActionsModal from '../components/PlaceActionsModal';

const DEFAULT_CENTER = { lat: 22.6273, lng: 120.3014 }; // Kaohsiung
const LOCATE_TIMEOUT_MS = 6000;
const POOL_SIZE = 25;
const REGION_LOAD_DEBOUNCE_MS = 600;
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

function runningInExpoGo() {
  try {
    const Constants = require('expo-constants').default ?? require('expo-constants');
    return (
      Constants.appOwnership === 'expo' ||
      Constants.executionEnvironment === 'storeClient'
    );
  } catch {
    return false;
  }
}

async function openGoogleMaps(place) {
  const lat = Number(place?.lat);
  const lng = Number(place?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    Alert.alert('無法導航', '此地點沒有有效座標');
    return;
  }

  const dest = `${lat},${lng}`;
  const googleWebUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking`;
  const googleAppUrl = `comgooglemaps://?daddr=${dest}&directionsmode=walking`;

  const openWeb = async () => {
    await Linking.openURL(googleWebUrl);
  };

  try {
    // Expo Go cannot query/open comgooglemaps:// (Info.plist not applied) and
    // that path native-crashes locally. HTTPS still opens Google Maps
    // (app via universal link if installed, otherwise the web UI).
    if (runningInExpoGo()) {
      await openWeb();
      return;
    }
    const canOpenApp = await Linking.canOpenURL(googleAppUrl).catch(() => false);
    await Linking.openURL(canOpenApp ? googleAppUrl : googleWebUrl);
  } catch (e) {
    try {
      await openWeb();
    } catch {
      Alert.alert('無法開啟地圖', e?.message || '請稍後再試');
    }
  }
}

const LIST_SNAPS = ['14%', '45%', '85%'];

export default function MapScreen() {
  const mapRef = useRef(null);
  const listSheetRef = useRef(null);
  const [status, setStatus] = useState('locating');
  const [userPos, setUserPos] = useState(null);
  const [places, setPlaces] = useState([]);
  const [placesStatus, setPlacesStatus] = useState('idle');
  const [cityPlaces, setCityPlaces] = useState([]);
  const [cityStatus, setCityStatus] = useState('idle');
  const [currentCity, setCurrentCity] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);
  const [votes, setVotes] = useState({ scores: {}, myVotes: {} });
  const [comments, setComments] = useState({});
  const [hiddenIds, setHiddenIds] = useState(() => new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [actionPlace, setActionPlace] = useState(null);

  const userCell = userPos ? cellKey(userPos.lat, userPos.lng) : null;
  const regionTimer = useRef(null);
  const didInitialFit = useRef(false);
  const skipNextRegion = useRef(false);
  const lastCommunityKey = useRef('');

  const loadRegion = useCallback(async (lat, lng, { mergePlaces = false } = {}) => {
    try {
      const rows = await loadPlacesNear(lat, lng, {
        baseUrl: PLACES_BASE_URL,
        loadCellSync: PLACES_BASE_URL ? undefined : _loadCellSync,
      });
      const city = cityNear({ lat, lng }, rows);
      if (city) setCurrentCity(city);
      if (mergePlaces) {
        if (rows.length) {
          setPlaces((prev) => {
            const byId = new Map(prev.map((p) => [p.id, p]));
            for (const r of rows) if (r?.id != null) byId.set(r.id, r);
            return [...byId.values()];
          });
        }
        setPlacesStatus('ready');
      }
    } catch (e) {
      console.warn('places load failed', e?.message || e);
      if (mergePlaces) setPlacesStatus('error');
    }
  }, []);

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
    setPlacesStatus('loading');
    setMapCenter((prev) => prev || { lat: userPos.lat, lng: userPos.lng });
    setMapRegion((prev) => prev || {
      latitude: userPos.lat,
      longitude: userPos.lng,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    });
    loadRegion(userPos.lat, userPos.lng, { mergePlaces: true });
  }, [userCell, loadRegion]);

  useEffect(() => {
    if (!currentCity) return;
    let alive = true;
    setCityPlaces([]);
    setCityStatus('loading');
    loadPlacesByCity(currentCity, {
      baseUrl: PLACES_BASE_URL,
      loadCitySync: _loadCitySync,
    })
      .then((rows) => {
        if (!alive) return;
        setCityPlaces(Array.isArray(rows) ? rows : []);
        setCityStatus('ready');
      })
      .catch((e) => {
        console.warn('city load failed', e?.message || e);
        if (!alive) return;
        setCityPlaces([]);
        setCityStatus('error');
      });
    return () => {
      alive = false;
    };
  }, [currentCity]);

  useEffect(() => {
    return () => {
      if (regionTimer.current) clearTimeout(regionTimer.current);
    };
  }, []);

  const handleRegionChange = useCallback(
    (region) => {
      if (skipNextRegion.current) {
        skipNextRegion.current = false;
        return;
      }
      setMapRegion(region);
      setMapCenter({ lat: region.latitude, lng: region.longitude });
      if (regionTimer.current) clearTimeout(regionTimer.current);
      regionTimer.current = setTimeout(() => {
        loadRegion(region.latitude, region.longitude, { mergePlaces: false });
      }, REGION_LOAD_DEBOUNCE_MS);
    },
    [loadRegion],
  );

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
    const origin = showAll ? mapCenter || userPos : userPos;
    const source = showAll ? cityPlaces : places;
    if (!origin || !source.length || !isSupabaseConfigured) return;
    const ids = nearestOpen(origin, source, POOL_SIZE).map((p) => p.id);
    const key = `${showAll ? 'all' : 'near'}:${ids.join(',')}`;
    if (key === lastCommunityKey.current) return;
    lastCommunityKey.current = key;
    refreshCommunity(ids);
  }, [userPos, mapCenter, places, cityPlaces, showAll, refreshCommunity]);

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

  const allOpen = useMemo(() => {
    const origin = mapCenter || userPos;
    if (!origin || !cityPlaces.length) return [];
    return nearestOpen(origin, cityPlaces, Infinity);
  }, [mapCenter, userPos, cityPlaces]);

  const nearest = useMemo(
    () => pool.filter((p) => !hiddenIds.has(p.id)).slice(0, 3),
    [pool, hiddenIds],
  );

  const visiblePlaces = useMemo(
    () => (showAll ? allOpen : nearest),
    [showAll, allOpen, nearest],
  );

  const mapMarkers = useMemo(() => {
    if (!showAll) return nearest;
    const inView = mapRegion
      ? allOpen.filter((p) => placeInRegion(p, mapRegion))
      : allOpen;
    return inView.slice(0, 80);
  }, [showAll, nearest, allOpen, mapRegion]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    const raw =
      nearest.find((p) => p.id === selectedId) ||
      allOpen.find((p) => p.id === selectedId) ||
      places.find((p) => p.id === selectedId) ||
      cityPlaces.find((p) => p.id === selectedId) ||
      null;
    if (!raw) return null;
    if (!userPos) return raw;
    return {
      ...raw,
      distance: haversineMeters(userPos, { lat: raw.lat, lng: raw.lng }),
    };
  }, [allOpen, nearest, places, cityPlaces, selectedId, userPos]);

  useEffect(() => {
    if (didInitialFit.current || !mapRef.current || !userPos) return;
    if (placesStatus === 'idle' || placesStatus === 'loading') return;
    didInitialFit.current = true;
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
      edgePadding: { top: 60, right: 40, bottom: 40, left: 40 },
      animated: true,
    });
  }, [userPos, nearest, placesStatus]);

  const collapseList = useCallback(() => {
    if (selectedId) return;
    listSheetRef.current?.snapToIndex(0);
  }, [selectedId]);

  const selectPlace = useCallback((place) => {
    if (!place?.id) return;
    skipNextRegion.current = true;
    listSheetRef.current?.snapToIndex(0);
    if (mapRef.current && Number.isFinite(place.lat) && Number.isFinite(place.lng)) {
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
    // Defer so the map/list press gesture finishes before the detail sheet mounts.
    setTimeout(() => setSelectedId(place.id), 50);
  }, []);

  const closeSelected = useCallback(() => {
    setSelectedId(null);
    requestAnimationFrame(() => {
      listSheetRef.current?.snapToIndex(1);
    });
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
        if (selectedId === place.id) closeSelected();
      } catch (e) {
        Alert.alert('投票失敗', e?.message || '請稍後再試');
      }
    },
    [votes.myVotes, selectedId, closeSelected],
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
    if (showAll && cityStatus === 'loading' && currentCity) {
      return `載入${currentCity}地點…`;
    }
    if (placesStatus === 'error') return '地點資料載入失敗';
    if (status === 'denied') return '無法取得定位，改用高雄市中心示範';
    if (status === 'error') return '定位失敗，改用高雄市中心示範';
    return '';
  })();

  return (
    <View style={styles.fill}>
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
              onPress={collapseList}
              onRegionChangeComplete={handleRegionChange}
            >
              {mapMarkers.map((place, index) => {
                const tone = voteTone(votes.scores?.[place.id] || 0);
                return (
                  <Marker
                    key={place.id}
                    coordinate={{ latitude: place.lat, longitude: place.lng }}
                    title={`${index + 1}. ${placeLabel(place)}`}
                    description={place.地址}
                    pinColor={tone.sparkle ? '#FFD700' : tone.fill}
                    tracksViewChanges={false}
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      selectPlace(place);
                    }}
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

        <BottomSheet
          ref={listSheetRef}
          index={1}
          snapPoints={LIST_SNAPS}
          enableHandlePanningGesture={!selected}
          enableContentPanningGesture={!selected}
          backgroundStyle={styles.sheetBg}
          handleIndicatorStyle={styles.sheetHandle}
        >
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, !showAll && styles.tabActive]}
                onPress={() => setShowAll(false)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabText, !showAll && styles.tabTextActive]}>附近</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, showAll && styles.tabActive]}
                onPress={() => setShowAll(true)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabText, showAll && styles.tabTextActive]}>
                  全部{currentCity ? ` · ${currentCity}` : ''}
                </Text>
              </TouchableOpacity>
            </View>

            {(status === 'locating' ||
              (!showAll && placesStatus === 'loading') ||
              (showAll && cityStatus === 'loading')) && (
              <Text style={styles.empty}>
                {status === 'locating'
                  ? '定位中，請稍候…'
                  : showAll && currentCity
                    ? `載入${currentCity}地點…`
                    : '載入附近地點…'}
              </Text>
            )}
            {status !== 'locating' &&
              !(showAll ? cityStatus === 'loading' : placesStatus === 'loading') &&
              visiblePlaces.length === 0 && (
              <Text style={styles.empty}>
                {showAll && cityStatus === 'error'
                  ? '縣市資料載入失敗'
                  : placesStatus === 'error'
                    ? '地點資料載入失敗'
                    : showAll
                      ? '此縣市找不到營業中的廁所'
                      : '附近找不到營業中的廁所'}
              </Text>
            )}

            <BottomSheetFlatList
              data={visiblePlaces}
              keyExtractor={(p) => p.id}
              contentContainerStyle={styles.sheetContent}
              renderItem={({ item: place, index }) => (
                <PlaceCard
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
              )}
              ListFooterComponent={
                visiblePlaces.length > 0 ? (
                  <Text style={styles.hint}>
                    右滑讚 · 左滑倒讚換下一間 · 長按可複製／分享 · 點選看詳情
                  </Text>
                ) : null
              }
            />
          </BottomSheet>

        {selected && (
          <PlaceDetailSheet
            key={selected.id}
            place={selected}
            vote={votes.scores?.[selected.id] || 0}
            comments={comments[selected.id] || []}
            seedNotes={selected.備註 || []}
            onClose={closeSelected}
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
    </View>
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
    flex: 1,
    backgroundColor: colors.mapBg,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBg: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  sheetHandle: {
    backgroundColor: 'rgba(23,51,47,0.2)',
    width: 42,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#E8F7F4',
  },
  tabActive: {
    backgroundColor: colors.brand,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brandDeep,
  },
  tabTextActive: {
    color: '#fff',
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
