"""Kaohsiung boundary helpers.

Demo uses a bounding box + district name check via NLSC open reverse-geo API
(TownVillagePointQuery), falling back to bbox when the network call fails.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from typing import Optional

import httpx

from ..config import get_settings

KAOHSIUNG_COUNTY_RE = re.compile(r"高雄")


def in_kaohsiung_bbox(lat: float, lng: float) -> bool:
    s = get_settings()
    return s.kh_lat_min <= lat <= s.kh_lat_max and s.kh_lng_min <= lng <= s.kh_lng_max


def reverse_county(lat: float, lng: float, timeout: float = 4.0) -> Optional[str]:
    """Return county/city name from NLSC free open API, or None on failure."""
    url = f"https://api.nlsc.gov.tw/other/TownVillagePointQuery/{lng}/{lat}/4326"
    try:
        with httpx.Client(timeout=timeout, headers={"Accept": "application/xml"}) as client:
            resp = client.get(url)
            if resp.status_code != 200:
                return None
            root = ET.fromstring(resp.text)
            # Response shape varies; look for county/city name tags.
            for tag in ("ctyName", "countyName", "CITY", "countyname", "CountyName"):
                node = root.find(f".//{tag}")
                if node is not None and node.text:
                    return node.text.strip()
            # Fallback: any text containing 高雄 / 縣市名稱
            text = "".join(root.itertext())
            if "高雄" in text:
                return "高雄市"
            return text.strip()[:40] or None
    except Exception:
        return None


def is_in_kaohsiung(lat: float, lng: float) -> tuple[bool, str]:
    if not in_kaohsiung_bbox(lat, lng):
        return False, "outside_bbox"

    county = reverse_county(lat, lng)
    if county is None:
        # Network/API unavailable — trust bbox for local demo.
        return True, "bbox_fallback"

    if KAOHSIUNG_COUNTY_RE.search(county):
        return True, "nlsc_reverse"

    return False, f"county:{county}"
