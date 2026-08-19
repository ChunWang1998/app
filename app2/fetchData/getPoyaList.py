#!/usr/bin/env python3
"""Fetch POYA (寶雅) stores from poya.com.tw into the shared place schema."""

from __future__ import annotations

import hashlib
import json
import re
import time
from pathlib import Path
from urllib.parse import unquote

import requests
from bs4 import BeautifulSoup

from cities import aliases_for, norm_tw
from hours import normalize_hours

STORE_URL = "https://www.poya.com.tw/store/"
ACT_URL = "https://www.poya.com.tw/store/act/"
OUT_PATH = Path(__file__).resolve().parent.parent / "data" / "poya_stores.json"
STORE_TYPE = "寶雅"

DELAY = 0.4
MAX_PAGES = 80

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Referer": STORE_URL,
    "X-Requested-With": "XMLHttpRequest",
    "Accept": "text/html, */*; q=0.01",
}

LATLNG_RE = re.compile(r"[?&]q=([-\d.]+)\s*,\s*([-\d.]+)")


def make_id(name: str, address: str) -> str:
    digest = hashlib.sha1(f"{STORE_TYPE}|{name}|{address}".encode("utf-8")).hexdigest()[:12]
    return f"poya-{digest}"


def extract_lat_lng(iframe_src: str) -> tuple[float | None, float | None]:
    if not iframe_src:
        return None, None
    src = unquote(iframe_src.replace("+", " "))
    m = LATLNG_RE.search(src)
    if not m:
        return None, None
    try:
        return float(m.group(1)), float(m.group(2))
    except ValueError:
        return None, None


def parse_city_map(html: str) -> dict[str, str]:
    """Map site city id -> 台北/台南-style city name."""
    soup = BeautifulSoup(html, "html.parser")
    mapping: dict[str, str] = {}
    for item in soup.select(".cityItem"):
        inp = item.select_one('input[name="city[]"]')
        if inp is None:
            continue
        city_id = (inp.get("value") or "").strip()
        label = item.select_one("label[for]")
        name = norm_tw(label.get_text(strip=True) if label else item.get_text(" ", strip=True))
        name = re.sub(r"^\d+\s*", "", name)
        if city_id and name.endswith(("市", "縣")):
            mapping[city_id] = name
    return mapping


def parse_district_map(html: str) -> dict[str, tuple[str, str]]:
    """Map site district id -> (city_id, district name)."""
    soup = BeautifulSoup(html, "html.parser")
    mapping: dict[str, tuple[str, str]] = {}
    for item in soup.select(".countryItem"):
        inp = item.select_one('input[name="country[]"]')
        if inp is None:
            continue
        district_id = (inp.get("value") or "").strip()
        city_id = (inp.get("data-mid") or inp.get("data-mId") or "").strip()
        label = item.select_one("label[for]")
        name = (label.get_text(strip=True) if label else "").strip()
        if district_id and name:
            mapping[district_id] = (city_id, name)
    return mapping


def city_ids_for_targets(city_map: dict[str, str]) -> list[tuple[str, str]]:
    return [(city_id, name) for city_id, name in city_map.items()]


def build_address(city: str, district: str, street: str) -> str:
    street = (street or "").strip()
    city = norm_tw(city)
    district = (district or "").strip()
    compact = norm_tw(street)
    if city and city not in compact and not any(a in compact for a in aliases_for(city)):
        if district and district not in compact:
            return f"{city}{district}{street}"
        return f"{city}{street}"
    if district and district not in compact and city and compact.startswith(city):
        return f"{city}{district}{compact[len(city):]}"
    return street


