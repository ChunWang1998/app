"""Shared Taiwan coverage for every fetchData get* script.

CITIES is all 22 counties / cities (including Penghu, Kinmen, Lienchiang).
"""

from __future__ import annotations

CITIES: list[str] = [
    "基隆市",
    "台北市",
    "新北市",
    "桃園市",
    "新竹市",
    "新竹縣",
    "苗栗縣",
    "台中市",
    "彰化縣",
    "南投縣",
    "雲林縣",
    "嘉義市",
    "嘉義縣",
    "台南市",
    "高雄市",
    "屏東縣",
    "宜蘭縣",
    "花蓮縣",
    "台東縣",
    "澎湖縣",
    "金門縣",
    "連江縣",
]
CITY_SET: set[str] = set(CITIES)

# MOI / MOENV county codes used by FAC_P_07 and similar open data.
COUNTY_CODES: dict[str, str] = {
    "台北市": "63000",
    "高雄市": "64000",
    "新北市": "65000",
    "台中市": "66000",
    "台南市": "67000",
    "桃園市": "68000",
    "宜蘭縣": "10002",
    "新竹縣": "10004",
    "苗栗縣": "10005",
    "彰化縣": "10007",
    "南投縣": "10008",
    "雲林縣": "10009",
    "嘉義縣": "10010",
    "屏東縣": "10013",
    "台東縣": "10014",
    "花蓮縣": "10015",
    "澎湖縣": "10016",
    "基隆市": "10017",
    "新竹市": "10018",
    "嘉義市": "10020",
    "金門縣": "09020",
    "連江縣": "09007",
}

# south, west, north, east — Taiwan proper + Penghu + Kinmen + Matsu
TW_BBOX: tuple[float, float, float, float] = (21.5, 118.0, 26.5, 122.5)


def norm_tw(text: str) -> str:
    return (text or "").strip().replace("臺", "台")


def aliases_for(city: str) -> tuple[str, ...]:
    n = norm_tw(city)
    variants = {n, n.replace("台", "臺"), city}
    if n.endswith(("市", "縣")):
        short = n[:-1]
        variants.add(short)
        variants.add(short.replace("台", "臺"))
    return tuple(sorted(variants, key=len, reverse=True))


def city_from_text(text: str) -> str | None:
    t = norm_tw(text)
    if not t:
        return None
    ranked: list[tuple[int, str]] = []
    for city in CITIES:
        for alias in aliases_for(city):
            a = norm_tw(alias)
            if a and a in t:
                ranked.append((len(a), city))
                break
    if not ranked:
        return None
    ranked.sort(reverse=True)
    return ranked[0][1]


def in_cities(text: str) -> bool:
    return city_from_text(text) is not None
