#!/usr/bin/env python3
"""マクドナルド — OSM fast_food / restaurant (no official toilet API)."""
from common import dump_sample, save_json
from jp_common import dedupe, hours_from_osm, jp_record, osm_address, osm_latlng, overpass_japan

QUERY = """
  nwr["amenity"~"fast_food|restaurant"]["brand"~"マクドナルド|McDonald"]({bbox});
"""


def fetch():
    rows = []
    for el in overpass_japan(QUERY):
        tags = el.get("tags") or {}
        point = osm_latlng(el)
        if point is None:
            continue
        rows.append(
            jp_record(
                "マクドナルド",
                tags.get("name") or "マクドナルド",
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
    save_json("jp_mcdonalds.json", data)
