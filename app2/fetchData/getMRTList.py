#!/usr/bin/env python3
"""Fetch Taiwan MRT stations into the shared place schema.

Prefers TDX (set TDX_CLIENT_ID / TDX_CLIENT_SECRET). Falls back to OSM Overpass.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import re
import time
from collections import defaultdict
from pathlib import Path

import requests

from hours import normalize_hours

OUT_PATH = Path(__file__).resolve().parent.parent / "data" / "mrt_stations.json"
STORE_TYPE = "捷運"

# Match 7-11 / department-store coverage (remove / expand as needed)
CITIES = ["高雄市", "新北市", "台北市", "台中市"]

OPERATORS = {
    "TRTC": "台北捷運",
    "TMRT": "台中捷運",
    "KRTC": "高雄捷運",
}

CITY_BBOXES = {
    "高雄市": (22.40, 120.15, 23.47, 121.05),
    "台南市": (22.88, 120.03, 23.41, 120.66),
    "台北市": (24.95, 121.45, 25.22, 121.67),
    "新北市": (24.67, 121.28, 25.30, 122.01),
    "台中市": (24.00, 120.40, 24.45, 120.90),
}

CITY_ALIASES = {
    "高雄市": ("高雄市", "高雄"),
    "台南市": ("台南市", "臺南市", "台南", "臺南"),
    "台北市": ("台北市", "臺北市", "台北", "臺北"),
    "新北市": ("新北市", "新北"),
    "台中市": ("台中市", "臺中市", "台中", "臺中"),
}

KEEP_NETWORKS = (
    "台北捷運",
    "臺北捷運",
    "台北都會區大眾捷運系統",
    "臺北都會區大眾捷運系統",
    "高雄捷運",
    "台中捷運",
    "臺中捷運",
    "新北捷運",
)

SKIP_NETWORKS = (
    "桃園捷運",
    "桃園機場捷運",
    "高雄輕軌",
    "淡海輕軌",
    "安坑輕軌",
    "三鶯",
)

LRT_REF_RE = re.compile(r"^(LB|C|V|K|K1)\d", re.I)
POSTCODE_RE = re.compile(r"^\d{3,6}")

TDX_BASE = "https://tdx.transportdata.tw/api/basic"
TDX_TOKEN_URL = (
    "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token"
)

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

HEADERS = {
    "User-Agent": "ToiletGo/1.0 (mrt fetch)",
    "Accept": "application/json",
}


def tdx_credentials() -> tuple[str, str] | None:
    client_id = (os.environ.get("TDX_CLIENT_ID") or "").strip()
    client_secret = (os.environ.get("TDX_CLIENT_SECRET") or "").strip()
    if not client_id or not client_secret:
        return None
    if client_id in ("YOUR_CLIENT_ID",) or client_secret in ("YOUR_CLIENT_SECRET",):
        return None
    return client_id, client_secret


def make_id(operator: str, station_id: str, name: str, address: str) -> str:
    raw = (station_id or "").strip()
    op = (operator or "").strip().lower()
    if raw and op:
        return f"mrt-{op}-{raw.lower()}"
    digest = hashlib.sha1(f"{STORE_TYPE}|{name}|{address}".encode("utf-8")).hexdigest()[:12]
    return f"mrt-{digest}"


def norm_tw(text: str) -> str:
    return (text or "").strip().replace("臺", "台")


def city_from_text(text: str) -> str | None:
    t = norm_tw(text)
    if "新北" in t:
        return "新北市"
    ranked: list[tuple[int, str]] = []
    for city, aliases in CITY_ALIASES.items():
        for alias in aliases:
            a = norm_tw(alias)
            if a and a in t:
                ranked.append((len(a), city))
    if not ranked:
        return None
    ranked.sort(reverse=True)
    return ranked[0][1]


def strip_address(address: str) -> str:
    return POSTCODE_RE.sub("", (address or "").strip()).strip()


def in_bbox(lat: float, lon: float, box: tuple[float, float, float, float]) -> bool:
    south, west, north, east = box
    return south <= lat <= north and west <= lon <= east


def city_from_coords(lat: float, lon: float) -> str | None:
    for city in ("台北市", "台南市", "高雄市", "台中市", "新北市"):
        if in_bbox(lat, lon, CITY_BBOXES[city]):
            return city
    return None


def allowed_city(city: str | None) -> bool:
    return bool(city) and city in CITIES


def parse_hhmm(raw: str | None) -> str | None:
    if not raw:
        return None
    text = raw.strip()
    if len(text) < 4 or ":" not in text:
        return None
    hh, mm = text.split(":", 1)
    try:
        hour = int(hh)
        minute = int(mm[:2])
    except ValueError:
        return None
    if hour == 24 and minute == 0:
        return "24:00"
    if hour > 24:
        return None
    if hour == 24:
        return f"{hour:02d}:{minute:02d}"
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        return None
    return f"{hour:02d}:{minute:02d}"


def to_minutes(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def last_train_sort_key(hhmm: str) -> int:
    minutes = to_minutes(hhmm)
    # 00:00–04:59 after last-night service → treat as next-day
    if minutes < 5 * 60:
        return minutes + 24 * 60
    return minutes


def hours_from_first_last(first_last_list: list[dict]) -> dict:
    first_times: list[str] = []
    last_times: list[str] = []
    for item in first_last_list:
        ft = parse_hhmm(item.get("FirstTrainTime"))
        lt = parse_hhmm(item.get("LastTrainTime"))
        if ft:
            first_times.append(ft)
        if lt:
            last_times.append(lt)

    if not first_times or not last_times:
        return normalize_hours("週一至週日 06:00-24:00")

    earliest = min(first_times, key=to_minutes)
    latest = max(last_times, key=last_train_sort_key)
    raw = f"週一至週日 {earliest}-{latest}"
    result = normalize_hours(raw)
    if result.get("unknown"):
        by_day = {str(d): [{"open": earliest, "close": latest}] for d in range(1, 8)}
        return {"raw": raw, "allDay": False, "unknown": False, "byDay": by_day}
    return result


def build_address(city: str, town: str, street: str, name: str) -> str:
    street = norm_tw(street)
    city = norm_tw(city)
    town = norm_tw(town)
    if street:
        if city and not street.startswith(city):
            if town and town not in street:
                return f"{city}{town}{street}"
            return f"{city}{street}" if not any(a in street for a in CITY_ALIASES.get(city, ())) else street
        return street
    parts = "".join(p for p in (city, town) if p)
    if parts:
        return f"{parts}{name}" if name else parts
    return name


def get_tdx_token(client_id: str, client_secret: str) -> str:
    resp = requests.post(
        TDX_TOKEN_URL,
        data={
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
        },
        timeout=30,
        headers=HEADERS,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def tdx_get(token: str, endpoint: str) -> list[dict]:
    url = f"{TDX_BASE}{endpoint}"
    resp = requests.get(
        url,
        headers={**HEADERS, "Authorization": f"Bearer {token}", "Accept-Encoding": "gzip"},
        params={"$format": "JSON"},
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    return data if isinstance(data, list) else []


def fetch_from_tdx(token: str) -> list[dict]:
    places: list[dict] = []
    seen: set[str] = set()

    for operator, type_name in OPERATORS.items():
        print(f"TDX {type_name} ({operator})")
        stations = tdx_get(token, f"/v2/Rail/Metro/Station/{operator}")
        print(f"  stations: {len(stations)}")
        try:
            first_last = tdx_get(token, f"/v2/Rail/Metro/FirstLastTimetable/{operator}")
            print(f"  first/last: {len(first_last)}")
        except requests.RequestException as err:
            print(f"  first/last skipped: {err}")
            first_last = []

        fl_by_station: dict[str, list] = defaultdict(list)
        for item in first_last:
            sid = item.get("StationID")
            if sid:
                fl_by_station[sid].append(item)

        added = 0
        for st in stations:
            pos = st.get("StationPosition") or {}
            try:
                lat = float(pos.get("PositionLat"))
                lng = float(pos.get("PositionLon"))
            except (TypeError, ValueError):
                continue

            city = city_from_text(
                " ".join(
                    str(x or "")
                    for x in (st.get("LocationCity"), st.get("StationAddress"), st.get("LocationTown"))
                )
            ) or city_from_coords(lat, lng)
            if not allowed_city(city):
                continue

            name_obj = st.get("StationName") or {}
            station_id = str(st.get("StationID") or "")
            name = (name_obj.get("Zh_tw") or name_obj.get("En") or station_id).strip()
            address = strip_address(
                build_address(
                    city or "",
                    str(st.get("LocationTown") or ""),
                    str(st.get("StationAddress") or ""),
                    name,
                )
            )
            pid = make_id(operator, station_id, name, address)
            if pid in seen:
                continue
            seen.add(pid)

            remarks = [type_name]
            if station_id:
                remarks.append(station_id)

            places.append(
                {
                    "id": pid,
                    "type": STORE_TYPE,
                    "name": name,
                    "地址": address,
                    "lat": lat,
                    "lng": lng,
                    "營業時間": hours_from_first_last(fl_by_station.get(station_id, [])),
                    "備註": remarks,
                }
            )
            added += 1
        print(f"  kept: {added}")
        time.sleep(0.3)

    return places


def build_overpass_query(bbox: str, timeout: int = 25) -> str:
    return f"""
