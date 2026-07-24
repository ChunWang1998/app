import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  formatAge,
  formatDistance,
  formatPingPrice,
  PropertyDetail,
  PropertyPoint,
} from "../api";
import { colors } from "../theme";

type Props = {
  point: PropertyPoint | null;
  detail: PropertyDetail | null;
  onClose: () => void;
  onDetail: () => void;
};

export function PropertySheet({ point, detail, onClose, onDetail }: Props) {
  if (!point) return null;

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{detail?.address_text ?? "成交摘要"}</Text>
        <Text style={styles.meta}>
          {point.building_type ?? detail?.building_type ?? "建物"} ·{" "}
          {formatDistance(point.distance_m)}
        </Text>

        <View style={styles.grid}>
          <Stat label="每坪價" value={formatPingPrice(point.unit_price_ping)} />
          <Stat label="屋齡" value={formatAge(point.building_age_years)} />
          <Stat label="成交日" value={point.tx_date ?? "—"} />
          <Stat
            label="格局"
            value={
              detail
                ? `${detail.rooms ?? "—"}房 ${detail.halls ?? "—"}廳 ${detail.baths ?? "—"}衛`
                : "…"
            }
          />
        </View>

        <Pressable style={styles.primary} onPress={onDetail}>
          <Text style={styles.primaryText}>看細節（即將推出）</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={onClose}>
          <Text style={styles.secondaryText}>關閉</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(47,52,48,0.28)",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: 14,
  },
  title: {
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
    color: colors.ink,
    marginBottom: 4,
  },
  meta: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: colors.inkMuted,
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  stat: {
    width: "47%",
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: 12,
  },
  statLabel: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: colors.inkMuted,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: colors.ink,
  },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  primaryText: {
    fontFamily: "Nunito_700Bold",
    color: "#fff",
    fontSize: 15,
  },
  secondary: {
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryText: {
    fontFamily: "Nunito_400Regular",
    color: colors.inkMuted,
    fontSize: 14,
  },
});
