from __future__ import annotations

from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"


class InKaohsiungResponse(BaseModel):
    in_kaohsiung: bool
    method: str
    message: Optional[str] = None


class PropertyPoint(BaseModel):
    id: int
    lat: float
    lng: float
    building_age_years: Optional[float] = None
    unit_price_ping: Optional[float] = None
    price_bucket: Literal["low", "mid", "high"]
    age_bucket: Literal["new", "mid", "old", "unknown"]
    fill_color: str
    stroke_color: str
    distance_m: float
    building_type: Optional[str] = None
    tx_date: Optional[date] = None


class NearbyResponse(BaseModel):
    count: int
    items: list[PropertyPoint]
    legend: dict


class NearestResponse(BaseModel):
    found: bool
    item: Optional[PropertyPoint] = None
    empty_message: Optional[str] = None


class PropertyDetail(BaseModel):
    id: int
    address_text: str
    district: Optional[str] = None
    building_type: Optional[str] = None
    total_price: Optional[int] = None
    unit_price_m2: Optional[float] = None
    unit_price_ping: Optional[float] = None
    building_age_years: Optional[float] = None
    tx_date: Optional[date] = None
    rooms: Optional[int] = None
    halls: Optional[int] = None
    baths: Optional[int] = None
    has_elevator: Optional[bool] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    detail_url: Optional[str] = Field(
        default=None,
        description="External detail link — placeholder for demo",
    )
    detail_status: str = "coming_soon"
