"""Shared helpers for jp_* fetch scripts.

Records match data/*.json: id, type, name, 地址, lat, lng, 營業時間.
Ids use the jp- prefix. OSM opening_hours are parsed here because hours.py
targets Chinese free text.
"""

from __future__ import annotations

import re

from common import overpass, record

# south,west,north,east — overlaps are deduped by OSM id.
JAPAN_BBOXES = [
    ("北海道", "41.35,139.30,45.55,145.90"),
    ("東北", "36.85,138.90,41.55,142.20"),
    ("関東", "34.85,138.40,37.15,141.05"),
    ("中部", "34.50,136.00,37.60,139.20"),
    ("関西", "33.40,134.15,35.80,136.55"),
    ("中国", "34.00,130.80,35.70,134.55"),
    ("四国", "32.70,132.00,34.55,134.85"),
    ("九州", "30.90,129.50,34.05,132.15"),
    ("沖縄", "24.00,122.90,27.90,131.40"),
]

DAY_KEYS = ["1", "2", "3", "4", "5", "6", "7"]


def empty_by_day() -> dict[str, list]:
    return {d: [] for d in DAY_KEYS}


def empty_hours(raw: str) -> dict:
    return {
        "raw": raw,
        "allDay": False,
        "unknown": True,
        "byDay": empty_by_day(),
    }


def hours_same_every_day(open_hhmm: str, close_hhmm: str, raw: str) -> dict:
    all_day = open_hhmm in {"00:00", "0:00"} and close_hhmm in {"24:00", "00:00", "23:59"}
    close = "24:00" if close_hhmm == "00:00" and all_day else close_hhmm
    return {
        "raw": raw,
        "allDay": all_day,
        "unknown": False,
        "byDay": {d: [{"open": open_hhmm, "close": close}] for d in DAY_KEYS},
    }


def _pad(hhmm: str) -> str:
    hour, minute = hhmm.split(":")
    return f"{int(hour):02d}:{int(minute):02d}"


def hours_from_osm(opening_hours: str | None) -> dict:
    if not opening_hours:
        return empty_hours("")
    text = opening_hours.strip()
    if text in {"24/7", "00:00-24:00", "Mo-Su 00:00-24:00"}:
        return hours_same_every_day("00:00", "24:00", text)
    matched = re.fullmatch(
        r"(?:Mo-Su|Mo-Su,PH|24/7)?\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})",
        text,
    )
    if matched:
        return hours_same_every_day(_pad(matched.group(1)), _pad(matched.group(2)), text)
    return empty_hours(text)


def hours_from_range(start: str | None, end: str | None, note: str | None = None) -> dict:
    start = (start or "").strip()
    end = (end or "").strip()
    note = (note or "").strip()
    raw = " ".join(part for part in [f"{start}-{end}" if start or end else "", note] if part).strip()
    if not start or not end:
        return empty_hours(raw)
    start_m = re.search(r"(\d{1,2}):(\d{2})", start)
    end_m = re.search(r"(\d{1,2}):(\d{2})", end)
    if not start_m or not end_m:
        return empty_hours(raw)
    return hours_same_every_day(
        _pad(f"{start_m.group(1)}:{start_m.group(2)}"),
        _pad(f"{end_m.group(1)}:{end_m.group(2)}"),
        raw or f"{start}-{end}",
    )


def jp_record(type_name, name, addr, lat, lng, hours, extra=None) -> dict:
    return record(
        type_name,
        name,
        addr,
        round(float(lat), 7),
        round(float(lng), 7),
        hours,
        extra=extra,
        id_prefix="jp",
    )


def osm_latlng(el: dict) -> tuple[float, float] | None:
    lat = el.get("lat")
    lng = el.get("lon")
    if lat is None or lng is None:
        center = el.get("center") or {}
        lat, lng = center.get("lat"), center.get("lon")
    if lat is None or lng is None:
        return None
    return float(lat), float(lng)


def osm_address(tags: dict) -> str:
    full = str(tags.get("addr:full") or "").strip()
    if full:
        return full
    parts = [
        tags.get("addr:province") or tags.get("addr:state"),
        tags.get("addr:city"),
        tags.get("addr:quarter") or tags.get("addr:suburb") or tags.get("addr:neighbourhood"),
        tags.get("addr:housenumber"),
    ]
    return " ".join(str(part) for part in parts if part)


def overpass_japan(inner: str) -> list[dict]:
    """Run one Overpass selector per region. `inner` must contain `{bbox}`."""
    elements: list[dict] = []
    seen: set[tuple] = set()
    for name, bbox in JAPAN_BBOXES:
        query = f"[out:json][timeout:180];\n(\n{inner.format(bbox=bbox)}\n);\nout center;"
        print(f"  overpass {name}", flush=True)
        batch = overpass(query)
        added = 0
        for el in batch:
            key = (el.get("type"), el.get("id"))
            if key in seen:
                continue
            seen.add(key)
            elements.append(el)
            added += 1
        print(f"    {name}: {added}", flush=True)
    return elements


def dedupe(rows: list[dict]) -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []
    for row in rows:
        if not row.get("id") or row["id"] in seen or row.get("lat") is None:
            continue
        seen.add(row["id"])
        out.append(row)
    out.sort(key=lambda row: (row.get("type") or "", row.get("name") or ""))
    return out
