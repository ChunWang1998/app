import hashlib
import json
import time
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

from cities import in_cities
from hours import normalize_hours

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Referer": "https://emap.pcsc.com.tw/emap.aspx",
    "Origin": "https://emap.pcsc.com.tw",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
}

API_URL = "https://emap.pcsc.com.tw/EMapSDK.aspx"
OUT_PATH = Path(__file__).resolve().parent.parent / "data" / "711_with_toilet.json"


def post_xml(session: requests.Session, data: str, retries: int = 5) -> ET.Element | None:
    """POST to EMapSDK and parse XML; retry on empty / parse errors."""
    for i in range(retries):
        r = session.post(API_URL, data=data.encode("utf-8"), timeout=30)
        if r.content.strip():
            try:
                return ET.fromstring(r.content)
            except ET.ParseError:
                pass
        if i == 2:
            session.get("https://emap.pcsc.com.tw/emap.aspx", timeout=30)
        time.sleep(1.0 * (i + 1))
    return None


def make_id(poi_id: str | None, store_type: str, address: str) -> str:
    raw = (poi_id or "").strip()
    if raw:
        return f"7-11-{raw}"
    digest = hashlib.sha1(f"{store_type}|{address}".encode("utf-8")).hexdigest()[:12]
    return f"7-11-{digest}"


def parse_coord(raw: str | None) -> float | None:
    """EMap X/Y are WGS84 * 1_000_000."""
    if not raw:
        return None
    try:
        return float(raw.strip()) / 1_000_000
    except ValueError:
        return None


session = requests.Session()
session.headers.update(headers)
session.trust_env = False

session.get("https://emap.pcsc.com.tw/emap.aspx", timeout=30)

r = session.get("https://emap.pcsc.com.tw/lib/areacode.js", timeout=30)
city_list = []
for line in r.text.split("\n"):
    if "new AreaNode" in line:
        parts = line.split("'")
        if len(parts) >= 4 and parts[1]:
            city_list.append({"name": parts[1], "code": parts[3]})

city_list = [city for city in city_list if in_cities(city["name"])]

all_stores_with_toilet = []

for city in city_list:
    root = post_xml(session, f"commandid=GetTown&cityid={city['code']}")
    if root is None:
        print(f"skip GetTown: {city['name']}")
        continue
    towns = [t.text for t in root.findall(".//TownName") if t.text]
    print(f"{city['name']}: {len(towns)} towns")

    for town in towns:
        time.sleep(0.3)
        root = post_xml(session, f"commandid=SearchStore&city={city['name']}&town={town}")
        if root is None:
            print(f"skip SearchStore: {city['name']} {town}")
            continue

        before = len(all_stores_with_toilet)
        for pos in root.findall(".//GeoPosition"):
            title = pos.findtext("StoreImageTitle") or ""
            if "02廁所" not in title:
                continue

            address = (pos.findtext("Address") or "").strip()
            store_type = "7-11"
            lat = parse_coord(pos.findtext("Y"))
            lng = parse_coord(pos.findtext("X"))
            if lat is None or lng is None:
                print(f"  skip no coords: {address}")
                continue

            store = {
                "id": make_id(pos.findtext("POIID"), store_type, address),
                "type": store_type,
                "name": (pos.findtext("POIName") or "").strip(),
                "地址": address,
                "lat": lat,
                "lng": lng,
                "營業時間": normalize_hours(pos.findtext("OP_TIME") or ""),
                "備註": [],
            }
            all_stores_with_toilet.append(store)

        found = len(all_stores_with_toilet) - before
        print(f"  {town}: +{found} (cumulative {len(all_stores_with_toilet)})")

OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(all_stores_with_toilet, f, ensure_ascii=False, indent=2)

print(f"共找到 {len(all_stores_with_toilet)} 間有廁所的 7-11")
print(f"saved: {OUT_PATH}")
