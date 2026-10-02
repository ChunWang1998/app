#!/usr/bin/env python3
"""Gachi Data station / nearby public toilets.

Free key: https://api.gachi-tokusuru.com
  export GACHI_API_KEY=...
  python 09_gachi.py --station 新宿 --out gachi_shinjuku.json
  python 09_gachi.py --lat 35.681 --lng 139.767 --radius 800 --out gachi_nearby.json

Station coverage is Tokyo accessible toilets (floor, wheelchair, ostomate, diaper).
Hours are not in this feed.
"""

from __future__ import annotations

import argparse
import json
import os
import urllib.parse
import urllib.request

from schema_util import dump, empty_hours, record

BASE = "https://api.gachi-tokusuru.com"
HOURS = empty_hours("Gachi APIに営業時間なし", unknown=True)


def get(path: str, key: str) -> dict:
    req = urllib.request.Request(
        BASE + path,
        headers={"Authorization": f"Bearer {key}", "User-Agent": "jp-toilet-export/1.0"},
    )
    with urllib.request.urlopen(req, timeout=40) as resp:
        return json.loads(resp.read().decode())


def from_station(payload: dict) -> list[dict]:
    rows = []
    station = payload.get("station_ja") or payload.get("station") or ""
    for i, t in enumerate(payload.get("toilets") or []):
        lat = t.get("lat") or t.get("latitude") or payload.get("lat")
        lng = t.get("lng") or t.get("lon") or t.get("longitude") or payload.get("lng")
        if lat is None or lng is None:
            continue
        floor = t.get("floor") or ""
        gender = t.get("gender") or ""
        name = t.get("name") or f"{station} トイレ {floor} {gender}".strip()
        rows.append(
            record(
                prefix="gachi-station",
                type_name="駅トイレ",
                name=name,
                address=t.get("address") or station or "住所未掲載",
                lat=lat,
                lng=lng,
                hours=HOURS,
                key=f"{station}:{i}:{floor}:{gender}",
            )
        )
    return rows


def from_nearby(payload: dict) -> list[dict]:
    items = payload.get("toilets") or payload.get("results") or payload if isinstance(payload, list) else []
    rows = []
    for i, t in enumerate(items):
        lat = t.get("lat") or t.get("latitude")
        lng = t.get("lng") or t.get("lon") or t.get("longitude")
        if lat is None or lng is None:
            continue
        rows.append(
            record(
                prefix="gachi-public",
                type_name="公衆トイレ",
                name=t.get("name") or "公衆トイレ",
                address=t.get("address") or "住所未掲載",
                lat=lat,
                lng=lng,
                hours=HOURS,
                key=t.get("id") or f"{lat}:{lng}:{i}",
            )
        )
    return rows


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--station", default="")
    p.add_argument("--lat", type=float)
    p.add_argument("--lng", type=float)
    p.add_argument("--radius", type=int, default=800)
    p.add_argument("--out", default="gachi_toilets.json")
    args = p.parse_args()
    key = os.environ.get("GACHI_API_KEY", "")
    if not key:
        raise SystemExit("Set GACHI_API_KEY. Free key: https://api.gachi-tokusuru.com")
    rows: list[dict] = []
    if args.station:
        q = urllib.parse.urlencode({"station": args.station})
        rows.extend(from_station(get(f"/v1/station-toilets/search?{q}", key)))
    if args.lat is not None and args.lng is not None:
        q = urllib.parse.urlencode({"lat": args.lat, "lng": args.lng, "radius": args.radius})
        rows.extend(from_nearby(get(f"/v1/toilets/nearby?{q}", key)))
    if not rows and not args.station and args.lat is None:
        raise SystemExit("Pass --station and/or --lat --lng")
    dump(args.out, rows)
    print(f"wrote {len(rows)} -> {args.out}")


if __name__ == "__main__":
    main()
