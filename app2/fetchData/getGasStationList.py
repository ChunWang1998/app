import hashlib
import json
import time
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

import requests

from cities import norm_tw
from hours import normalize_hours

STATIONS_URL = "https://vipmbr.cpc.com.tw/opendata/getstationinfo"
TOILET_URL = (
    "https://vipmbr.cpc.com.tw/CPCSTN/Accessibletoilets.asmx/getAccessibletoiletsData_XML"
)
OUT_PATH = Path(__file__).resolve().parent.parent / "data" / "gas_with_toilet.json"
STORE_TYPE = "加油站"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
}

def make_id(station_id: str | None, address: str) -> str:
    raw = (station_id or "").strip()
    if raw:
        return f"gas-{raw}"
    digest = hashlib.sha1(f"{STORE_TYPE}|{address}".encode("utf-8")).hexdigest()[:12]
    return f"gas-{digest}"


def full_address(city: str, address: str) -> str:
    address = address.strip()
    city = city.strip()
    if not address:
        return city
    if city and not address.startswith(city):
        return f"{city}{address}"
    return address


def fetch_accessible_ids(session: requests.Session, retries: int = 5) -> set[str]:
    for i in range(retries):
        resp = session.get(TOILET_URL, timeout=30)
        if resp.content.strip():
            try:
                root = ET.fromstring(resp.content)
                ids: set[str] = set()
                for table in root.findall("Table"):
                    sid = table.findtext("站代號")
                    if sid:
                        ids.add(sid.strip())
                return ids
            except ET.ParseError:
                pass
        time.sleep(1.0 * (i + 1))
    return set()


session = requests.Session()
session.headers.update(HEADERS)
session.trust_env = False

print("fetching CPC stations...")
resp = session.get(STATIONS_URL, timeout=30)
resp.raise_for_status()
all_stations = resp.json()

print("fetching accessible toilets...")
accessible_ids = fetch_accessible_ids(session)
print(f"accessible toilet stations (nationwide): {len(accessible_ids)}")

all_stores_with_toilet: list[dict] = []
by_city: dict[str, list] = defaultdict(list)
for s in all_stations:
    by_city[norm_tw(s.get("縣市") or "") or "?"].append(s)

for city, city_stations in sorted(by_city.items()):
    before = len(all_stores_with_toilet)
    accessible_count = 0
    print(f"{city}: {len(city_stations)} stations")

    for s in city_stations:
        # CPC open data has no general toilet flag; nearly all stations have toilets
        address = full_address(city, s.get("地址") or "")
        try:
            lat = float(s["緯度"])
            lng = float(s["經度"])
        except (KeyError, TypeError, ValueError):
            print(f"  skip no coords: {address}")
            continue

        sid = str(s.get("站代號") or "").strip() or None
        accessible = bool(sid and sid in accessible_ids)

        store = {
            "id": make_id(sid, address),
            "type": STORE_TYPE,
            "name": (s.get("站名") or "").strip(),
            "地址": address,
            "lat": lat,
            "lng": lng,
            "營業時間": normalize_hours(s.get("營業時間") or ""),
        }
        all_stores_with_toilet.append(store)
        if accessible:
            accessible_count += 1

    found = len(all_stores_with_toilet) - before
    print(f"  +{found} (accessible toilet: {accessible_count})")

OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(all_stores_with_toilet, f, ensure_ascii=False, indent=2)

print(f"共找到 {len(all_stores_with_toilet)} 間有廁所的加油站")
print(f"saved: {OUT_PATH}")
