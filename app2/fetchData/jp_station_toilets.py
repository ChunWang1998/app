#!/usr/bin/env python3
"""駅トイレ — OSM amenity=toilets whose name contains 駅."""
from common import dump_sample, save_json
from jp_common import dedupe, hours_from_osm, jp_record, osm_address, osm_latlng, overpass_japan

QUERY = """
  nwr["amenity"="toilets"]["name"~"駅"]({bbox});
"""


def fetch():
    rows = []
    for el in overpass_japan(QUERY):
        tags = el.get("tags") or {}
        point = osm_latlng(el)
        if point is None:
            continue
        hours = hours_from_osm(tags.get("opening_hours"))
        fee = tags.get("fee")
        if fee:
            hours = dict(hours)
            hours["raw"] = (f"{hours['raw']} fee={fee}").strip()
        rows.append(
            jp_record(
                "駅トイレ",
                tags.get("name") or "駅トイレ",
                osm_address(tags),
                point[0],
                point[1],
                hours,
                extra={"osm_id": el.get("id")},
            )
        )
    return dedupe(rows)


if __name__ == "__main__":
    data = fetch()
    dump_sample(data)
    save_json("jp_station_toilets.json", data)
