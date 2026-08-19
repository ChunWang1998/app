#!/usr/bin/env python3
"""Fetch Taiwan public toilets (MOENV FAC_P_07) into the shared place schema.

Source: https://data.moenv.gov.tw/dataset/detail/FAC_P_07
API:    https://data.moenv.gov.tw/api/v2/fac_p_07
"""

from __future__ import annotations

import hashlib
import json
import os
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

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
}


def make_id(number: str | None, name: str, address: str) -> str:
    raw = (number or "").strip()
    if raw:
        return f"toilet-{raw}"
    digest = hashlib.sha1(f"{STORE_TYPE}|{name}|{address}".encode("utf-8")).hexdigest()[:12]
    return f"toilet-{digest}"


def norm_tw(text: str) -> str:
    return (text or "").strip().replace("臺", "台")


def is_valid_latlng(lat: float, lng: float) -> bool:
    return 21.5 <= lat <= 26.5 and 118.0 <= lng <= 122.5


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

    all_places.sort(key=lambda p: (p["地址"], p["name"]))
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(all_places, f, ensure_ascii=False, indent=2)

    print(f"skipped: {skipped}")
    print(f"Export {len(all_places)} toilets → {OUT_PATH}")


if __name__ == "__main__":
    main()
