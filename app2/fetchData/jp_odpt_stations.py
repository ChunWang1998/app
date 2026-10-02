#!/usr/bin/env python3
"""ODPT 車站座標。需要環境變數 ODPT_CONSUMER_KEY。這是車站點，不是廁所設備。"""
from __future__ import annotations

import os

from common import SESSION, dump_sample, save_json
from jp_common import dedupe, empty_hours, jp_record

API = "https://api.odpt.org/api/v4/odpt:Station"
HOURS = empty_hours("ODPT駅データにトイレ営業時間なし")


def fetch() -> list[dict]:
    key = os.environ.get("ODPT_CONSUMER_KEY", "")
    if not key:
        raise SystemExit("Set ODPT_CONSUMER_KEY from https://developer.odpt.org/")
    resp = SESSION.get(API, params={"acl:consumerKey": key}, timeout=60)
    resp.raise_for_status()
    rows = []
    for station in resp.json():
        lat = station.get("geo:lat")
        lng = station.get("geo:long")
        if lat is None or lng is None:
            continue
        title = station.get("dc:title") or station.get("odpt:stationTitle") or {}
        if isinstance(title, dict):
            name = title.get("ja") or title.get("en") or station.get("owl:sameAs")
        else:
            name = title or station.get("owl:sameAs")
        rows.append(
            jp_record(
                "駅",
                str(name),
                station.get("odpt:stationCode") or station.get("owl:sameAs") or "",
                lat,
                lng,
                HOURS,
                extra={"osm_id": station.get("owl:sameAs") or name},
            )
        )
    return dedupe(rows)


if __name__ == "__main__":
    data = fetch()
    dump_sample(data)
    save_json("jp_odpt_stations.json", data)
