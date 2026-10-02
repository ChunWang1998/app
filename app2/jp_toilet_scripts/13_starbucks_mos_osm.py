#!/usr/bin/env python3
"""Starbucks and MOS Burger from OpenStreetMap.

No official toilet API. Some Starbucks branches need a receipt code.
bbox = south,west,north,east

Usage:
  python 13_starbucks_mos_osm.py --bbox 35.65,139.70,35.72,139.80 --out cafes.json
"""

from __future__ import annotations

import argparse

from schema_util import dump, hours_from_osm, overpass, record


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--bbox", default="35.65,139.70,35.72,139.80")
    p.add_argument("--out", default="starbucks_mos.json")
    args = p.parse_args()
    s, w, n, e = [x.strip() for x in args.bbox.split(",")]
    query = f"""
[out:json][timeout:90];
(
  node["brand"~"スターバックス|Starbucks|モスバーガー|MOS Burger"]({s},{w},{n},{e});
  way["brand"~"スターバックス|Starbucks|モスバーガー|MOS Burger"]({s},{w},{n},{e});
);
out center;
"""
    data = overpass(query)
    rows = []
    for el in data.get("elements") or []:
        tags = el.get("tags") or {}
        brand = tags.get("brand") or ""
        if "スタ" in brand or "Starbucks" in brand:
            type_name = "スターバックス"
        else:
            type_name = "モスバーガー"
        lat = el.get("lat") or (el.get("center") or {}).get("lat")
        lng = el.get("lon") or (el.get("center") or {}).get("lon")
        if lat is None or lng is None:
            continue
        address = tags.get("addr:full") or " ".join(
            x for x in [tags.get("addr:province"), tags.get("addr:city"), tags.get("addr:quarter"), tags.get("addr:housenumber")] if x
        )
        rows.append(
            record(
                prefix=type_name,
                type_name=type_name,
                name=tags.get("name") or type_name,
                address=address or "住所未掲載",
                lat=lat,
                lng=lng,
                hours=hours_from_osm(tags.get("opening_hours")),
                key=f"{el.get('type')}:{el.get('id')}",
            )
        )
    dump(args.out, rows)
    print(f"wrote {len(rows)} -> {args.out}")


if __name__ == "__main__":
    main()
