import { API_BASE_URL } from "./theme";

export type PropertyPoint = {
  id: number;
  lat: number;
  lng: number;
  building_age_years: number | null;
  unit_price_ping: number | null;
  price_bucket: "low" | "mid" | "high";
  age_bucket: "new" | "mid" | "old" | "unknown";
  fill_color: string;
  stroke_color: string;
  distance_m: number;
  building_type: string | null;
  tx_date: string | null;
};

export type NearbyResponse = {
  count: number;
  items: PropertyPoint[];
  legend: {
    price_fill: Record<string, { label: string; color: string }>;
    age_stroke: Record<string, { label: string; color: string }>;
    disclaimer: string;
  };
};

export type PropertyDetail = {
  id: number;
  address_text: string;
  district: string | null;
  building_type: string | null;
  total_price: number | null;
  unit_price_ping: number | null;
  building_age_years: number | null;
  tx_date: string | null;
  rooms: number | null;
  halls: number | null;
  baths: number | null;
  has_elevator: boolean | null;
  detail_url: string | null;
  detail_status: string;
};

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

export function checkInKaohsiung(lat: number, lng: number) {
  return getJson<{ in_kaohsiung: boolean; method: string; message: string | null }>(
    `/geo/in-kaohsiung?lat=${lat}&lng=${lng}`
  );
}

export function fetchNearby(lat: number, lng: number, radiusM = 500, limit = 20) {
  return getJson<NearbyResponse>(
    `/properties/nearby?lat=${lat}&lng=${lng}&radius_m=${radiusM}&limit=${limit}`
  );
}

export function fetchNearest(lat: number, lng: number, maxM = 100) {
  return getJson<{ found: boolean; item: PropertyPoint | null; empty_message: string | null }>(
    `/properties/nearest?lat=${lat}&lng=${lng}&max_m=${maxM}`
  );
}

export function fetchDetail(id: number) {
  return getJson<PropertyDetail>(`/properties/${id}`);
}

export function formatPingPrice(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${Math.round(v).toLocaleString("zh-TW")} 元/坪`;
}

export function formatAge(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "屋齡未知";
  return `屋齡 ${Math.round(v)} 年`;
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}
