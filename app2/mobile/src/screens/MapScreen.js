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
  Dimensions,
} from 'react-native';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
import { colors, radius } from '../theme';
import { nearestOpen, haversineMeters, isOpenNow } from '../lib/geo';
import { fetchComments, submitComment } from '../lib/community';
import { isSupabaseConfigured } from '../lib/supabase';
import { cellKey, loadPlacesNear, loadPlacesInRegion } from '@shared/places';

let _loadCellSync;
try {
  const reg = require('../data/cellRegistry');
  _loadCellSync = reg.loadCellSync;
} catch {
  _loadCellSync = undefined;
}
import PlaceDetailSheet from '../components/PlaceDetailSheet';
import HelpModal from '../components/HelpModal';
import PlaceActionsModal from '../components/PlaceActionsModal';

const DEFAULT_CENTER = { lat: 22.6273, lng: 120.3014 };
const LOCATE_TIMEOUT_MS = 6000;
const POOL_SIZE = 25;
const NEAR_MARKER_CAP = 3;
const ALL_MARKER_CAP = 80;
const REGION_LOAD_DEBOUNCE_MS = 600;
const RECENTER_DELTA = 0.04;
const PLACES_BASE_URL = (process.env.EXPO_PUBLIC_PLACES_URL || '').replace(/\/$/, '');

