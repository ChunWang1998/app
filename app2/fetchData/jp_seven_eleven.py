#!/usr/bin/env python3
"""セブン-イレブン — public store finder (no per-store toilet or hours)."""
from __future__ import annotations

import time

from common import SESSION, dump_sample, save_json
from jp_common import dedupe, empty_hours, jp_record

API = "https://seven-eleven-ss-api.areamarker.com/v1/search-by-condition"
PREFECTURES = [f"{i:02d}" for i in range(1, 48)]
HOURS = empty_hours("公式店舗検索APIに営業時間なし")


def fetch_page(pre_code: str, search_after: list | None, size: int) -> dict:
    body: dict = {
        "search_conditions": [
            {"field": "col_10", "value": "1", "comparison_operator": "="},
            {"field": "pre_code", "value": pre_code, "comparison_operator": "="},
        ],
        "fields": [
            "kyo_id",
            "name",
            "lat_en",
            "lon_en",
            "pre_code",
            "city_code",
            "addr_1",
            "zip_code",
            "col_5",
        ],
        "paging_mode": "search_after",
        "sort": "+kyo_id",
        "corp_id": "711map",
        "size": size,
    }
    if search_after:
        body["search_after"] = search_after
    last_err: Exception | None = None
    for attempt in range(4):
        try:
            resp = SESSION.post(
                API,
                json=body,
                headers={
                    "Origin": "https://seven-eleven.areamarker.com",
                    "Referer": "https://seven-eleven.areamarker.com/711map/top",
                },
                timeout=40,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as err:  # noqa: BLE001
            last_err = err
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"seven-eleven prefecture {pre_code} failed: {last_err}")


def fetch_prefecture(pre_code: str, size: int = 200, pause: float = 0.25) -> list[dict]:
    rows: list[dict] = []
    search_after = None
    while True:
        payload = fetch_page(pre_code, search_after, size)
        hits = (payload.get("result") or {}).get("hits") or {}
        batch = hits.get("hit") or []
        if not batch:
            break
        for hit in batch:
            fields = hit.get("fields") or {}
            lat, lng = fields.get("lat_en"), fields.get("lon_en")
            if not lat or not lng:
                continue
            name = fields.get("name") or fields.get("kyo_id") or "セブン-イレブン"
            address = fields.get("addr_1") or ""
            if fields.get("zip_code"):
                address = f"〒{fields['zip_code']} {address}".strip()
            rows.append(
                jp_record(
                    "セブン-イレブン",
                    f"セブン-イレブン {name}",
                    address,
                    lat,
                    lng,
                    HOURS,
                    extra={"osm_id": fields.get("kyo_id") or hit.get("id")},
                )
            )
        search_after = hits.get("search_after")
        if not search_after:
            break
        time.sleep(pause)
    return rows


def fetch() -> list[dict]:
    rows: list[dict] = []
    for code in PREFECTURES:
        got = fetch_prefecture(code)
        print(f"  prefecture {code}: {len(got)}", flush=True)
        rows.extend(got)
    return dedupe(rows)


if __name__ == "__main__":
    data = fetch()
    dump_sample(data)
    save_json("jp_seven_eleven.json", data)
