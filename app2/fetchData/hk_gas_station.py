#!/usr/bin/env python3
"""4) 加油站 — OSM amenity=fuel. Hours from OSM; toilet flag if tagged."""
from common import osm_center, overpass, record, save_json, dump_sample

QUERY = """
[out:json][timeout:60];
nwr["amenity"="fuel"](22.15,113.82,22.58,114.44);
out center tags;
"""

BRAND_MAP = [
    ("shell", "蜆殼"),
    ("esso", "埃索"),
    ("exxon", "埃索"),
    ("caltex", "加德士"),
    ("sinopec", "中石化"),
    ("petrochina", "中石油"),
    ("中石化", "中石化"),
    ("蜆殼", "蜆殼"),
    ("加德士", "加德士"),
]


def brand_of(tags: dict) -> str:
    blob = " ".join(
        str(tags.get(k, ""))
        for k in ("brand", "brand:zh", "name", "name:zh", "name:en", "operator")
    ).lower()
    for key, label in BRAND_MAP:
        if key in blob:
            return label
    return "加油站"


def fetch():
    items, seen = [], set()
    for el in overpass(QUERY):
        tags = el.get("tags") or {}
        lat, lng = osm_center(el)
        name = tags.get("name:zh") or tags.get("name") or tags.get("brand") or "加油站"
        addr = tags.get("addr:full") or tags.get("addr:street") or ""
        hours = tags.get("opening_hours") or ""
        if hours == "24/7":
            hours = "24小時"
        typ = brand_of(tags)
        rec = record(typ, name, addr, lat, lng, hours, extra={"source": "osm", "osm_id": el.get("id")})
        toilets = (tags.get("toilets") or tags.get("toilet") or "").lower()
        rec["has_toilet_tag"] = toilets in {"yes", "true", "1"}
        if rec["id"] in seen or rec["lat"] is None:
            continue
        seen.add(rec["id"])
        items.append(rec)
    items.sort(key=lambda x: x["name"])
    return items


if __name__ == "__main__":
    rows = fetch()
    dump_sample(rows)
    save_json("hk_gas_stations.json", rows)