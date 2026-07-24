import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

type LegendProps = {
  priceFill?: Record<string, { label: string; color: string }>;
  ageStroke?: Record<string, { label: string; color: string }>;
};

export function MapLegend({ priceFill, ageStroke }: LegendProps) {
  const prices = Object.values(priceFill ?? {});
  const ages = Object.values(ageStroke ?? {}).filter((x) => !x.label.includes("未知"));

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={styles.heading}>圖例</Text>
      <Text style={styles.sub}>填色＝坪價</Text>
      <View style={styles.row}>
        {prices.map((p) => (
          <View key={p.label} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: p.color }]} />
            <Text style={styles.label}>{p.label.replace("坪價", "")}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.sub, { marginTop: 8 }]}>框線＝屋齡</Text>
      <View style={styles.row}>
        {ages.map((a) => (
          <View key={a.label} style={styles.item}>
            <View style={[styles.ring, { borderColor: a.color }]} />
            <Text style={styles.label}>{a.label.replace("屋齡 ", "")}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    bottom: 108,
    backgroundColor: "rgba(255,252,247,0.94)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line,
    maxWidth: 210,
  },
  heading: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    color: colors.ink,
    marginBottom: 4,
  },
  sub: {
    fontFamily: "Nunito_400Regular",
    fontSize: 11,
    color: colors.inkMuted,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ring: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    backgroundColor: "transparent",
  },
  label: {
    fontFamily: "Nunito_400Regular",
    fontSize: 10,
    color: colors.inkMuted,
  },
});
