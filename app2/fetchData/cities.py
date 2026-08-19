"""Shared target cities for every fetchData get* script.

Change CITIES here to expand or shrink coverage for all scrapers.
"""

from __future__ import annotations

CITIES: list[str] = ["高雄市", "台南市", "新北市", "台北市"]
CITY_SET: set[str] = set(CITIES)


def norm_tw(text: str) -> str:
    return (text or "").strip().replace("臺", "台")


def in_cities(text: str) -> bool:
    t = norm_tw(text)
    if not t:
        return False
    return any(norm_tw(city) in t for city in CITIES)
