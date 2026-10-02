#!/usr/bin/env python3
"""高速道路 SA/PA — 北海道 LinkData，加上全國 OSM highway=services。"""
from __future__ import annotations

import csv
import io

from common import SESSION, dump_sample, save_json
from jp_common import (
    dedupe,
    hours_from_osm,
    hours_same_every_day,
    jp_record,
    osm_address,
    osm_latlng,
    overpass_japan,
)

LINKDATA = "http://linkdata.org/api/1/rdf1s4050i/SAPA_hokkaido_tsv.txt"
ALL_DAY = hours_same_every_day("00:00", "24:00", "高速道路SA/PA（通常24時間利用可）")
QUERY = """
  nwr["highway"="services"]({bbox});
"""


def from_linkdata() -> list[dict]:
    resp = SESSION.get(LINKDATA, timeout=40)
    resp.raise_for_status()
    raw = resp.content.decode("utf-8", errors="replace")
    header = None
    data_lines = []
    for line in raw.splitlines():
        if line.startswith("#property\t"):
            header = ["id"] + line.split("\t")[1:]
            continue
        if line.startswith("#") or not line.strip():
            continue
        data_lines.append(line)
    if not header or not data_lines:
        return []
    reader = csv.DictReader(io.StringIO("\n".join(data_lines)), fieldnames=header, delimiter="\t")
    rows = []
    seen: set[str] = set()
    for row in reader:
        name = row.get("ic:名称") or row.get("名称") or ""
        lat = row.get("geo:lat") or row.get("緯度")
        lng = row.get("geo:long") or row.get("経度")
        direction = row.get("上り名称") or row.get("方面名称（前方）") or ""
        if not name or not lat or not lng:
            vals = list(row.values())
            if len(vals) < 6:
                continue
            name, lat, lng = vals[1], vals[3], vals[4]
        try:
            lat_f, lng_f = float(lat), float(lng)
        except ValueError:
            continue
        key = f"{name}:{lat_f:.4f}:{lng_f:.4f}:{direction}"
        if key in seen:
            continue
        seen.add(key)
        label = name if not direction or direction in name else f"{name}（{direction}）"
        rows.append(
            jp_record(
                "SA/PA",
                label,
                row.get("住所") or row.get("道路名") or "",
                lat_f,
                lng_f,
                ALL_DAY,
                extra={"osm_id": key},
            )
        )
    return rows


def from_osm() -> list[dict]:
    rows = []
    for el in overpass_japan(QUERY):
        tags = el.get("tags") or {}
        point = osm_latlng(el)
        if point is None:
            continue
        hours = hours_from_osm(tags.get("opening_hours"))
        if hours["unknown"]:
            hours = ALL_DAY
        rows.append(
            jp_record(
                "SA/PA",
                tags.get("name") or tags.get("name:ja") or "SA/PA",
                osm_address(tags),
                point[0],
                point[1],
                hours,
                extra={"osm_id": el.get("id")},
            )
        )
    return rows


def fetch() -> list[dict]:
    link = from_linkdata()
    print(f"  linkdata hokkaido: {len(link)}", flush=True)
    osm = from_osm()
    print(f"  osm services: {len(osm)}", flush=True)
    return dedupe(link + osm)


if __name__ == "__main__":
    data = fetch()
    dump_sample(data)
    save_json("jp_sapa.json", data)
