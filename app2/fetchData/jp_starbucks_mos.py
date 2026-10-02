#!/usr/bin/env python3
"""スターバックス / モスバーガー — OSM（沒有官方廁所 API）。"""
from common import dump_sample, save_json
from jp_common import dedupe, hours_from_osm, jp_record, osm_address, osm_latlng, overpass_japan

QUERY = """
  nwr["brand"~"スターバックス|Starbucks|モスバーガー|MOS Burger"]({bbox});
"""


def type_of(brand: str) -> str:
    if "スタ" in brand or "Starbucks" in brand or "starbucks" in brand.lower():
        return "スターバックス"
    return "モスバーガー"


def fetch():
    rows = []
    for el in overpass_japan(QUERY):
        tags = el.get("tags") or {}
        point = osm_latlng(el)
        if point is None:
            continue
        type_name = type_of(tags.get("brand") or "")
        rows.append(
            jp_record(
                type_name,
                tags.get("name") or type_name,
                osm_address(tags),
                point[0],
                point[1],
                hours_from_osm(tags.get("opening_hours")),
                extra={"osm_id": el.get("id")},
            )
        )
    return dedupe(rows)


if __name__ == "__main__":
    data = fetch()
    dump_sample(data)
    save_json("jp_starbucks_mos.json", data)