def parse_store_item(
    item,
    city_name: str,
    city_map: dict[str, str],
    district_map: dict[str, tuple[str, str]],
) -> dict | None:
    title = item.select_one("h3.title")
    name = title.get_text(strip=True) if title else ""
    if not name:
        return None

    street = ""
    hours_raw = ""
    for li in item.select("ul.infoBox li"):
        icon = " ".join((li.select_one("i") or {}).get("class") or [])
        if "fa-map-marker" in icon:
            addr_a = li.select_one("a[href*='maps']")
            addr_span = li.select_one("span")
            node = addr_a or addr_span
            street = node.get_text(strip=True) if node else li.get_text(strip=True)
        elif "fa-clock-o" in icon:
            hours_span = li.select_one("span")
            hours_raw = hours_span.get_text(strip=True) if hours_span else li.get_text(strip=True)

    iframe = item.select_one("iframe")
    lat, lng = extract_lat_lng(iframe.get("src", "") if iframe else "")
    if lat is None or lng is None:
        print(f"  skip no coords: {name or street}")
        return None

    district_id = (item.get("data-country") or "").strip()
    city_id = (item.get("data-city") or "").strip()
    district = ""
    if district_id in district_map:
        mapped_city_id, district = district_map[district_id]
        if not city_id:
            city_id = mapped_city_id
    resolved_city = city_name or city_map.get(city_id, "")
    address = norm_tw(build_address(resolved_city, district, street))
    if not address:
        print(f"  skip no address: {name}")
        return None

    return {
        "id": make_id(name, address),
        "type": STORE_TYPE,
        "name": name,
        "地址": address,
        "lat": lat,
        "lng": lng,
        "營業時間": normalize_hours(hours_raw),
    }


def last_page(html: str) -> int:
    soup = BeautifulSoup(html, "html.parser")
    last = soup.select_one(".lastBtn[data-page], a.lastBtn[data-page]")
    if last and last.get("data-page"):
        try:
            return max(1, int(last["data-page"]))
        except ValueError:
            pass
    pages = []
    for el in soup.select("[data-page]"):
        try:
            pages.append(int(el["data-page"]))
        except (KeyError, TypeError, ValueError):
            continue
    return max(pages) if pages else 1


def fetch_page(session: requests.Session, city_id: str, page: int, retries: int = 5) -> str:
    data = {
        "act": 5,
        "page": page,
        "mBlink": "",
        "city[]": city_id,
    }
    last_err: Exception | None = None
    for i in range(retries):
        try:
            resp = session.post(ACT_URL, data=data, timeout=30)
            resp.raise_for_status()
            if resp.text.strip():
                return resp.text
        except (requests.RequestException, ValueError) as err:
            last_err = err
        time.sleep(1.0 * (i + 1))
    raise RuntimeError(f"failed city={city_id} page={page}: {last_err}")


def main() -> None:
    session = requests.Session()
    session.headers.update(HEADERS)
    session.trust_env = False

    warmup = session.get(STORE_URL, timeout=30)
    warmup.raise_for_status()
    city_map = parse_city_map(warmup.text)
    district_map = parse_district_map(warmup.text)
    targets = city_ids_for_targets(city_map)
    print(f"cities: {', '.join(f'{name}({cid})' for cid, name in targets)}")

    all_stores: list[dict] = []
    seen: set[str] = set()

    for city_id, city_name in targets:
        time.sleep(DELAY)
        html = fetch_page(session, city_id, 1)
        pages = min(last_page(html), MAX_PAGES)
        added = 0
        for page in range(1, pages + 1):
            if page > 1:
                time.sleep(DELAY)
                html = fetch_page(session, city_id, page)
            soup = BeautifulSoup(html, "html.parser")
            items = soup.select(".storeItem")
            if not items:
                print(f"{city_name} page {page}: empty, stop")
                break
            page_added = 0
            for item in items:
                store = parse_store_item(item, city_name, city_map, district_map)
                if store is None or store["id"] in seen:
                    continue
                seen.add(store["id"])
                all_stores.append(store)
                page_added += 1
                added += 1
            print(f"{city_name} page {page}/{pages}: +{page_added} (cumulative {len(all_stores)})")

        print(f"{city_name}: +{added}")

    all_stores.sort(key=lambda x: (x["地址"], x["name"]))
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(all_stores, f, ensure_ascii=False, indent=2)

    print(f"Export {len(all_stores)} stores → {OUT_PATH}")


if __name__ == "__main__":
    main()
