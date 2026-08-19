import hashlib
import json
import re
import time
from pathlib import Path

import requests

from cities import CITIES
from hours import normalize_hours

API_URL = "https://api.map.com.tw/net/familyShop.aspx"
OUT_PATH = Path(__file__).resolve().parent.parent / "data" / "family_with_toilet.json"
STORE_TYPE = "family"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.family.com.tw/Marketing/zh/Map",
}

PARAMS_BASE = {
    "searchType": "ShopList",
    "type": "Toilet",
    "area": "",
    "road": "",
    "fun": "showStoreList",
    "key": "6F30E8BF706D653965BDE302661D1241F8BE9EBC",
}


def make_id(pkey: str | None, address: str) -> str:
    raw = (pkey or "").strip()
    if raw:
        return f"family-{raw}"
    digest = hashlib.sha1(f"{STORE_TYPE}|{address}".encode("utf-8")).hexdigest()[:12]
    return f"family-{digest}"


def parse_jsonp(text: str) -> list[dict]:
    match = re.search(r"showStoreList\((.*)\)\s*;?\s*$", text.strip(), re.DOTALL)
    if not match:
        raise ValueError("無法解析 API 回傳內容")
    data = json.loads(match.group(1))
    if not isinstance(data, list):
        raise ValueError("API 回傳不是列表")
    return data


def fetch_city(session: requests.Session, city: str, retries: int = 5) -> list[dict]:
    params = {**PARAMS_BASE, "city": city}
    for i in range(retries):
        resp = session.get(API_URL, params=params, timeout=30)
        if resp.content.strip():
            try:
                return parse_jsonp(resp.text)
            except (ValueError, json.JSONDecodeError):
                pass
        time.sleep(1.0 * (i + 1))
    return []


session = requests.Session()
session.headers.update(HEADERS)
session.trust_env = False

all_stores_with_toilet: list[dict] = []

for city in CITIES:
    time.sleep(0.3)
    raw_stores = fetch_city(session, city)
    before = len(all_stores_with_toilet)
    print(f"{city}: API returned {len(raw_stores)} stores")

    for s in raw_stores:
        services = s.get("all") or ""
        if "Toilet" not in services:
            continue

        address = (s.get("addr") or "").strip()
        try:
            lat = float(s["py"])
            lng = float(s["px"])
        except (KeyError, TypeError, ValueError):
            print(f"  skip no coords: {address}")
            continue

        pkey = str(s.get("pkey") or "").strip() or None
        store = {
            "id": make_id(pkey, address),
            "type": STORE_TYPE,
            "name": (s.get("NAME") or "").strip(),
            "地址": address,
            "lat": lat,
            "lng": lng,
            # FamilyMart list API has no hours; stores are typically 24H
            "營業時間": normalize_hours("24H"),
        }
        all_stores_with_toilet.append(store)

    found = len(all_stores_with_toilet) - before
    print(f"  +{found} with toilet (cumulative {len(all_stores_with_toilet)})")

OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(all_stores_with_toilet, f, ensure_ascii=False, indent=2)

print(f"共找到 {len(all_stores_with_toilet)} 間有廁所的全家")
print(f"saved: {OUT_PATH}")
