#!/usr/bin/env python3
"""Gachi 東京無障礙車站廁所。需要環境變數 GACHI_API_KEY。"""
from __future__ import annotations

import os
import sys
import urllib.parse

from common import SESSION, dump_sample, save_json
from jp_common import dedupe, empty_hours, jp_record

BASE = "https://api.gachi-tokusuru.com"
HOURS = empty_hours("Gachi APIに営業時間なし")


def get(path: str, key: str) -> dict:
    resp = SESSION.get(
        BASE + path,
        headers={"Authorization": f"Bearer {key}"},
        timeout=40,
    )
    resp.raise_for_status()
    return resp.json()


def from_station(payload: dict) -> list[dict]:
    rows = []
    station = payload.get("station_ja") or payload.get("station") or ""
    for i, toilet in enumerate(payload.get("toilets") or []):
        lat = toilet.get("lat") or toilet.get("latitude") or payload.get("lat")
        lng = toilet.get("lng") or toilet.get("lon") or toilet.get("longitude") or payload.get("lng")
        if lat is None or lng is None:
            continue
        floor = toilet.get("floor") or ""
        gender = toilet.get("gender") or ""
        name = toilet.get("name") or f"{station} トイレ {floor} {gender}".strip()
        rows.append(
            jp_record(
                "駅トイレ",
                name,
                toilet.get("address") or station,
                lat,
                lng,
                HOURS,
                extra={"osm_id": f"{station}:{i}:{floor}:{gender}"},
            )
        )
    return rows


def fetch(station: str) -> list[dict]:
    key = os.environ.get("GACHI_API_KEY", "")
    if not key:
        raise SystemExit("Set GACHI_API_KEY. Free key: https://api.gachi-tokusuru.com")
    query = urllib.parse.urlencode({"station": station})
    payload = get(f"/v1/station-toilets/search?{query}", key)
    return dedupe(from_station(payload))


if __name__ == "__main__":
    station = sys.argv[1] if len(sys.argv) > 1 else "新宿"
    data = fetch(station)
    dump_sample(data)
    save_json("jp_gachi.json", data)
