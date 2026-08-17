#!/usr/bin/env python3
"""Fetch Taiwan department stores / malls from OSM Overpass into the shared place schema."""

import hashlib
import json
import re
import time
from pathlib import Path

import requests

from hours import normalize_hours

OUT_PATH = Path(__file__).resolve().parent.parent / "data" / "department_stores.json"
STORE_TYPE = "百貨"

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

CITY_BBOXES = {
    "高雄市": (22.40, 120.15, 23.47, 121.05),
    "台南市": (22.88, 120.03, 23.41, 120.66),
    "台北市": (24.95, 121.45, 25.22, 121.67),
    "新北市": (24.67, 121.28, 25.30, 122.01),
}

CITY_ALIASES = {
    "高雄市": ("高雄市", "高雄"),
    "台南市": ("台南市", "臺南市", "台南", "臺南"),
    "台北市": ("台北市", "臺北市", "台北", "臺北"),
    "新北市": ("新北市", "新北"),
}

OTHER_REGIONS = (
    "基隆", "桃園", "新竹", "苗栗", "台中", "臺中", "彰化", "南投",
    "雲林", "嘉義", "屏東", "宜蘭", "花蓮", "台東", "臺東", "澎湖", "金門", "連江",
)

# Match 7-11 coverage for now (remove / expand to scrape all cities)
CITIES = ["高雄市", "台南市", "新北市", "台北市"]

EXCLUDE_RE = re.compile(
    r"7-?eleven|7-?11|全家|全聯|ok超商|萊爾富|"
    r"家樂福|carrefour|costco|好市多|愛買|"
    r"寶雅|poya|大創|daiso|小北|無印|muji|"
    r"光南|特力屋|hola|五金|百貨行|地下街|"
    r"電扶梯|出入口|"
    r"佳瑪|j-?mart|生活工場|集寶|輕鬆購|大九九|"
    r"三花|泉通行|鐘錶|皮件|美樂家|台糖|彩虹市集|"
    r"迪斯尼|\(廢\)|（廢）|已歇業|威力購物",
    re.I,
)

KEEP_MALL_RE = re.compile(
    r"三越|SOGO|遠東|遠百|大遠百|FE21|漢神|大立|大統|林百貨|"
    r"高島屋|明曜|欣欣百貨|瀚星|統一時代|太平洋|"
    r"購物中心|購物廣場|微風|環球|京站|ATT|義大|夢時代|"
    r"MLD|台鋁|大魯閣|誠品生活|Global Mall|南紡|"
    r"台北101|101購物|美麗華|美麗新|比漾|遠企|禮客|晶冠|"
    r"大葉|大樂",
    re.I,
)

GENERIC_NO_ADDR = {
    "新光三越",
    "SOGO",
    "SOGO百貨",
    "遠東百貨",
    "誠品生活",
    "環球購物中心",
    "禮客",
}

DEPT_NAME_RE = re.compile(r"百貨|三越|SOGO|高島屋|遠東|遠百|漢神|大立|大統", re.I)
STREET_RE = re.compile(r"[區路街段巷弄號]")
BRANCH_RE = re.compile(r"(左營店|和平店|台南新天地|小西門)$")

POSTCODE_RE = re.compile(r"^\d{3,6}")
NAME_STRIP_RE = re.compile(r"(購物中心|購物廣場|時尚廣場)$")

HEADERS = {
    "User-Agent": "ToiletGo/1.0 (department-store fetch)",
}

OSM_DAY = {
    "Mo": "週一",
    "Tu": "週二",
    "We": "週三",
    "Th": "週四",
    "Fr": "週五",
    "Sa": "週六",
    "Su": "週日",
}


def make_id(osm_type: str | None, osm_id: int | None, name: str, address: str) -> str:
    if osm_type and osm_id:
        return f"dept-{osm_type}-{osm_id}"
    digest = hashlib.sha1(f"{STORE_TYPE}|{name}|{address}".encode("utf-8")).hexdigest()[:12]
    return f"dept-{digest}"


def bbox_str(box: tuple[float, float, float, float]) -> str:
    south, west, north, east = box
    return f"{south},{west},{north},{east}"


