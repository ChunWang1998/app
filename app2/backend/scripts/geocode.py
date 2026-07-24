"""Geocode helpers: NLSC (when credentials present) + deterministic demo fallback.

NLSC fuzzy address APIs generally require a free application.
Set NLSC_APP_ID / NLSC_API_KEY and GEOCODE_PROVIDER=nlsc when approved.

Demo mode places each unique address near its district centroid with a
deterministic offset so the local map demo works without an API key.
"""

from __future__ import annotations

import hashlib
import math
import os
import time
from dataclasses import dataclass
from typing import Optional
import httpx

# Approximate district centroids for Kaohsiung (WGS84)
DISTRICT_CENTROIDS: dict[str, tuple[float, float]] = {
    "楠梓區": (22.7336, 120.3289),
    "左營區": (22.6872, 120.2948),
    "鼓山區": (22.6500, 120.2740),
    "三民區": (22.6497, 120.3107),
    "鹽埕區": (22.6245, 120.2838),
    "前金區": (22.6270, 120.2945),
    "新興區": (22.6316, 120.3108),
    "苓雅區": (22.6235, 120.3208),
    "前鎮區": (22.5967, 120.3145),
    "旗津區": (22.5890, 120.2890),
    "小港區": (22.5654, 120.3537),
    "鳳山區": (22.6265, 120.3570),
    "林園區": (22.5070, 120.3950),
    "大寮區": (22.6060, 120.3960),
    "大樹區": (22.6920, 120.4250),
    "大社區": (22.7300, 120.3470),
    "仁武區": (22.7010, 120.3480),
    "鳥松區": (22.6590, 120.3630),
    "岡山區": (22.7970, 120.2950),
    "橋頭區": (22.7570, 120.3060),
    "燕巢區": (22.7870, 120.3630),
    "田寮區": (22.8700, 120.3600),
    "阿蓮區": (22.8830, 120.3270),
    "路竹區": (22.8550, 120.2620),
    "湖內區": (22.8930, 120.2120),
    "茄萣區": (22.9070, 120.1980),
    "永安區": (22.8200, 120.2250),
    "彌陀區": (22.7830, 120.2480),
    "梓官區": (22.7600, 120.2600),
    "旗山區": (22.8880, 120.4830),
    "美濃區": (22.9000, 120.5400),
    "六龜區": (22.9980, 120.6330),
    "甲仙區": (23.0830, 120.5900),
    "杉林區": (22.9700, 120.5400),
    "內門區": (22.9450, 120.4700),
    "茂林區": (22.8860, 120.6650),
    "桃源區": (23.1600, 120.7600),
    "那瑪夏區": (23.2500, 120.7000),
}

CITY_FALLBACK = (22.6273, 120.3014)


@dataclass
class GeoResult:
    lat: float
    lng: float
    provider: str


def _demo_point(address: str, district: Optional[str]) -> GeoResult:
    base = DISTRICT_CENTROIDS.get(district or "", CITY_FALLBACK)
    digest = hashlib.md5(address.encode("utf-8")).hexdigest()
    # ~±400m jitter so same-district pins don't stack
    dlat = ((int(digest[:4], 16) / 65535.0) - 0.5) * 0.007
    dlng = ((int(digest[4:8], 16) / 65535.0) - 0.5) * 0.007
    return GeoResult(lat=base[0] + dlat, lng=base[1] + dlng, provider="demo")


class Geocoder:
    def __init__(
        self,
        provider: Optional[str] = None,
        rate_limit_ms: Optional[int] = None,
    ) -> None:
        self.provider = (provider or os.getenv("GEOCODE_PROVIDER", "demo")).lower()
        self.rate_limit_ms = int(rate_limit_ms or os.getenv("GEOCODE_RATE_LIMIT_MS", "300"))
        self.app_id = os.getenv("NLSC_APP_ID", "").strip()
        self.api_key = os.getenv("NLSC_API_KEY", "").strip()
        # Common TGOS-compatible endpoint used by NLSC address applicants
        self.nlsc_query_url = os.getenv(
            "NLSC_QUERY_URL",
            "https://api.nlsc.gov.tw/other/TownVillagePointQuery",  # not for forward geo
        )
        self.tgos_url = os.getenv(
            "NLSC_TGOS_URL",
            "https://addr.tgos.tw/addrws/v40/QueryAddr.asmx/QueryAddr",
        )
        self._last_call = 0.0

    def _throttle(self) -> None:
        elapsed = (time.time() - self._last_call) * 1000
        wait = self.rate_limit_ms - elapsed
        if wait > 0:
            time.sleep(wait / 1000.0)
        self._last_call = time.time()

    def geocode(self, address: str, district: Optional[str] = None) -> Optional[GeoResult]:
        if self.provider == "demo":
            return _demo_point(address, district)

        if self.provider == "nlsc":
            result = self._geocode_nlsc_tgos(address)
            if result:
                return result
            # Soft fallback so import still completes for demo
            return _demo_point(address, district)

        return _demo_point(address, district)

    def _geocode_nlsc_tgos(self, address: str) -> Optional[GeoResult]:
        """Forward-geocode via TGOS QueryAddr (NLSC-related free apply flow)."""
        if not self.app_id or not self.api_key:
            return None

        self._throttle()
        params = {
            "oAPPId": self.app_id,
            "oAPIKey": self.api_key,
            "oAddress": address,
            "oSRS": "EPSG:4326",
            "oFuzzyType": "2",
            "oResultDataType": "JSON",
            "oFuzzyBuffer": "0",
            "oIsOnlyFullMatch": "false",
            "oIsSupportPast": "true",
            "oIsShowCodeBase": "true",
            "oIsEnableIgnoreTownNameSameNumber": "false",
            "oIsEnableIgnoreUnit": "false",
            "oIsEnableTownname": "false",
            "oIsEnableUnit1": "false",
            "oIsEnableUnit2": "false",
            "oIsEnableUnit3": "false",
            "oIsEnableUnit4": "false",
            "oIsEnableUnit5": "false",
            "oIsEnableNumber": "true",
            "oIsEnableBuilding": "true",
            "oIsEnableFuzzyTownname": "false",
            "oIsEnableFuzzyUnit": "false",
            "oIsEnableFuzzyNumber": "false",
            "oIsOutputCoordinatesOnly": "true",
        }
        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.get(self.tgos_url, params=params)
                if resp.status_code != 200:
                    return None
                data = resp.json()
                # TGOS JSON shape: AddressList[0].X / .Y (lng/lat when EPSG:4326)
                items = data.get("AddressList") or data.get("addressList") or []
                if not items:
                    return None
                first = items[0]
                lng = float(first.get("X") or first.get("x"))
                lat = float(first.get("Y") or first.get("y"))
                if not (math.isfinite(lat) and math.isfinite(lng)):
                    return None
                return GeoResult(lat=lat, lng=lng, provider="nlsc")
        except Exception:
            return None


def normalize_address_key(address: str) -> str:
    return address.replace(" ", "").replace("　", "").strip()
