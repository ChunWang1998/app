#!/usr/bin/env python3
"""BODIK public-toilet JSON API.

GET https://wapi.bodik.jp/public_toilet
About 8,000 records across municipalities that published the standard dataset.
The JSON API frequently omits coordinates. Rows without lat/lng are skipped.
Prefer 07_ckan_public_toilets.py when you need a map.

Usage:
  python 08_bodik_api.py --municipality 中央区 --out bodik_chuo.json
  python 08_bodik_api.py --max-pages 2 --out bodik_sample.json
"""

from __future__ import annotations

import argparse
import json
import urllib.parse
import urllib.request

from schema_util import dump, hours_from_range, record

API = "https://wapi.bodik.jp/public_toilet"


def fetch(params: dict) -> dict:
    url = API + "?" + urllib.parse.urlencode({k: v for k, v in params.items() if v not in (None, "")})
    req = urllib.request.Request(url, headers={"User-Agent": "jp-toilet-export/1.0"})
    with urllib.request.urlopen(req, timeout=40) as resp:
        return json.loads(resp.read().decode())


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--municipality", default="", help="municipalityName, e.g. 中央区")
    p.add_argument("--page-size", type=int, default=200)
    p.add_argument("--max-pages", type=int, default=5)
    p.add_argument("--out", default="bodik_public_toilets.json")
    args = p.parse_args()
    rows = []
    skipped = 0
    for page in range(args.max_pages):
        payload = fetch(
            {
                "select_type": "data",
                "maxResults": args.page_size,
                "offset": page * args.page_size,
                "municipalityName": args.municipality,
            }
        )
        features = (payload.get("resultsets") or {}).get("features") or []
        if not features:
            break
        for feat in features:
            props = feat.get("properties") or {}
            geom = feat.get("geometry") or {}
            coords = geom.get("coordinates") or []
            lat = props.get("latitude") or props.get("lat")
            lng = props.get("longitude") or props.get("lon")
            if lat is None and len(coords) >= 2:
                lng, lat = coords[0], coords[1]
            if lat is None or lng is None:
                skipped += 1
                continue
            city = props.get("municipalityName") or ""
            name = props.get("name") or "公衆トイレ"
            hours = hours_from_range(props.get("startTime"), props.get("endTime"), props.get("businessHoursRemarks"))
            rows.append(
                record(
                    prefix="bodik-toilet",
                    type_name="公衆トイレ",
                    name=f"{city} {name}".strip(),
                    address=props.get("address") or "住所未掲載",
                    lat=lat,
                    lng=lng,
                    hours=hours,
                    key=props.get("ID") or f"{props.get('resource_id')}:{name}:{props.get('address')}",
                )
            )
        print(f"page {page}: features {len(features)} kept {len(rows)} skipped {skipped}")
        if len(features) < args.page_size:
            break
    dump(args.out, rows)
    print(f"wrote {len(rows)} skipped_no_coords {skipped} -> {args.out}")
    if rows == [] and skipped:
        print("BODIK JSON has no coordinates for these rows. Use 07_ckan_public_toilets.py.")


if __name__ == "__main__":
    main()
