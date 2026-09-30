
#!/usr/bin/env python3
"""1) 大型商場 / 百貨 — OSM shop=mall / department_store."""
from common import osm_to_record, overpass, save_json, dump_sample

QUERIES = (
    """
[out:json][timeout:120];
nwr["shop"="mall"](22.15,113.82,22.58,114.44);
out center tags;
""",
    """
[out:json][timeout:120];
nwr["shop"="department_store"](22.15,113.82,22.58,114.44);
out center tags;
""",
)


def fetch():
    items = []
    seen = set()
    elements = []
    for query in QUERIES:
        elements.extend(overpass(query))
    for el in elements:
        rec = osm_to_record(el, "商場")
        if not rec or rec["id"] in seen:
            continue
        if rec["lat"] is None:
            continue
        seen.add(rec["id"])
        items.append(rec)
    items.sort(key=lambda x: x["name"])
    return items


if __name__ == "__main__":
    rows = fetch()
    dump_sample(rows)
    save_json("hk_malls.json", rows)