import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Circle, Marker, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import {
  Nunito_400Regular,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/nunito";
import { StatusBar } from "expo-status-bar";

import {
  checkInKaohsiung,
  fetchDetail,
  fetchNearby,
  fetchNearest,
  formatAge,
  formatPingPrice,
  NearbyResponse,
  PropertyDetail,
  PropertyPoint,
} from "./src/api";
import { MapLegend } from "./src/components/MapLegend";
import { PropertySheet } from "./src/components/PropertySheet";
import { StatusScreen } from "./src/components/StatusScreen";
import { colors, DISCLAIMER } from "./src/theme";

type Gate =
  | { kind: "loading"; title: string; body: string }
  | { kind: "denied" }
  | { kind: "outside" }
  | { kind: "ready"; coords: { lat: number; lng: number } };

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  const [gate, setGate] = useState<Gate>({
    kind: "loading",
    title: "正在確認定位…",
    body: "需要定位權限才能顯示你附近的成交點。",
  });
  const [nearby, setNearby] = useState<NearbyResponse | null>(null);
  const [nearest, setNearest] = useState<PropertyPoint | null>(null);
  const [nearestEmpty, setNearestEmpty] = useState<string | null>(null);
  const [selected, setSelected] = useState<PropertyPoint | null>(null);
  const [detail, setDetail] = useState<PropertyDetail | null>(null);

  const bootstrap = useCallback(async () => {
    setGate({
      kind: "loading",
      title: "正在確認定位…",
      body: "需要定位權限才能顯示你附近的成交點。",
    });

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setGate({ kind: "denied" });
      return;
    }

    // Local demo override (simulator outside Taiwan):
    // EXPO_PUBLIC_FORCE_LAT=22.6273 EXPO_PUBLIC_FORCE_LNG=120.3014
    const forceLat = process.env.EXPO_PUBLIC_FORCE_LAT;
    const forceLng = process.env.EXPO_PUBLIC_FORCE_LNG;
    let lat: number;
    let lng: number;
    if (forceLat && forceLng) {
      lat = Number(forceLat);
      lng = Number(forceLng);
    } else {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    }

    try {
      const geo = await checkInKaohsiung(lat, lng);
      if (!geo.in_kaohsiung) {
        setGate({ kind: "outside" });
        return;
      }
    } catch {
      // Backend unreachable: fall back to local Kaohsiung bbox for demo.
      const inBBox =
        lat >= 22.45 && lat <= 23.3 && lng >= 120.1 && lng <= 120.9;
      if (!inBBox) {
        setGate({ kind: "outside" });
        return;
      }
    }

    setGate({ kind: "ready", coords: { lat, lng } });

    try {
      const [near, nearestRes] = await Promise.all([
        fetchNearby(lat, lng),
        fetchNearest(lat, lng),
      ]);
      setNearby(near);
      setNearest(nearestRes.found ? nearestRes.item : null);
      setNearestEmpty(nearestRes.found ? null : nearestRes.empty_message);
    } catch (e) {
      Alert.alert(
        "無法載入成交資料",
        "請確認本機 API（:8000）與資料庫已啟動。地圖仍可顯示你的位置。"
      );
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const openPoint = async (point: PropertyPoint) => {
    setSelected(point);
    setDetail(null);
    try {
      const d = await fetchDetail(point.id);
      setDetail(d);
    } catch {
      // summary-only is fine
    }
  };

  if (!fontsLoaded) {
    return (
      <StatusScreen title="載入中" body="正在準備字型與地圖…" loading />
    );
  }

  if (gate.kind === "loading") {
    return <StatusScreen title={gate.title} body={gate.body} loading />;
  }

  if (gate.kind === "denied") {
    return (
      <StatusScreen
        title="無法使用"
        body="沒有定位權限就無法顯示附近成交。請到系統設定開啟定位後重新開啟 App。"
      />
    );
  }

  if (gate.kind === "outside") {
    return (
      <StatusScreen
        title="本 App 目前僅支援高雄市"
        body="偵測到你不在高雄市行政範圍內。請到高雄市再試一次。"
      />
    );
  }

  const { lat, lng } = gate.coords;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <MapView
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        }}
        showsUserLocation
        showsMyLocationButton={Platform.OS === "ios"}
      >
        <Circle
          center={{ latitude: lat, longitude: lng }}
          radius={500}
          strokeColor="rgba(91,140,122,0.45)"
          fillColor="rgba(168,197,181,0.12)"
        />
        {(nearby?.items ?? []).map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            onPress={() => openPoint(p)}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={[
                styles.pin,
                {
                  backgroundColor: p.fill_color,
                  borderColor: p.stroke_color,
                },
              ]}
            />
          </Marker>
        ))}
      </MapView>

      <View style={styles.topBar}>
        <Text style={styles.brand}>高雄附近房價</Text>
        <Text style={styles.hint}>
          {nearby ? `附近 ${nearby.count} 筆 · 500m` : "載入成交點…"}
        </Text>
      </View>

      <MapLegend
        priceFill={nearby?.legend.price_fill}
        ageStroke={nearby?.legend.age_stroke}
      />

      <View style={styles.bottomCard}>
        <Text style={styles.nearestLabel}>眼前最近一筆（100m）</Text>
        {nearest ? (
          <Pressable onPress={() => openPoint(nearest)}>
            <Text style={styles.nearestValue}>
              {formatPingPrice(nearest.unit_price_ping)} · {formatAge(nearest.building_age_years)}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.nearestEmpty}>
            {nearestEmpty ?? "附近 100 公尺內尚無成交資料"}
          </Text>
        )}
        <Text style={styles.disclaimer} numberOfLines={3}>
          {nearby?.legend.disclaimer ?? DISCLAIMER}
        </Text>
      </View>

      <PropertySheet
        point={selected}
        detail={detail}
        onClose={() => setSelected(null)}
        onDetail={() =>
          Alert.alert("Coming soon", "細節外部連結尚未接上（591 / 實價查詢網等）。")
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    position: "absolute",
    top: 58,
    left: 16,
    right: 16,
    backgroundColor: "rgba(255,252,247,0.94)",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  brand: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 20,
    color: colors.accent,
  },
  hint: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 2,
  },
  pin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
  },
  bottomCard: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 28,
    backgroundColor: "rgba(255,252,247,0.96)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  nearestLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    color: colors.ink,
  },
  nearestValue: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: colors.accent,
    marginTop: 4,
  },
  nearestEmpty: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: colors.inkMuted,
    marginTop: 4,
  },
  disclaimer: {
    fontFamily: "Nunito_400Regular",
    fontSize: 11,
    lineHeight: 15,
    color: colors.inkMuted,
    marginTop: 10,
  },
});
