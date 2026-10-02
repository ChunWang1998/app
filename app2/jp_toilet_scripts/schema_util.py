"""Shared record shape for Japan toilet / store exports."""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any

DAY_KEYS = ["1", "2", "3", "4", "5", "6", "7"]  # 1=Mon ... 7=Sun


def make_id(prefix: str, *parts: object) -> str:
    raw = "|".join(str(p) for p in parts)
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12]
    slug = re.sub(r"[^a-z0-9]+", "-", prefix.lower()).strip("-") or "place"
    return f"{slug}-{digest}"


def empty_hours(raw: str, *, unknown: bool = True, all_day: bool = False) -> dict[str, Any]:
    return {
        "raw": raw,
        "allDay": all_day,
        "unknown": unknown,
        "byDay": {} if unknown and not all_day else _all_days([{"open": "00:00", "close": "24:00"}]) if all_day else {},
    }


def _all_days(slots: list[dict[str, str]]) -> dict[str, list[dict[str, str]]]:
    return {d: [dict(s) for s in slots] for d in DAY_KEYS}


def hours_same_every_day(open_hhmm: str, close_hhmm: str, raw: str) -> dict[str, Any]:
    all_day = open_hhmm in {"00:00", "0:00"} and close_hhmm in {"24:00", "00:00", "23:59"}
    return {
        "raw": raw,
        "allDay": all_day,
        "unknown": False,
        "byDay": _all_days([{"open": open_hhmm, "close": "24:00" if close_hhmm == "00:00" and all_day else close_hhmm}]),
    }


def hours_from_osm(opening_hours: str | None) -> dict[str, Any]:
    if not opening_hours:
        return empty_hours("営業時間未掲載", unknown=True)
    text = opening_hours.strip()
    if text in {"24/7", "00:00-24:00", "Mo-Su 00:00-24:00"}:
        return hours_same_every_day("00:00", "24:00", text)
    # Mo-Su 07:00-22:00 / Mo-Su 07:30-20:30
    m = re.fullmatch(r"(?:Mo-Su|Mo-Su,PH|24/7)?\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})", text)
    if m:
        return hours_same_every_day(_pad(m.group(1)), _pad(m.group(2)), text)
    return empty_hours(text, unknown=True)


def hours_from_range(start: str | None, end: str | None, note: str | None = None) -> dict[str, Any]:
    start = (start or "").strip()
    end = (end or "").strip()
    note = (note or "").strip()
    raw = " ".join(x for x in [f"{start}-{end}" if start or end else "", note] if x).strip()
    if not start or not end:
        return empty_hours(raw or "利用時間未掲載（公衆トイレは多くが終日）", unknown=True)
    sm = re.search(r"(\d{1,2}):(\d{2})", start)
    em = re.search(r"(\d{1,2}):(\d{2})", end)
    if not sm or not em:
        return empty_hours(raw, unknown=True)
    return hours_same_every_day(_pad(f"{sm.group(1)}:{sm.group(2)}"), _pad(f"{em.group(1)}:{em.group(2)}"), raw or f"{start}-{end}")


def _pad(hhmm: str) -> str:
    h, m = hhmm.split(":")
    return f"{int(h):02d}:{int(m):02d}"


def record(
    *,
    prefix: str,
    type_name: str,
    name: str,
    address: str,
    lat: float,
    lng: float,
    hours: dict[str, Any],
    key: str,
) -> dict[str, Any]:
    return {
        "id": make_id(prefix, key),
        "type": type_name,
        "name": name,
        "地址": address,
        "lat": round(float(lat), 7),
        "lng": round(float(lng), 7),
        "營業時間": hours,
    }


def dump(path: str, rows: list[dict[str, Any]]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
        f.write("\n")


def overpass(query: str) -> dict[str, Any]:
    import urllib.parse
    import urllib.request

    endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://lz4.overpass-api.de/api/interpreter",
    ]
    body = urllib.parse.urlencode({"data": query}).encode()
    last = None
    for url in endpoints:
        req = urllib.request.Request(
            url,
            data=body,
            headers={"User-Agent": "jp-toilet-export/1.0 (research)", "Content-Type": "application/x-www-form-urlencoded"},
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.loads(resp.read().decode())
        except Exception as exc:  # noqa: BLE001
            last = exc
            continue
    raise RuntimeError(f"all Overpass endpoints failed: {last}")