function regionAround(lat, lng, delta = RECENTER_DELTA) {
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

function placeInRegion(place, region) {
  if (!region) return true;
  const halfLat = region.latitudeDelta / 2;
  const halfLng = region.longitudeDelta / 2;
  return (
    place.lat >= region.latitude - halfLat &&
    place.lat <= region.latitude + halfLat &&
    place.lng >= region.longitude - halfLng &&
    place.lng <= region.longitude + halfLng
  );
}

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

export default function MapScreen() {
  const mapRef = useRef(null);
  const [status, setStatus] = useState('locating');
  const [userPos, setUserPos] = useState(null);
  const [places, setPlaces] = useState([]);
  const [placesStatus, setPlacesStatus] = useState('idle');
  const [viewportPlaces, setViewportPlaces] = useState([]);
  const [viewportStatus, setViewportStatus] = useState('idle');
  const [mapCenter, setMapCenter] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);
  const [comments, setComments] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [actionPlace, setActionPlace] = useState(null);
  const [recentering, setRecentering] = useState(false);

  const userCell = userPos ? cellKey(userPos.lat, userPos.lng) : null;
  const regionTimer = useRef(null);
  const didInitialFit = useRef(false);
  const skipNextRegion = useRef(false);
  const viewportReq = useRef(0);
  const lastCommunityKey = useRef('');

  const loadRegion = useCallback(async (lat, lng, { mergePlaces = false } = {}) => {
    try {
      const rows = await loadPlacesNear(lat, lng, {
        baseUrl: PLACES_BASE_URL,
        loadCellSync: PLACES_BASE_URL ? undefined : _loadCellSync,
      });
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

  const loadViewport = useCallback(async (region) => {
    if (!region) return;
    const req = ++viewportReq.current;
    setViewportStatus('loading');
    try {
      const rows = await loadPlacesInRegion(region, {
        baseUrl: PLACES_BASE_URL,
        loadCellSync: PLACES_BASE_URL ? undefined : _loadCellSync,
      });
      if (req !== viewportReq.current) return;
      setViewportPlaces(rows);
      setViewportStatus('ready');
    } catch (e) {
      if (req !== viewportReq.current) return;
      console.warn('viewport load failed', e?.message || e);
      setViewportStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      Alert.alert(
        '尚未連接雲端',
        '請在 mobile/.env 設定 EXPO_PUBLIC_SUPABASE_URL 與 EXPO_PUBLIC_SUPABASE_ANON_KEY，並在 Supabase 執行 supabase/schema.sql。留言需連線後才會同步給所有人。',
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

  // When switching to "全部", load viewport cells immediately
  useEffect(() => {
    if (showAll && mapRegion) {
      loadViewport(mapRegion);
    }
  }, [showAll, loadViewport, mapRegion]);

  const refreshCommunity = useCallback(async (placeIds) => {
    if (!isSupabaseConfigured || !placeIds?.length) return;
    try {
      const c = await fetchComments(placeIds);
      setComments((prev) => ({ ...prev, ...c }));
    } catch (e) {
      const msg = e?.message || String(e);
      const details = e?.details || e?.hint || '';
      console.warn('community refresh failed', msg, details || '');
    }
  }, []);

  useEffect(() => {
    const origin = showAll ? mapCenter || userPos : userPos;
    const source = showAll ? viewportPlaces : places;
    if (!origin || !source.length || !isSupabaseConfigured) return;
    const ids = nearestOpen(origin, source, POOL_SIZE).map((p) => p.id);
    const key = `${showAll ? 'all' : 'near'}:${ids.join(',')}`;
    if (key === lastCommunityKey.current) return;
    lastCommunityKey.current = key;
    refreshCommunity(ids);
  }, [userPos, mapCenter, places, viewportPlaces, showAll, refreshCommunity]);

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
    () => pool.slice(0, NEAR_MARKER_CAP),
    [pool],
  );

  const allOpen = useMemo(() => {
    if (!viewportPlaces.length) return [];
    const origin = mapCenter || userPos;
    return viewportPlaces
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .filter((p) => placeInRegion(p, mapRegion))
      .filter((p) => isOpenNow(p.營業時間))
      .map((p) => ({
        ...p,
        distance: origin
          ? haversineMeters(origin, { lat: p.lat, lng: p.lng })
          : 0,
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, ALL_MARKER_CAP);
  }, [viewportPlaces, mapRegion, mapCenter, userPos]);

  const mapMarkers = useMemo(
    () => (showAll ? allOpen : nearest),
    [showAll, allOpen, nearest],
  );

  const selected = useMemo(() => {
    if (!selectedId) return null;
    const raw =
      nearest.find((p) => p.id === selectedId) ||
      allOpen.find((p) => p.id === selectedId) ||
      places.find((p) => p.id === selectedId) ||
      viewportPlaces.find((p) => p.id === selectedId) ||
      null;
    if (!raw) return null;
    if (!userPos) return raw;
    return {
      ...raw,
      distance: haversineMeters(userPos, { lat: raw.lat, lng: raw.lng }),
    };
  }, [allOpen, nearest, places, viewportPlaces, selectedId, userPos]);

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

  const selectPlace = useCallback((place) => {
    if (!place?.id) return;
    skipNextRegion.current = true;
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
    setTimeout(() => setSelectedId(place.id), 50);
  }, []);

  const closeSelected = useCallback(() => {
    setSelectedId(null);
  }, []);

  const recenterOnUser = useCallback(async () => {
    if (recentering) return;
    setRecentering(true);
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        Alert.alert('無法定位', '請允許定位權限，才能回到目前位置');
        return;
      }

      let pos = userPos;
      try {
        const loc = await withTimeout(
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
          }),
          LOCATE_TIMEOUT_MS,
        );
        pos = coordsFrom(loc);
        setUserPos(pos);
        setStatus('ready');
      } catch {
        if (!pos || status !== 'ready') {
          Alert.alert('無法定位', '請稍後再試');
          return;
        }
      }

      const homeRegion = regionAround(pos.lat, pos.lng);
      setMapCenter({ lat: pos.lat, lng: pos.lng });
      setMapRegion(homeRegion);
      skipNextRegion.current = true;
      mapRef.current?.animateToRegion(homeRegion, 400);
      setTimeout(() => {
        skipNextRegion.current = false;
      }, 500);
    } finally {
      setRecentering(false);
    }
  }, [recentering, userPos, status]);

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
    if (showAll && viewportStatus === 'loading') return '載入地圖範圍地點…';
    if (placesStatus === 'error') return '地點資料載入失敗';
    if (status === 'denied') return '無法取得定位，改用高雄市中心示範';
    if (status === 'error') return '定位失敗，改用高雄市中心示範';
    return '';
  })();

  const markerCount = mapMarkers.length;

  return (
    <View style={styles.fill}>
      <View style={styles.fill}>
        <View style={styles.bar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>急廁 Go</Text>
            {!!statusText && <Text style={styles.status}>{statusText}</Text>}
          </View>
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
              <Text style={[styles.tabText, showAll && styles.tabTextActive]}>全部</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.helpBtn}
            onPress={() => setHelpOpen(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.helpText}>說明</Text>
          </TouchableOpacity>
        </View>

        {showAll && markerCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              地圖範圍 {markerCount} 間營業中
            </Text>
          </View>
        )}

        <View style={styles.mapWrap}>
          {userPos ? (
            <ClusteredMapView
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
              onRegionChangeComplete={handleRegionChange}
              clusterColor={colors.brand}
              clusterTextColor="#fff"
              clusterFontFamily={Platform.OS === 'ios' ? 'System' : 'sans-serif-medium'}
              radius={40}
              minZoom={1}
              maxZoom={20}
              extent={256}
              animationEnabled={false}
              tracksViewChanges={false}
            >
              {mapMarkers.map((place, index) => (
                <Marker
                  key={place.id}
                  coordinate={{ latitude: place.lat, longitude: place.lng }}
                  title={`${index + 1}. ${placeLabel(place)}`}
                  description={place.地址}
                  pinColor={colors.brand}
                  tracksViewChanges={false}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    selectPlace(place);
                  }}
                />
              ))}
            </ClusteredMapView>
          ) : (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.brand} />
            </View>
          )}
        </View>

        {selected && (
          <PlaceDetailSheet
            key={selected.id}
            place={selected}
            comments={comments[selected.id] || []}
            seedNotes={selected.備註 || []}
            onClose={closeSelected}
            onNavigate={openGoogleMaps}
            onSubmitComment={handleSubmitComment}
          />
        )}

        {userPos ? (
          <TouchableOpacity
            style={[
              styles.locateBtn,
              {
                bottom: selected
                  ? Math.round(Dimensions.get('window').height * 0.34) + 12
                  : 28,
              },
            ]}
            onPress={recenterOnUser}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="回到目前位置"
            disabled={recentering}
          >
            {recentering ? (
              <ActivityIndicator size="small" color={colors.brand} />
            ) : (
              <MaterialIcons name="my-location" size={22} color={colors.brandDeep} />
            )}
          </TouchableOpacity>
        ) : null}

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
  tabRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tab: {
    paddingHorizontal: 12,
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
  countBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 106 : 68,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    zIndex: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brandDeep,
  },
  mapWrap: {
    flex: 1,
    backgroundColor: colors.mapBg,
  },
  locateBtn: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
