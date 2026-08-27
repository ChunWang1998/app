#!/usr/bin/env python3
"""Fetch Taiwan public toilets (MOENV FAC_P_07) into the shared place schema.

Source: https://data.moenv.gov.tw/dataset/detail/FAC_P_07
API:    https://data.moenv.gov.tw/api/v2/fac_p_07

Dedupes in three passes:
  1) same rounded lat/lng (floor / gender variants)
  2) same cleaned full street address → one pin per address
  3) same road name + house number (ignore 里/村 / 號旁) → one pin
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import time
from pathlib import Path

import requests

from cities import COUNTY_CODES
from hours import normalize_hours

API_URL = "https://data.moenv.gov.tw/api/v2/fac_p_07"
OUT_PATH = Path(__file__).resolve().parent.parent / "data" / "public_toilets.json"
STORE_TYPE = "公廁"

# data.gov.tw publishes this key on the FAC_P_07 resource URL; override with MOENV_API_KEY.
DEFAULT_API_KEY = "846e44e1-8cc5-4893-ad87-c79d2d383706"

PAGE_SIZE = 1000
DELAY = 0.2
# ~1.1 m; same building in FAC_P_07 usually shares identical coords.
BUILDING_COORD_DECIMALS = 5

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
}

FLOOR_RE = re.compile(
    r"(地下\s*\d*\s*層?"
    r"|[Bb]\s*\d+\s*[Ff]?"
    r"|\d+\s*[Ff]"
    r"|第?\s*\d+\s*樓"
    r"|[0-9０-９]+\s*樓)",
)
GENDER_TAIL_RE = re.compile(
    r"[-－/／(（]?\s*"
    r"(女廁|男廁|無障礙(?:廁所)?"
    r"|性別友善|親子(?:廁所)?"
    r"|多功能(?:廁所)?)"
    r".*$",
)
# 縣市+鄉鎮市區 + 路名體 + 門牌號（允許 號旁 等後綴）
STREET_NUM_RE = re.compile(
    r"^(?P<pre>.+?[縣市].+?[鄉鎮市區])"
    r"(?P<body>.+?)"
    r"(?P<num>\d+(?:[-－]\d+)?(?:之\d+)?號)"
)
VILLAGE_PREFIX_RE = re.compile(r"^[^路街道巷弄段]+?[村里]")


def make_id(number: str | None, name: str, address: str) -> str:
    raw = (number or "").strip()
    if raw:
        return f"toilet-{raw}"
    digest = hashlib.sha1(f"{STORE_TYPE}|{name}|{address}".encode("utf-8")).hexdigest()[:12]
    return f"toilet-{digest}"


def building_id(lat: float, lng: float) -> str:
    key = f"{STORE_TYPE}|{round(lat, BUILDING_COORD_DECIMALS)}|{round(lng, BUILDING_COORD_DECIMALS)}"
    digest = hashlib.sha1(key.encode("utf-8")).hexdigest()[:12]
    return f"toilet-{digest}"


def address_id(address: str) -> str:
    digest = hashlib.sha1(f"{STORE_TYPE}|addr|{address}".encode("utf-8")).hexdigest()[:12]
    return f"toilet-{digest}"


def norm_tw(text: str) -> str:
    return (text or "").strip().replace("臺", "台")


def _normalize_addr_text(addr: str) -> str:
    s = clean_address(norm_tw(addr or ""))
    s = s.translate(str.maketrans("０１２３４５６７８９", "0123456789"))
    s = re.sub(r"[\s　]+", "", s)
    s = re.sub(r"[\(（].*$", "", s)
    return s


def address_key(place: dict) -> str:
    """Normalized address for whole-address dedupe."""
    addr = _normalize_addr_text(place.get("地址") or "")
    return addr or f"__coord__{building_key(place)}"


def street_number_key(place: dict) -> str:
    """縣市行政區 + 路名 + 門牌號；無門牌時退回完整地址 key。"""
    addr = _normalize_addr_text(place.get("地址") or "")
    m = STREET_NUM_RE.match(addr)
    if not m:
        return f"__full__{address_key(place)}"
    pre = m.group("pre")
    body = VILLAGE_PREFIX_RE.sub("", m.group("body"))
    num = m.group("num").replace("－", "-")
    return f"{pre}|{body}|{num}"


def is_valid_latlng(lat: float, lng: float) -> bool:
    return 21.5 <= lat <= 26.5 and 118.0 <= lng <= 122.5


def clean_building_name(name: str) -> str:
    s = (name or "").strip()
    s = GENDER_TAIL_RE.sub("", s)
    s = FLOOR_RE.sub("", s)
    s = re.sub(r"[-－/／\s]+$", "", s)
    s = re.sub(r"\s{2,}", " ", s).strip(" -－/／")
    return s or (name or "").strip()


def clean_address(addr: str) -> str:
    s = FLOOR_RE.sub("", addr or "")
    s = re.sub(r"[-－/／\s]+$", "", s).strip()
    return s or (addr or "").strip()


def building_key(place: dict) -> tuple[float, float]:
    return (
        round(float(place["lat"]), BUILDING_COORD_DECIMALS),
        round(float(place["lng"]), BUILDING_COORD_DECIMALS),
    )


def _pick_representative(group: list[dict]) -> tuple[dict, str]:
    cleaned = [clean_building_name(p.get("name") or "") for p in group]
    best_i = min(
        range(len(group)),
        key=lambda i: (len(cleaned[i]) or 10_000, cleaned[i], group[i].get("地址") or ""),
    )
    return dict(group[best_i]), cleaned[best_i] or group[best_i].get("name") or "公廁"


def dedupe_by_building(places: list[dict]) -> list[dict]:
    """Keep one place per building (same rounded lat/lng)."""
    groups: dict[tuple[float, float], list[dict]] = {}
    for place in places:
        groups.setdefault(building_key(place), []).append(place)

    out: list[dict] = []
    for key, group in groups.items():
        base, name = _pick_representative(group)
        lat, lng = key
        base["id"] = building_id(lat, lng)
        base["name"] = name
        base["地址"] = clean_address(base.get("地址") or "")
        out.append(base)
    return out


def dedupe_by_address(places: list[dict]) -> list[dict]:
    """Keep one place per cleaned street address (centroid lat/lng)."""
    groups: dict[str, list[dict]] = {}
    for place in places:
        groups.setdefault(address_key(place), []).append(place)

    out: list[dict] = []
    for key, group in groups.items():
        base, name = _pick_representative(group)
        lat = sum(float(p["lat"]) for p in group) / len(group)
        lng = sum(float(p["lng"]) for p in group) / len(group)
        addr = clean_address(base.get("地址") or "")
        base["id"] = address_id(key)
        base["name"] = name
        base["地址"] = addr
        base["lat"] = round(lat, 6)
        base["lng"] = round(lng, 6)
        out.append(base)
    return out


def dedupe_by_street_number(places: list[dict]) -> list[dict]:
    """Keep one place when 路名 + 門牌號 match (village / 號旁 variants)."""
    groups: dict[str, list[dict]] = {}
    for place in places:
        groups.setdefault(street_number_key(place), []).append(place)

    out: list[dict] = []
    for key, group in groups.items():
        base, name = _pick_representative(group)
        lat = sum(float(p["lat"]) for p in group) / len(group)
        lng = sum(float(p["lng"]) for p in group) / len(group)
        addr = clean_address(base.get("地址") or "")
        base["id"] = address_id(key)
        base["name"] = name
        base["地址"] = addr
        base["lat"] = round(lat, 6)
        base["lng"] = round(lng, 6)
        out.append(base)
    return out


def records_from_payload(payload) -> list[dict]:
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    if isinstance(payload, dict):
        for key in ("records", "data", "result"):
            rows = payload.get(key)
            if isinstance(rows, list):
                return [row for row in rows if isinstance(row, dict)]
    return []


def fetch_page(
    session: requests.Session,
    api_key: str,
    county_code: str,
    offset: int,
    retries: int = 5,
) -> list[dict]:
    params = {
        "api_key": api_key,
        "limit": PAGE_SIZE,
        "offset": offset,
        "format": "JSON",
        "filters": f"county,EQ,{county_code}",
        "sort": "number",
    }
    last_err: Exception | None = None
    for i in range(retries):
        try:
            resp = session.get(API_URL, params=params, timeout=90)
            resp.raise_for_status()
            payload = resp.json()
            return records_from_payload(payload)
        except (requests.RequestException, ValueError, json.JSONDecodeError) as err:
            last_err = err
            time.sleep(1.0 * (i + 1))
    raise RuntimeError(f"FAC_P_07 fetch failed offset={offset} county={county_code}: {last_err}")


def to_place(row: dict) -> dict | None:
    name = (row.get("name") or "").strip()
    address = norm_tw(row.get("address") or "")
    number = (row.get("number") or "").strip() or None
    try:
        lat = float(str(row.get("latitude") or "").strip())
        lng = float(str(row.get("longitude") or "").strip())
    except (TypeError, ValueError):
        return None
    if not is_valid_latlng(lat, lng):
        return None
    if not address and not name:
        return None
    return {
        "id": make_id(number, name, address),
        "type": STORE_TYPE,
        "name": name,
        "地址": address or name,
        "lat": lat,
        "lng": lng,
        "營業時間": normalize_hours(""),
    }


def main() -> None:
    api_key = (os.environ.get("MOENV_API_KEY") or DEFAULT_API_KEY).strip()
    session = requests.Session()
    session.headers.update(HEADERS)
    session.trust_env = False

    all_places: list[dict] = []
    seen: set[str] = set()
    skipped = 0

    for city, code in COUNTY_CODES.items():
        offset = 0
        city_added = 0
        print(f"{city} ({code})")
        while True:
            rows = fetch_page(session, api_key, code, offset)
            if not rows:
                break
            for row in rows:
                place = to_place(row)
                if place is None:
                    skipped += 1
                    continue
                if place["id"] in seen:
                    skipped += 1
                    continue
                seen.add(place["id"])
                all_places.append(place)
                city_added += 1
            print(f"  offset {offset}: +{len(rows)} raw (city {city_added})")
            if len(rows) < PAGE_SIZE:
                break
            offset += PAGE_SIZE
            time.sleep(DELAY)
        print(f"  kept {city_added}")

    before = len(all_places)
    all_places = dedupe_by_building(all_places)
    print(f"dedupe by building: {before} → {len(all_places)} (−{before - len(all_places)})")

    before_addr = len(all_places)
    all_places = dedupe_by_address(all_places)
    print(
        f"dedupe by address: {before_addr} → {len(all_places)} "
        f"(−{before_addr - len(all_places)})"
    )

    before_street = len(all_places)
    all_places = dedupe_by_street_number(all_places)
    print(
        f"dedupe by street+number: {before_street} → {len(all_places)} "
        f"(−{before_street - len(all_places)})"
    )

    all_places.sort(key=lambda p: (p["地址"], p["name"]))
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(all_places, f, ensure_ascii=False, indent=2)

    print(f"skipped: {skipped}")
    print(f"Export {len(all_places)} toilets → {OUT_PATH}")


def refilter_existing() -> None:
    """Re-apply street+number dedupe on an existing public_toilets.json (no API)."""
    with open(OUT_PATH, encoding="utf-8") as f:
        places = json.load(f)
    before = len(places)
    places = dedupe_by_street_number(places)
    places.sort(key=lambda p: (p["地址"], p["name"]))
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(places, f, ensure_ascii=False, indent=2)
    print(f"refilter street+number: {before} → {len(places)} (−{before - len(places)})")
    print(f"Export {len(places)} toilets → {OUT_PATH}")


if __name__ == "__main__":
    if os.environ.get("REFILTER_ONLY") == "1":
        refilter_existing()
    else:
        main()