def build_query(bbox: str, timeout: int = 25) -> str:
    return f"""
[out:json][timeout:{timeout}];
(
  node["shop"="department_store"]({bbox});
  way["shop"="department_store"]({bbox});
  relation["shop"="department_store"]({bbox});
  node["shop"="mall"]({bbox});
  way["shop"="mall"]({bbox});
  relation["shop"="mall"]({bbox});
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
        try:
            print(f"POST {endpoint}")
            resp = requests.post(
                endpoint,
                data={"data": query},
                timeout=60,
                headers=HEADERS,
            )
            resp.raise_for_status()
            elements = resp.json().get("elements") or []
            if not elements:
                print("  empty, try next")
                last_error = RuntimeError(f"{endpoint} returned 0 elements")
                continue
            print(f"  {len(elements)} OSM elements")
            return elements, endpoint
        except (requests.RequestException, ValueError, json.JSONDecodeError) as err:
            print(f"  fail: {err}")
            last_error = err
            time.sleep(2)
    raise RuntimeError(f"all Overpass endpoints failed: {last_error}")


def fetch_elements() -> list[dict]:
    by_key: dict[tuple, dict] = {}
    preferred: str | None = None
    for city in CITIES:
        box = CITY_BBOXES[city]
        print(f"query {city}")
        elements, preferred = post_overpass(build_query(bbox_str(box)), preferred)
        for el in elements:
            key = (el.get("type"), el.get("id"))
            by_key[key] = el
        time.sleep(2)
    print(f"unique OSM elements: {len(by_key)}")
    return list(by_key.values())


def coords_of(el: dict) -> tuple[float, float] | None:
    lat = el.get("lat") or (el.get("center") or {}).get("lat")
    lon = el.get("lon") or (el.get("center") or {}).get("lon")
    try:
        lat_f = float(lat)
        lon_f = float(lon)
    except (TypeError, ValueError):
        return None
    return lat_f, lon_f


def in_bbox(lat: float, lon: float, box: tuple[float, float, float, float]) -> bool:
    south, west, north, east = box
    return south <= lat <= north and west <= lon <= east


def other_region_in(text: str) -> bool:
    return any(region in text for region in OTHER_REGIONS)


def city_from_text(text: str) -> str | None:
    if "新北" in text:
        return "新北市"
    for city in ("台北市", "高雄市", "台南市"):
        if any(alias in text for alias in CITY_ALIASES[city]):
            return city
    return None


def city_from_coords(lat: float, lon: float) -> str | None:
    # Taipei sits inside a looser New Taipei box; Tainan overlaps northern Kaohsiung
    for city in ("台北市", "台南市", "高雄市", "新北市"):
        if in_bbox(lat, lon, CITY_BBOXES[city]):
            return city
    return None


def norm_tw(text: str) -> str:
    return (text or "").strip().replace("臺", "台")


def build_address(tags: dict, city: str, name: str) -> str:
    full = norm_tw(tags.get("addr:full") or "")
    if not full:
        city_tag = norm_tw(tags.get("addr:city") or "")
        district = norm_tw(tags.get("addr:district") or "")
        street = norm_tw(tags.get("addr:street") or "")
        number = (tags.get("addr:housenumber") or "").strip()
        if city_tag and (district.startswith(city_tag) or city_tag in district):
            city_tag = ""
        full = f"{city_tag}{district}{street}{number}"
    full = POSTCODE_RE.sub("", full).strip()
    if city:
        aliases = tuple(norm_tw(a) for a in CITY_ALIASES[city])
        for alias in sorted(aliases, key=len, reverse=True):
            while full.startswith(alias + alias):
                full = full[len(alias) :]
        if full and not any(alias in full for alias in aliases):
            full = f"{city}{full}"
        elif not full:
            full = f"{city}{name}".strip()
    return full or name


def osm_days_to_zh(days_raw: str) -> str:
    parts: list[str] = []
    for token in days_raw.split(","):
        token = token.strip()
        if not token:
            continue
        if "-" in token:
            start, end = token.split("-", 1)
            za, zb = OSM_DAY.get(start.strip()), OSM_DAY.get(end.strip())
            if za and zb:
                parts.append(f"{za}至{zb}")
            continue
        zh = OSM_DAY.get(token)
        if zh:
            parts.append(zh)
    if not parts:
        return ""
    if len(parts) == 1:
        return parts[0]
    return "、".join(parts)


def osm_hours_to_zh(raw: str) -> str:
    """Turn common OSM opening_hours into Chinese text hours.py can parse."""
    original = (raw or "").strip()
    if not original:
        return ""
    compact = original.replace(" ", "")
    if compact in {"24/7", "24h", "24H"}:
        return "24H"

    chunks: list[str] = []
    for rule in re.split(r"\s*;\s*", original):
        rule = rule.strip()
        if not rule or rule.upper().startswith("PH"):
            continue
        match = re.match(r"^([A-Za-z][A-Za-z,\-]*?)\s+(.+)$", rule)
        if not match:
            chunks.append(rule)
            continue
        days_zh = osm_days_to_zh(match.group(1))
        body = match.group(2).strip()
        if body.lower() in {"off", "closed"}:
            body = "公休"
        chunks.append(f"{days_zh} {body}".strip())
    return " ".join(chunks) or original


def remarks_of(tags: dict) -> list[str]:
    remarks: list[str] = []
    wheelchair = (tags.get("toilets:wheelchair") or tags.get("wheelchair") or "").strip().lower()
    if wheelchair == "yes":
        remarks.append("無障礙廁所")
    shop = (tags.get("shop") or "").strip()
    if shop == "mall":
        remarks.append("商場")
    return remarks


def is_keep(name: str, shop: str) -> bool:
    if EXCLUDE_RE.search(name):
        return False
    if shop == "mall":
        return bool(KEEP_MALL_RE.search(name))
    if shop == "department_store":
        return bool(KEEP_MALL_RE.search(name) or DEPT_NAME_RE.search(name))
    return False


def has_street_address(address: str) -> bool:
    return bool(STREET_RE.search(address))


def name_core(name: str) -> str:
    n = NAME_STRIP_RE.sub("", re.sub(r"\s+", "", name))
    return BRANCH_RE.sub("", n)


def related_names(a: str, b: str) -> bool:
    ca, cb = name_core(a), name_core(b)
    if not ca or not cb:
        return False
    if ca == cb:
        return True
    shorter, longer = (ca, cb) if len(ca) <= len(cb) else (cb, ca)
    if len(shorter) < 4:
        return False
    return shorter in longer


def approx_meters(a: dict, b: dict) -> float:
    dlat = (a["lat"] - b["lat"]) * 111_000
    dlng = (a["lng"] - b["lng"]) * 111_000 * 0.92
    return (dlat * dlat + dlng * dlng) ** 0.5


def completeness(store: dict) -> tuple:
    hours = store["營業時間"]
    addr = store["地址"]
    has_street = any(ch.isdigit() for ch in addr) or "路" in addr or "街" in addr
    return (
        0 if hours.get("raw") else 1,
        0 if has_street else 1,
        -len(addr),
        -len(store["name"]),
    )


def dedupe(stores: list[dict], radius_m: float = 220) -> list[dict]:
    kept: list[dict] = []
    for store in sorted(stores, key=completeness):
        if any(
            approx_meters(store, other) < radius_m and related_names(store["name"], other["name"])
            for other in kept
        ):
            continue
        kept.append(store)
    return kept


def parse_elements(elements: list[dict]) -> list[dict]:
    results: list[dict] = []
    seen_ids: set[str] = set()
    target = set(CITIES)

    for el in elements:
        tags = el.get("tags") or {}
        pair = coords_of(el)
        if pair is None:
            continue
        lat, lng = pair

        if tags.get("disused:shop") or tags.get("abandoned") or tags.get("abandoned:shop"):
            continue
        hours_tag = (tags.get("opening_hours") or "").strip().lower()
        if hours_tag in {"closed", "off"}:
            continue

        name = (
            (tags.get("name") or "").strip()
            or (tags.get("name:zh") or "").strip()
            or (tags.get("brand") or "").strip()
            or (tags.get("operator") or "").strip()
        )
        if not name or not is_keep(name, (tags.get("shop") or "").strip()):
            continue

        addr_blob = "".join(
            [
                tags.get("addr:city") or "",
                tags.get("addr:district") or "",
                tags.get("addr:full") or "",
                tags.get("addr:street") or "",
                name,
            ]
        )
        if other_region_in(addr_blob):
            continue

        city_from_addr = city_from_text(addr_blob)
        city = city_from_addr or city_from_coords(lat, lng)
        if city not in target:
            continue
        if "小碧潭" in name and city == "台北市":
            continue

        address = build_address(tags, city, name)
        if name in GENERIC_NO_ADDR and not has_street_address(address):
            continue
        if not has_street_address(address) and not KEEP_MALL_RE.search(name) and not DEPT_NAME_RE.search(name):
            continue
        store_id = make_id(el.get("type"), el.get("id"), name, address)
        if store_id in seen_ids:
            continue

        hours_raw = (tags.get("opening_hours:zh") or tags.get("opening_hours") or "").strip()
        store = {
            "id": store_id,
            "type": STORE_TYPE,
            "name": name,
            "地址": address,
            "lat": lat,
            "lng": lng,
            "營業時間": normalize_hours(osm_hours_to_zh(hours_raw) or hours_raw),
            "備註": remarks_of(tags),
        }
        seen_ids.add(store_id)
        results.append(store)

    results = dedupe(results)
    results.sort(key=lambda x: (x["地址"], x["name"]))
    return results


def main() -> None:
    print("fetching Taiwan department stores / malls (Overpass)...")
    print(f"cities: {', '.join(CITIES)}")
    elements = fetch_elements()
    stores = parse_elements(elements)
    if not stores:
        raise RuntimeError("parsed 0 stores; not overwriting JSON")

    by_city: dict[str, int] = {city: 0 for city in CITIES}
    for store in stores:
        city = city_from_text(store["地址"]) or "?"
        by_city[city] = by_city.get(city, 0) + 1
    for city, count in by_city.items():
        print(f"  {city}: {count}")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(stores, f, ensure_ascii=False, indent=2)

    print(f"共找到 {len(stores)} 間百貨 / 商場")
    print(f"saved: {OUT_PATH}")


if __name__ == "__main__":
    main()
