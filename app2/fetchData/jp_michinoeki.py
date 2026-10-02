#!/usr/bin/env python3
"""道の駅 — 国土数値情報 P35（2018）。每站都有公衆廁所，營業時間依終日處理。"""
from __future__ import annotations

import io
import json
import zipfile

from common import SESSION, dump_sample, save_json
from jp_common import dedupe, hours_same_every_day, jp_record

ZIP_URL = "https://nlftp.mlit.go.jp/ksj/gml/data/P35/P35-18/P35-18_GML.zip"
GEOJSON_NAME = "P35-18_GML/P35-18_Roadside_Station.geojson"
HOURS = hours_same_every_day("00:00", "24:00", "道の駅（通常24時間。店舗は別）")


def fetch() -> list[dict]:
    resp = SESSION.get(
        ZIP_URL,
        headers={"Referer": "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P35.html"},
        timeout=120,
    )
    resp.raise_for_status()
    with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
        features = json.loads(zf.read(GEOJSON_NAME).decode("utf-8"))["features"]
    rows = []
    for feat in features:
        props = feat.get("properties") or {}
        lat = props.get("P35_001")
        lng = props.get("P35_002")
        if lat is None or lng is None:
            continue
        name = props.get("P35_006") or "道の駅"
        rows.append(
            jp_record(
                "道の駅",
                f"道の駅 {name}",
                f"{props.get('P35_003') or ''}{props.get('P35_004') or ''}",
                lat,
                lng,
                HOURS,
                extra={"osm_id": f"{props.get('P35_005')}:{name}"},
            )
        )
    return dedupe(rows)


if __name__ == "__main__":
    data = fetch()
    dump_sample(data)
    save_json("jp_michinoeki.json", data)
