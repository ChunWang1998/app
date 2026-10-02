#!/usr/bin/env python3
"""ODPT station points. This feed is stations, not toilet fixtures.

Register a consumer key at https://developer.odpt.org/
  export ODPT_CONSUMER_KEY=...
  python 10_odpt_stations.py --operator TokyoMetro --out odpt_metro.json

Toilet detail is incomplete in ODPT. Use 09_gachi.py for Tokyo accessible toilets.
"""

from __future__ import annotations

import argparse
import json
import os
import urllib.parse
import urllib.request

from schema_util import dump, empty_hours, record

API = "https://api.odpt.org/api/v4/odpt:Station"
HOURS = empty_hours("ODPT駅データにトイレ営業時間なし", unknown=True)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--operator", default="", help="odpt.Operator short name, e.g. TokyoMetro")
    p.add_argument("--limit", type=int, default=0)
    p.add_argument("--out", default="odpt_stations.json")
    args = p.parse_args()
    key = os.environ.get("ODPT_CONSUMER_KEY", "")
    if not key:
        raise SystemExit("Set ODPT_CONSUMER_KEY from https://developer.odpt.org/")
    params = {"acl:consumerKey": key}
    if args.operator:
        params["odpt:operator"] = f"odpt.Operator:{args.operator}"
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "jp-toilet-export/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode())
    rows = []
    for st in data:
        lat = st.get("geo:lat")
        lng = st.get("geo:long")
        if lat is None or lng is None:
            continue
        title = (st.get("dc:title") or st.get("odpt:stationTitle") or {})
        if isinstance(title, dict):
            name = title.get("ja") or title.get("en") or st.get("owl:sameAs")
        else:
            name = title or st.get("owl:sameAs")
        rows.append(
            record(
                prefix="odpt-station",
                type_name="駅",
                name=str(name),
                address=st.get("odpt:stationCode") or st.get("owl:sameAs") or "住所未掲載",
                lat=lat,
                lng=lng,
                hours=HOURS,
                key=st.get("owl:sameAs") or name,
            )
        )
        if args.limit and len(rows) >= args.limit:
            break
    dump(args.out, rows)
    print(f"wrote {len(rows)} -> {args.out}")


if __name__ == "__main__":
    main()
