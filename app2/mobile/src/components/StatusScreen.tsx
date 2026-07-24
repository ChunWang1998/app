import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

type Props = {
  title: string;
  body: string;
  loading?: boolean;
};

export function StatusScreen({ title, body, loading }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.blob} />
      <Text style={styles.brand}>高雄附近房價</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 28,
    paddingTop: 120,
  },
  blob: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.accentSoft,
    opacity: 0.45,
  },
  brand: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 28,
    color: colors.accent,
    marginBottom: 28,
  },
  title: {
    fontFamily: "Nunito_700Bold",
    fontSize: 22,
    color: colors.ink,
    marginBottom: 12,
  },
  body: {
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
    lineHeight: 24,
    color: colors.inkMuted,
  },
});
