#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fetch Taiwan Starbucks stores into the shared place schema.

Source: https://www.starbucks.com.tw/stores/storesearch.jspx
(via POST /stores/ajax/json_storesearch.aspx)
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from hours import normalize_hours

STORE_PAGE = "https://www.starbucks.com.tw/stores/storesearch.jspx"
API_URL = "https://www.starbucks.com.tw/stores/ajax/json_storesearch.aspx"
OUT_PATH = Path(__file__).resolve().parent.parent / "data" / "starbucks_stores.json"
STORE_TYPE = "星巴克"

# Empty name + any TW point returns the full national list (sorted by distance).
DEFAULT_LAT = 25.0401998
DEFAULT_LNG = 121.5634194

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Referer": STORE_PAGE,
    "Origin": "https://www.starbucks.com.tw",
    "Content-Type": "application/x-www-form-urlencoded",
    "Accept": "application/json, text/javascript, */*; q=0.01",
}

LOCATIONS_RE = re.compile(r"var locations\s*=\s*(\[[\s\S]*?\]);")
PAREN_RANGE_RE = re.compile(
    r"[（(]\s*([一二三四五六日天])\s*[~～\-–—至到]\s*([一二三四五六日天])\s*[）)]"
)
PAREN_DAY_RE = re.compile(r"[（(]\s*([一二三四五六日天])\s*[）)]")


def make_id(store_id: str | None, name: str, address: str) -> str:
    raw = (store_id or "").strip()
    if raw:
        return f"starbucks-{raw}"
    digest = hashlib.sha1(f"{STORE_TYPE}|{name}|{address}".encode("utf-8")).hexdigest()[:12]
    return f"starbucks-{digest}"


def rewrite_hours(raw: str) -> str:
    """Map Starbucks '(一~五)07:30~19:30' into text hours.normalize_hours can parse."""
    text = (raw or "").strip()
    if not text:
        return ""
    text = PAREN_RANGE_RE.sub(lambda m: f" 週{m.group(1)}至週{m.group(2)} ", text)
    text = PAREN_DAY_RE.sub(lambda m: f" 週{m.group(1)} ", text)
    # 0630~21:30 → 06:30~21:30
    text = re.sub(r"(?<![\d:])(\d{2})(\d{2})(?![\d:])", r"\1:\2", text)
    text = text.replace("不營業", "公休")
    return re.sub(r"\s+", " ", text).strip()


def hours_from_raw(raw: str) -> dict:
    original = (raw or "").strip()
    result = normalize_hours(rewrite_hours(original) or original)
    result["raw"] = original
    return result


def fetch_payload(session: requests.Session, retries: int = 5) -> dict:
    # Official page sends encodeURI('q=' + q); & and = stay unescaped.
    q = f"&searchStoreName=&lon={DEFAULT_LNG}&lat={DEFAULT_LAT}"
    last_err: Exception | None = None
    for i in range(retries):
        try:
            resp = session.post(API_URL, data=f"q={q}", timeout=60)
            resp.raise_for_status()
            data = resp.json()
            if str(data.get("status")) == "200":
                return data
            last_err = RuntimeError(data.get("Message") or data.get("status"))
        except (requests.RequestException, ValueError, json.JSONDecodeError) as err:
            last_err = err
        session.get(STORE_PAGE, timeout=30)
    raise RuntimeError(f"store search failed: {last_err}")


def parse_locations(embed_js: str) -> dict[str, tuple[float, float]]:
    match = LOCATIONS_RE.search(embed_js or "")
    if not match:
        return {}
    coords: dict[str, tuple[float, float]] = {}
    for item in json.loads(match.group(1)):
        if not isinstance(item, list) or len(item) < 3:
            continue
        store_id, lat, lng = str(item[0]), float(item[1]), float(item[2])
        coords[store_id] = (lat, lng)
    return coords


def parse_store_blocks(info_html: str) -> list[dict]:
    soup = BeautifulSoup(info_html, "html.parser")
    stores: list[dict] = []

    for block in soup.select("div.store_info-container[id^='store_info_']"):
        store_id = (block.get("id") or "").replace("store_info_", "", 1)
        name_el = block.select_one("h4.store_name")
        addr_el = block.select_one("p.store_add")

        name = name_el.get_text(strip=True) if name_el else ""
        address = addr_el.get_text(strip=True) if addr_el else ""

        hours_raw = ""
        for p in block.select("div.container > p"):
            classes = p.get("class") or []
            if "store_add" in classes or "store_phone" in classes:
                continue
            text = p.get_text(" ", strip=True)
            if text:
                hours_raw = text
                break

        stores.append({
            "store_id": store_id,
            "name": name,
            "地址": address,
            "hours_raw": hours_raw,
        })

    return stores


def main() -> None:
    session = requests.Session()
    session.headers.update(HEADERS)
    session.trust_env = False
    session.get(STORE_PAGE, timeout=30)

    payload = fetch_payload(session)
    htmls = {
        el.get("elementID"): el.get("elementHTML") or ""
        for el in (payload.get("renderElements") or [])
        if isinstance(el, dict)
    }
    coords = parse_locations(payload.get("embedJsScript") or "")
    blocks = parse_store_blocks(htmls.get("search_store_info") or "")

    all_stores: list[dict] = []
    seen: set[str] = set()
    skipped = 0

    for block in blocks:
        store_id = block["store_id"]
        name = block["name"]
        address = block["地址"]
        latlng = coords.get(store_id)
        if latlng is None:
            print(f"  skip no coords: {name or address or store_id}")
            skipped += 1
            continue

        place_id = make_id(store_id, name, address)
        if place_id in seen:
            skipped += 1
            continue
        seen.add(place_id)

        all_stores.append({
            "id": place_id,
            "type": STORE_TYPE,
            "name": name,
            "地址": address,
            "lat": latlng[0],
            "lng": latlng[1],
            "營業時間": hours_from_raw(block["hours_raw"]),
        })

    all_stores.sort(key=lambda s: s["name"])
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(all_stores, f, ensure_ascii=False, indent=2)

    unknown = sum(1 for s in all_stores if s["營業時間"].get("unknown"))
    print(f"API locations: {len(coords)}, detail blocks: {len(blocks)}, skipped: {skipped}")
    print(f"Export {len(all_stores)} stores ({unknown} unknown hours) → {OUT_PATH}")


if __name__ == "__main__":
    main()
