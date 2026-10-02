#!/usr/bin/env python3
"""Nationwide 道の駅 from MLIT National Land Numerical Information P35 (2018).

License: non-commercial. Source: 国土数値情報 道の駅 P35.
Every roadside station has a public toilet; hours are treated as all day.
The file is the 2018 edition (about 1,145 stations). Newer registrations are not included.

Usage:
  python 11_michinoeki.py --out michinoeki.json
"""

from __future__ import annotations

import argparse
import io
import json
import zipfile
import urllib.request

from schema_util import dump, hours_same_every_day, record

ZIP_URL = "https://nlftp.mlit.go.jp/ksj/gml/data/P35/P35-18/P35-18_GML.zip"
GEOJSON_NAME = "P35-18_GML/P35-18_Roadside_Station.geojson"
HOURS = hours_same_every_day("00:00", "24:00", "道の駅（通常24時間。店舗は別） 出典: 国土数値情報P35 非商用")


def download() -> bytes:
    req = urllib.request.Request(
        ZIP_URL,
        headers={
            "User-Agent": "jp-toilet-export/1.0",
            "Referer": "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P35.html",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--out", default="michinoeki.json")
    args = p.parse_args()
    raw = download()
    with zipfile.ZipFile(io.BytesIO(raw)) as zf:
        text = zf.read(GEOJSON_NAME).decode("utf-8")
    features = json.loads(text)["features"]
    rows = []
    for feat in features:
        props = feat.get("properties") or {}
        lat = props.get("P35_001")
        lng = props.get("P35_002")
        if lat is None or lng is None:
            continue
        pref = props.get("P35_003") or ""
        city = props.get("P35_004") or ""
        name = props.get("P35_006") or "道の駅"
        rows.append(
            record(
                prefix="michinoeki",
                type_name="道の駅",
                name=f"道の駅 {name}",
                address=f"{pref}{city}",
                lat=lat,
                lng=lng,
                hours=HOURS,
                key=f"{props.get('P35_005')}:{name}",
            )
        )
    dump(args.out, rows)
    print(f"wrote {len(rows)} -> {args.out}")


if __name__ == "__main__":
    main()
