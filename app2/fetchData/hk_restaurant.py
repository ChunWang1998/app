#!/usr/bin/env python3
"""3) 大家樂 / 大快活 / 美心 MX — OSM name match."""
from common import osm_to_record, overpass, save_json, dump_sample

BRANDS = [
    ("大家樂", r"Café de Coral|Cafe de Coral|大家樂"),
    ("大快活", r"Fairwood|大快活"),
    ("美心MX", r"Maxim.?s MX|美心\s*MX|MX\s*Restaurant"),
]


def fetch_brand(type_name: str, pattern: str):
    query = f"""
    [out:json][timeout:120];
    (
      nwr["amenity"="fast_food"]["name"~"{pattern}",i](22.15,113.82,22.58,114.44);
      nwr["amenity"="restaurant"]["name"~"{pattern}",i](22.15,113.82,22.58,114.44);
    );
    out center tags;
    """
    items, seen = [], set()
    for el in overpass(query):
        rec = osm_to_record(el, type_name)
        if not rec or rec["id"] in seen or rec["lat"] is None:
            continue
        seen.add(rec["id"])
        items.append(rec)
    return items


def fetch():
    out = []
    for type_name, pat in BRANDS:
        part = fetch_brand(type_name, pat)
        print(f"  {type_name}: {len(part)}")
        out.extend(part)
    out.sort(key=lambda x: (x["type"], x["name"]))
    return out


if __name__ == "__main__":
    rows = fetch()
    dump_sample(rows)
    save_json("hk_restaurants.json", rows)