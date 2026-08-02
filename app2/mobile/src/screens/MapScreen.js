import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors, radius } from '../theme';
import { formatDistance, formatHours, nearestOpen } from '../lib/geo';
import places from '../../assets/dataSet.json';

const DEFAULT_CENTER = { lat: 22.6273, lng: 120.3014 }; // Kaohsiung

function mapsUrl(place) {
  const label = encodeURIComponent(`${place.type}${place.name ? ` ${place.name}` : ''} ${place.地址}`);
  if (Platform.OS === 'ios') {
    return `http://maps.apple.com/?daddr=${place.lat},${place.lng}&q=${label}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&travelmode=walking`;
}

export default function MapScreen({ onBack }) {
  const mapRef = useRef(null);
  const [status, setStatus] = useState('locating');
  const [userPos, setUserPos] = useState(null);

  const nearest = useMemo(() => {
    if (!userPos) return [];
    return nearestOpen(userPos, places, 3);
  }, [userPos]);

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
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!alive) return;
        setUserPos({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
        setStatus('ready');
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
      edgePadding: { top: 60, right: 40, bottom: 40, left: 40 },
      animated: true,
    });
  }, [userPos, nearest]);

  const statusText = {
    locating: '正在定位…',
    ready: '附近營業中的廁所',
    denied: '無法取得定位，改用高雄市中心示範',
    error: '定位失敗，改用高雄市中心示範',
  }[status];

  return (
    <View style={styles.fill}>
      <View style={styles.bar}>
        <TouchableOpacity style={styles.back} onPress={onBack} activeOpacity={0.8}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>急廁 Go</Text>
          <Text style={styles.status}>{statusText}</Text>
        </View>
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
            {status !== 'ready' && (
              <Marker
                coordinate={{ latitude: userPos.lat, longitude: userPos.lng }}
                title="示範位置"
                pinColor={colors.accent}
              />
            )}
            {nearest.map((place, index) => (
              <Marker
                key={place.id}
                coordinate={{ latitude: place.lat, longitude: place.lng }}
                title={`${index + 1}. ${place.type}${place.name ? ` ${place.name}` : ''}`}
                description={place.地址}
                pinColor={colors.brand}
              />
            ))}
          </MapView>
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        )}
      </View>

      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.sheetContent}>
          {status === 'locating' && (
            <Text style={styles.empty}>定位中，請稍候…</Text>
          )}
          {status !== 'locating' && nearest.length === 0 && (
            <Text style={styles.empty}>附近找不到營業中的廁所</Text>
          )}
          {nearest.map((place, index) => (
            <View key={place.id} style={styles.card}>
              <View style={styles.rank}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>
                  {place.type}
                  {place.name ? ` ${place.name}` : ''}
                </Text>
                <Text style={styles.cardAddr}>{place.地址}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>{formatDistance(place.distance)}</Text>
                  <Text style={styles.meta}>
                    {formatHours(place.營業時間)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.navBtn}
                activeOpacity={0.85}
                onPress={() => Linking.openURL(mapsUrl(place))}
              >
                <Text style={styles.navText}>導航</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
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
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E7F6F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 18,
    color: colors.ink,
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
  },
  sheetContent: {
    padding: 14,
    paddingBottom: 28,
    gap: 10,
  },
  empty: {
    textAlign: 'center',
    color: colors.muted,
    marginVertical: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.card,
    backgroundColor: '#F7FFFC',
    borderWidth: 1,
    borderColor: 'rgba(26,155,142,0.12)',
  },
  rank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#E8F7F4',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    maxWidth: '100%',
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
