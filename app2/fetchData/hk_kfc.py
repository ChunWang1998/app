#!/usr/bin/env python3
"""2) KFC 肯德基 — OSM name match (no official HK toilet API)."""
from common import osm_to_record, overpass, save_json, dump_sample

QUERY = r"""
[out:json][timeout:60];
nwr["amenity"="fast_food"]["name"~"KFC|肯德基",i](22.15,113.82,22.58,114.44);
out center tags;
"""


def fetch():
    items, seen = [], set()
    for el in overpass(QUERY):
        rec = osm_to_record(el, "肯德基")
        if not rec or rec["id"] in seen or rec["lat"] is None:
            continue
        seen.add(rec["id"])
        items.append(rec)
    items.sort(key=lambda x: x["name"])
    return items


if __name__ == "__main__":
    rows = fetch()
    dump_sample(rows)
    save_json("hk_kfc.json", rows)