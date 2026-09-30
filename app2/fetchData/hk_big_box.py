#!/usr/bin/env python3
"""10) IKEA / AEON / DONKI — OSM + AEON 官網分店頁。"""
from __future__ import annotations

import re

from bs4 import BeautifulSoup

from common import SESSION, als_geocode, osm_to_record, overpass, record, save_json, dump_sample

AEON_URL = "https://aeonstores.com.hk/shop_info"

OSM_QUERIES = [
    ("IKEA", r"IKEA|宜家"),
    ("AEON", r"AEON|永旺"),
    ("DONKI", r"DONKI|驚安的殿堂|唐吉訶德"),
]


def fetch_osm():
    items = []
    for type_name, pat in OSM_QUERIES:
        q = f"""
        [out:json][timeout:120];
        (
          nwr["name"~"{pat}",i](22.15,113.82,22.58,114.44);
          nwr["brand"~"{pat}",i](22.15,113.82,22.58,114.44);
        );
        out center tags;
        """
        for el in overpass(q):
            rec = osm_to_record(el, type_name)
            if rec and rec["lat"] is not None:
                items.append(rec)
    return items


def fetch_aeon_official():
    r = SESSION.get(AEON_URL, timeout=30)
    r.raise_for_status()
    text = BeautifulSoup(r.content, "html.parser").get_text("\n", strip=True)
    items = []
    chunks = re.split(r"(?=AEON\s)", text)
    for chunk in chunks:
        m = re.match(
            r"(AEON[^\n]{2,40})\s+([^\n]{8,80}?)\s+營業時間\s+(.+?)\s+電\s*話",
            chunk,
            re.S,
        )
        if not m:
            continue
        name = re.sub(r"\s+", " ", m.group(1)).strip()
        addr = re.sub(r"\s+", " ", m.group(2)).strip()
        hours = re.sub(r"\s+", " ", m.group(3)).strip()
        geo = als_geocode(addr) or als_geocode(name)
        lat = geo[0] if geo else None
        lng = geo[1] if geo else None
        items.append(record("AEON", name, addr, lat, lng, hours, extra={"source": "aeon-official"}))
    return items


def fetch():
    merged, seen = [], set()
    for rec in fetch_osm() + fetch_aeon_official():
        key = (rec["type"], rec["name"], rec["地址"])
        if key in seen:
            continue
        seen.add(key)
        merged.append(rec)
    merged.sort(key=lambda x: (x["type"], x["name"]))
    return merged


if __name__ == "__main__":
    rows = fetch()
    dump_sample(rows)
    save_json("hk_big_box.json", rows)