[out:json][timeout:{timeout}];
(
  node["railway"="station"]["station"="subway"]({bbox});
  way["railway"="station"]["station"="subway"]({bbox});
  relation["railway"="station"]["station"="subway"]({bbox});
  node["public_transport"="station"]["station"="subway"]({bbox});
  way["public_transport"="station"]["station"="subway"]({bbox});
);
out center tags;
"""


def post_overpass(query: str, preferred: str | None = None) -> tuple[list[dict], str]:
    last_error: Exception | None = None
    endpoints = list(OVERPASS_ENDPOINTS)
    if preferred and preferred in endpoints:
        endpoints.remove(preferred)
        endpoints.insert(0, preferred)

    for endpoint in endpoints:
        for attempt in range(3):
            try:
                print(f"POST {endpoint}" + (f" retry {attempt}" if attempt else ""))
                resp = requests.post(
                    endpoint,
                    data={"data": query},
                    timeout=90,
                    headers=HEADERS,
                )
                if resp.status_code in (429, 502, 503, 504):
                    wait = 8 * (attempt + 1)
                    print(f"  HTTP {resp.status_code}, wait {wait}s")
                    time.sleep(wait)
                    continue
                resp.raise_for_status()
                elements = resp.json().get("elements") or []
                print(f"  {len(elements)} OSM elements")
                return elements, endpoint
            except (requests.RequestException, ValueError, json.JSONDecodeError) as err:
                print(f"  fail: {err}")
                last_error = err
                time.sleep(4 * (attempt + 1))
                break
    raise RuntimeError(f"all Overpass endpoints failed: {last_error}")


def osm_keep(tags: dict) -> bool:
    if tags.get("railway") == "construction" or tags.get("construction") in ("yes", "subway"):
        return False
    if tags.get("station") == "light_rail" or tags.get("railway") == "light_rail":
        return False
    network = norm_tw(" ".join(str(tags.get(k) or "") for k in ("network", "operator", "name")))
    if any(skip in network for skip in SKIP_NETWORKS):
        return False
    if "輕軌" in network or "機場捷運" in network:
        return False
    ref = str(tags.get("ref") or "").strip()
    first_ref = ref.replace(";", " ").split()[0] if ref else ""
    if first_ref and LRT_REF_RE.match(first_ref):
        return False
    if any(keep in network for keep in KEEP_NETWORKS):
        return True
    return tags.get("station") == "subway"


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def merge_nearby_same_name(places: list[dict], max_m: float = 250) -> list[dict]:
    """Collapse transfer-station duplicates (same name, a few hundred metres apart)."""
    groups: dict[str, list[dict]] = defaultdict(list)
    for place in places:
        groups[norm_tw(place["name"])].append(place)

    out: list[dict] = []
    for cluster in groups.values():
        used = [False] * len(cluster)
        for i, a in enumerate(cluster):
            if used[i]:
                continue
            members = [a]
            used[i] = True
            for j, b in enumerate(cluster):
                if used[j]:
                    continue
                if haversine_m(a["lat"], a["lng"], b["lat"], b["lng"]) <= max_m:
                    members.append(b)
                    used[j] = True
            members.sort(key=lambda p: (-len(p["地址"]), -len(p["備註"]), p["id"]))
            keep = dict(members[0])
            remarks: list[str] = []
            for m in members:
                for r in m["備註"]:
                    if r not in remarks:
                        remarks.append(r)
            keep["備註"] = remarks
            out.append(keep)
    return out


def osm_address(tags: dict, city: str, name: str) -> str:
    full = norm_tw(tags.get("addr:full") or "")
    if not full:
        city_tag = norm_tw(tags.get("addr:city") or "")
        district = norm_tw(tags.get("addr:district") or "")
        street = norm_tw(tags.get("addr:street") or "")
        number = (tags.get("addr:housenumber") or "").strip()
        full = f"{city_tag}{district}{street}{number}"
    if city and full and not any(norm_tw(a) in full for a in CITY_ALIASES[city]):
        full = f"{city}{full}"
    return full or build_address(city, "", "", name)


def fetch_from_osm() -> list[dict]:
    # One query covering all target metro cities (avoids Overpass 429/504 on sequential city calls)
    south = min(CITY_BBOXES[c][0] for c in CITIES)
    west = min(CITY_BBOXES[c][1] for c in CITIES)
    north = max(CITY_BBOXES[c][2] for c in CITIES)
    east = max(CITY_BBOXES[c][3] for c in CITIES)
    bbox = f"{south},{west},{north},{east}"
    print(f"OSM query bbox {bbox}")
    elements, _ = post_overpass(build_overpass_query(bbox, timeout=60))
    by_key: dict[tuple, dict] = {}
    for el in elements:
        by_key[(el.get("type"), el.get("id"))] = el

    places: list[dict] = []
    seen: set[str] = set()
    for el in by_key.values():
        tags = el.get("tags") or {}
        if not osm_keep(tags):
            continue
        lat = el.get("lat") or (el.get("center") or {}).get("lat")
        lon = el.get("lon") or (el.get("center") or {}).get("lon")
        try:
            lat_f = float(lat)
            lon_f = float(lon)
        except (TypeError, ValueError):
            continue

        city = city_from_text(
            " ".join(str(tags.get(k) or "") for k in ("addr:city", "addr:full", "addr:district"))
        ) or city_from_coords(lat_f, lon_f)
        if not allowed_city(city):
            continue

        name = (tags.get("name") or tags.get("name:zh") or tags.get("name:zh-TW") or "").strip()
        if not name:
            continue
        address = strip_address(osm_address(tags, city or "", name))
        osm_type = str(el.get("type") or "node")
        osm_id = str(el.get("id") or "")
        pid = make_id(osm_type, osm_id, name, address)
        if pid in seen:
            continue
        seen.add(pid)

        hours_raw = (tags.get("opening_hours") or "").strip()
        if hours_raw:
            # OSM uses Mo-Su; map a common metro pattern into 週一至週日
            compact = hours_raw.replace(" ", "")
            if compact.lower().startswith("mo-su") or compact.lower().startswith("24/7"):
                hours = normalize_hours(
                    hours_raw.replace("Mo-Su", "週一至週日").replace("24/7", "24H")
                )
            else:
                hours = normalize_hours("週一至週日 06:00-24:00")
                hours["raw"] = hours_raw
        else:
            hours = normalize_hours("週一至週日 06:00-24:00")

        remarks = []
        network = (tags.get("network") or tags.get("operator") or "").strip()
        if network:
            remarks.append(network)
        ref = (tags.get("ref") or "").strip()
        if ref:
            remarks.append(ref)

        places.append(
            {
                "id": pid,
                "type": STORE_TYPE,
                "name": name,
                "地址": address,
                "lat": lat_f,
                "lng": lon_f,
                "營業時間": hours,
                "備註": remarks,
            }
        )

    places = merge_nearby_same_name(places)
    places.sort(key=lambda x: (x["地址"], x["name"]))
    return places


def main() -> None:
    creds = tdx_credentials()
    if creds:
        print("source: TDX")
        token = get_tdx_token(*creds)
        places = fetch_from_tdx(token)
    else:
        print("TDX credentials missing (TDX_CLIENT_ID / TDX_CLIENT_SECRET); using OSM")
        places = fetch_from_osm()

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(places, f, ensure_ascii=False, indent=2)

    print(f"Export {len(places)} stations → {OUT_PATH}")


if __name__ == "__main__":
    main()
