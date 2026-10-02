#!/usr/bin/env python3
"""ファミリーマート / ローソン — OSM shop=convenience (no official toilet API)."""
from __future__ import annotations

from common import dump_sample, save_json
from jp_common import dedupe, hours_from_osm, jp_record, osm_address, osm_latlng, overpass_japan

def brand_of(raw: str | None) -> str:
    text = raw or ""
    low = text.lower()
    if "ファミリーマート" in text or "familymart" in low:
        return "ファミリーマート"
    if "ローソン" in text or "lawson" in low:
        return "ローソン"
    return text or "コンビニ"

QUERY = """
  nwr["shop"="convenience"]["brand"~"ファミリーマート|FamilyMart|ローソン|LAWSON|Lawson"]({bbox});
"""


def fetch():
    rows = []
    for el in overpass_japan(QUERY):
        tags = el.get("tags") or {}
        point = osm_latlng(el)
        if point is None:
            continue
        brand = brand_of(tags.get("brand"))
        rows.append(
            jp_record(
                brand,
                tags.get("name") or brand,
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
    save_json("jp_familymart_lawson.json", data)
