#!/usr/bin/env python3
"""6) 港鐵站廁所 — 官方附近廁所表 + ALS 座標。"""
from __future__ import annotations

import csv
import io
import re
import time

from bs4 import BeautifulSoup

from common import SESSION, als_geocode, record, save_json, dump_sample

TOILET_URL = "https://www.mtr.com.hk/ch/customer/services/nearbytoilet.html"
STATIONS_CSV = "https://opendata.mtr.com.hk/data/mtr_lines_and_stations.csv"

LINE_RE = re.compile(r".+綫$|.+線$")


def load_station_names() -> dict[str, str]:
    """Chinese name → Station Code."""
    r = SESSION.get(STATIONS_CSV, timeout=30)
    r.raise_for_status()
    text = r.content.decode("utf-8-sig")
    mapping = {}
    for row in csv.DictReader(io.StringIO(text)):
        zh = (row.get("Chinese Name") or "").strip()
        code = (row.get("Station Code") or "").strip()
        if zh and code:
            mapping[zh] = code
            mapping[zh.replace("站", "")] = code
    return mapping


def parse_official_table() -> list[dict]:
    r = SESSION.get(TOILET_URL, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.content, "html.parser")
    rows = []
    current_line = ""
    for tr in soup.select("table tr"):
        cells = [c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"])]
        if len(cells) < 2:
            continue
        a, b = cells[0], cells[1]
        if a in {"", "港鐵站", "港鐵站內公共洗手間"}:
            continue
        if LINE_RE.match(a) and (b == "" or "位置" in b):
            current_line = a
            continue
        if not a.endswith("站") and "站" not in a:
            continue
        rows.append({"station": a, "location": b, "line": current_line})
    return rows


def fetch():
    names = load_station_names()
    table = parse_official_table()
    items = []
    cache: dict[str, tuple] = {}
    for row in table:
        st = row["station"]
        key = st.replace("站", "")
        code = names.get(st) or names.get(key) or slug_fallback(st)
        if st not in cache:
            geo = als_geocode(f"港鐵{st}") or als_geocode(f"港鐵{key}站")
            cache[st] = geo
            time.sleep(0.15)
        geo = cache[st]
        lat = geo[0] if geo else None
        lng = geo[1] if geo else None
        addr = geo[2] if geo else st
        loc = row["location"]
        place_addr = f"{addr} {loc}".strip() if loc else addr
        rec = record(
            "港鐵",
            st,
            place_addr,
            lat,
            lng,
            "港鐵服務時間",
            extra={"station_code": code, "toilet_location": loc},
        )
        # hours unknown in official sense
        rec["營業時間"]["unknown"] = True
        rec["營業時間"]["raw"] = "港鐵服務時間（末班車後閘內不可用）"
        items.append(rec)
    return items


def slug_fallback(name: str) -> str:
    return re.sub(r"\s+", "", name)


if __name__ == "__main__":
    rows = fetch()
    dump_sample(rows)
    save_json("hk_mtr.json", rows)