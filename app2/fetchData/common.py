"""Shared helpers for hk_* fetch scripts.

Output records match data/poya_stores.json and data/hk_public_toilets.json:
id, type, name, 地址, lat, lng, 營業時間.
"""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

import requests

from hours import normalize_hours

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": "toilet-go/hk-fetch",
    }
)

OVERPASS_URLS = (
    "https://overpass-api.de/api/interpreter",
    "https://overpass.openstreetmap.fr/api/interpreter",
)

SCHEMA_KEYS = ("id", "type", "name", "地址", "lat", "lng", "營業時間")


def make_id(type_name: str, name: str, address: str, suffix: str = "", *, prefix: str = "hk") -> str:
    raw = f"{type_name}|{name}|{address}|{suffix}"
    digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:12]
    return f"{prefix}-{digest}"


def record(type_name, name, addr, lat, lng, hours, extra=None, *, id_prefix: str = "hk") -> dict:
    """One place. `extra` only distinguishes ids; it is not written to JSON."""
    name = str(name or "").strip()
    addr = str(addr or "").strip()
    suffix = ""
    if extra:
        suffix = "|".join(
            str(extra.get(k) or "")
            for k in ("osm_id", "toilet_location", "station_code")
        )
    if isinstance(hours, dict) and "byDay" in hours:
        hours_value = hours
    else:
        hours_value = normalize_hours(str(hours or ""))
    return {
        "id": make_id(str(type_name), name, addr, suffix, prefix=id_prefix),
        "type": str(type_name),
        "name": name,
        "地址": addr,
        "lat": lat,
        "lng": lng,
        "營業時間": hours_value,
    }


def osm_center(el: dict) -> tuple[float | None, float | None]:
    if el.get("lat") is not None and el.get("lon") is not None:
        return float(el["lat"]), float(el["lon"])
    center = el.get("center") or {}
    if center.get("lat") is not None and center.get("lon") is not None:
        return float(center["lat"]), float(center["lon"])
    return None, None


def osm_address(tags: dict) -> str:
    full = str(tags.get("addr:full") or "").strip()
    if full:
        return full
    number = str(tags.get("addr:housenumber") or "").strip()
    street = str(tags.get("addr:street") or tags.get("addr:place") or "").strip()
    district = str(tags.get("addr:suburb") or tags.get("addr:district") or "").strip()
    city = str(tags.get("addr:city") or "").strip()
    line = "".join(part for part in (city, district, street) if part)
    if number:
        line = f"{line}{number}" if number.endswith("號") else f"{line}{number}號"
    return line


def osm_hours(tags: dict) -> str:
    raw = str(tags.get("opening_hours") or "").strip()
    if raw.upper() in {"24/7", "24H"}:
        return "24小時"
    return raw


def osm_to_record(el: dict, type_name: str) -> dict | None:
    tags = el.get("tags") or {}
    lat, lng = osm_center(el)
    if lat is None or lng is None:
        return None
    name = (
        tags.get("name:zh-Hant")
        or tags.get("name:zh")
        or tags.get("name")
        or tags.get("brand:zh")
        or tags.get("brand")
        or type_name
    )
    return record(
        type_name,
        name,
        osm_address(tags),
        lat,
        lng,
        osm_hours(tags),
        extra={"osm_id": el.get("id")},
    )


def overpass(query: str) -> list[dict]:
    last_err: Exception | None = None
    for attempt in range(8):
        url = OVERPASS_URLS[attempt % len(OVERPASS_URLS)]
        try:
            resp = SESSION.post(
                url,
                data={"data": query},
                headers={"Accept": "*/*"},
                timeout=180,
            )
            if resp.status_code in {403, 406, 429, 502, 504}:
                wait = 3.0 if resp.status_code == 403 else min(
                    float(resp.headers.get("Retry-After") or (6 * (attempt + 1))),
                    25,
                )
                print(f"overpass {resp.status_code} {url}, sleep {wait:.0f}s")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            payload = resp.json()
            time.sleep(1.0)
            return list(payload.get("elements") or [])
        except (requests.RequestException, ValueError) as err:
            last_err = err
            print(f"overpass attempt {attempt + 1} failed: {err}")
            time.sleep(4.0 * (attempt + 1))
    raise RuntimeError(f"overpass failed: {last_err}")


def als_geocode(query: str) -> tuple[float, float, str] | None:
    """ALS lookup → (lat, lng, Chinese address)."""
    q = str(query or "").strip()
    if not q:
        return None
    try:
        resp = SESSION.get(
            "https://www.als.gov.hk/lookup",
            params={"q": q, "n": 1},
            headers={"Accept": "application/json"},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
    except (requests.RequestException, ValueError):
        return None
    suggested = data.get("SuggestedAddress") or []
    if not suggested:
        return None
    premises = ((suggested[0].get("Address") or {}).get("PremisesAddress")) or {}
    geo = premises.get("GeospatialInformation") or {}
    if isinstance(geo, list):
        geo = geo[0] if geo else {}
    try:
        lat = float(geo["Latitude"])
        lng = float(geo["Longitude"])
    except (KeyError, TypeError, ValueError):
        return None
    chi = premises.get("ChiPremisesAddress") or {}
    street = chi.get("ChiStreet") or {}
    number = str(street.get("BuildingNoFrom") or "").strip()
    building = chi.get("BuildingName") or (chi.get("ChiEstate") or {}).get("EstateName") or ""
    parts = [
        chi.get("Region") or "",
        (chi.get("ChiDistrict") or {}).get("DcDistrict") or "",
        street.get("StreetName") or "",
        f"{number}號" if number else "",
        building or "",
    ]
    address = "".join(str(part) for part in parts if part)
    return lat, lng, address or q


def to_schema(row: dict) -> dict | None:
    lat, lng = row.get("lat"), row.get("lng")
    if lat is None or lng is None:
        return None
    try:
        lat_f = float(lat)
        lng_f = float(lng)
    except (TypeError, ValueError):
        return None
    hours = row.get("營業時間")
    if not isinstance(hours, dict) or "byDay" not in hours:
        hours = normalize_hours(str(hours or ""))
    return {
        "id": str(row.get("id") or ""),
        "type": str(row.get("type") or ""),
        "name": str(row.get("name") or ""),
        "地址": str(row.get("地址") or ""),
        "lat": lat_f,
        "lng": lng_f,
        "營業時間": hours,
    }


def save_json(filename: str, rows: list[dict]) -> Path:
    clean: list[dict] = []
    seen: set[str] = set()
    skipped = 0
    for row in rows:
        item = to_schema(row)
        if item is None or not item["id"] or item["id"] in seen:
            skipped += 1
            continue
        seen.add(item["id"])
        clean.append(item)
    path = DATA_DIR / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(clean, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"saved {len(clean)} (skipped {skipped}) → {path}")
    return path


def dump_sample(rows: list[dict], n: int = 1) -> None:
    print(f"fetched {len(rows)}")
    for row in rows[:n]:
        shown = to_schema(row) or {k: row.get(k) for k in SCHEMA_KEYS}
        print(json.dumps(shown, ensure_ascii=False))
