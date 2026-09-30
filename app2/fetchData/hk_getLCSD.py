#!/usr/bin/env python3
"""8) 康文署場地（公園 / 體育館 / 圖書館 / 泳池）— venue.json + ALS 座標。"""
from __future__ import annotations

import time

from common import SESSION, als_geocode, record, save_json, dump_sample

VENUE_URL = "https://www.lcsd.gov.hk/datagovhk/venue/venue.json"

KEEP = (
    "park",
    "garden",
    "playground",
    "sports",
    "stadium",
    "library",
    "beach",
    "swimming",
    "pool",
    "公園",
    "花園",
    "遊樂場",
    "體育館",
    "運動場",
    "圖書館",
    "泳灘",
    "游泳池",
    "康樂",
    "體育",
)


def wanted(v: dict) -> bool:
    blob = " ".join(
        [
            v.get("Category_en") or "",
            v.get("Category_cn") or "",
            v.get("Name_en") or "",
            v.get("Name_cn") or "",
        ]
    ).lower()
    return any(k.lower() in blob for k in KEEP)


def fetch(limit: int | None = None, geocode: bool = True):
    data = SESSION.get(VENUE_URL, timeout=60).json()
    items = []
    n = 0
    for v in data:
        if not wanted(v):
            continue
        name = v.get("Name_cn") or v.get("Name_en") or ""
        addr = v.get("Address_cn") or v.get("Address_en") or ""
        hours = v.get("OpeningHour_cn") or v.get("OpeningHour_en") or ""
        cat = v.get("Category_cn") or v.get("Category_en") or "康文署場地"
        lat = lng = None
        if geocode:
            q = f"{name} {addr}".strip()
            geo = als_geocode(name) or (als_geocode(q) if addr else None)
            if geo:
                lat, lng, als_addr = geo
                if not addr:
                    addr = als_addr
            time.sleep(0.12)
        rec = record(cat, name, addr, lat, lng, hours, extra={"source": "lcsd-venue.json"})
        items.append(rec)
        n += 1
        if n % 25 == 0:
            print(f"  geocoded {n}", flush=True)
        if limit and n >= limit:
            break
    return items


if __name__ == "__main__":
    import argparse

    p = argparse.ArgumentParser()
    p.add_argument("--limit", type=int, default=0, help="0 = all (slow: ALS per venue)")
    p.add_argument("--no-geocode", action="store_true")
    args = p.parse_args()
    rows = fetch(limit=args.limit or None, geocode=not args.no_geocode)
    dump_sample(rows)
    save_json("hk_lcsd.json", rows)