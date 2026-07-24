from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional

PriceBucket = Literal["low", "mid", "high"]
AgeBucket = Literal["new", "mid", "old", "unknown"]


@dataclass(frozen=True)
class BucketThresholds:
    p10: float
    p50: float
    p90: float


DEFAULT_THRESHOLDS = BucketThresholds(p10=120_000, p50=220_000, p90=380_000)

# muted palette: fill = price, stroke conceptually mapped for client
PRICE_FILL = {
    "low": "#A8C5B5",
    "mid": "#E8C07A",
    "high": "#D9897A",
}

AGE_STROKE = {
    "new": "#5B8C7A",
    "mid": "#C4A35A",
    "old": "#8B5E5E",
    "unknown": "#9AA3A7",
}


def price_bucket(unit_price_ping: Optional[float], thr: BucketThresholds) -> PriceBucket:
    if unit_price_ping is None:
        return "mid"
    if unit_price_ping <= thr.p10:
        return "low"
    if unit_price_ping >= thr.p90:
        return "high"
    return "mid"


def age_bucket(age_years: Optional[float]) -> AgeBucket:
    if age_years is None:
        return "unknown"
    if age_years <= 10:
        return "new"
    if age_years <= 30:
        return "mid"
    return "old"


def fill_color(bucket: PriceBucket) -> str:
    return PRICE_FILL[bucket]


def stroke_color(bucket: AgeBucket) -> str:
    return AGE_STROKE[bucket]
