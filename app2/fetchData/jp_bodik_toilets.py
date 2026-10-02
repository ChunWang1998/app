#!/usr/bin/env python3
"""BODIK 公衆トイレ JSON API。沒有座標的列會略過。"""
from common import SESSION, dump_sample, save_json
from jp_common import dedupe, hours_from_range, jp_record

API = "https://wapi.bodik.jp/public_toilet"
PAGE_SIZE = 200


def fetch() -> list[dict]:
    rows: list[dict] = []
    skipped = 0
    for page in range(200):
        resp = SESSION.get(
            API,
            params={
                "select_type": "data",
                "maxResults": PAGE_SIZE,
                "offset": page * PAGE_SIZE,
            },
            timeout=40,
        )
        resp.raise_for_status()
        features = ((resp.json().get("resultsets") or {}).get("features")) or []
        if not features:
            break
        for feat in features:
            props = feat.get("properties") or {}
            coords = (feat.get("geometry") or {}).get("coordinates") or []
            lat = props.get("latitude") or props.get("lat")
            lng = props.get("longitude") or props.get("lon")
            if lat is None and len(coords) >= 2:
                lng, lat = coords[0], coords[1]
            if lat is None or lng is None:
                skipped += 1
                continue
            city = props.get("municipalityName") or ""
            name = props.get("name") or "公衆トイレ"
            rows.append(
                jp_record(
                    "公衆トイレ",
                    f"{city} {name}".strip(),
                    props.get("address") or "",
                    lat,
                    lng,
                    hours_from_range(
                        props.get("startTime"),
                        props.get("endTime"),
                        props.get("businessHoursRemarks"),
                    ),
                    extra={"osm_id": props.get("ID") or f"{props.get('resource_id')}:{name}:{props.get('address')}"},
                )
            )
        print(f"  page {page}: features {len(features)} kept {len(rows)} skipped {skipped}", flush=True)
        if len(features) < PAGE_SIZE:
            break
    print(f"  skipped_no_coords {skipped}", flush=True)
    return dedupe(rows)


if __name__ == "__main__":
    data = fetch()
    dump_sample(data)
    save_json("jp_bodik_toilets.json", data)
