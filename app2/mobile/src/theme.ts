export const colors = {
  bg: "#F3EFE7",
  bgSoft: "#E8E2D6",
  ink: "#2F3430",
  inkMuted: "#6B726B",
  accent: "#5B8C7A",
  accentSoft: "#A8C5B5",
  warn: "#C4A35A",
  danger: "#D9897A",
  card: "#FFFCF7",
  line: "#D9D2C5",
  self: "#4A7CFF",
};

export const DISCLAIMER =
  "本 App 資料來自內政部實價登錄公開資訊之彙整，僅供參考，非不動產估價、非即時成交保證；點位為門牌 geocode 約略位置，可能與實際建物有偏差。";

/** Local machine API. On a physical device, replace with your Mac LAN IP. */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
