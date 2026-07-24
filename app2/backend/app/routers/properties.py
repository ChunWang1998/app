from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from ..db import get_conn
from ..schemas import (
    NearbyResponse,
    NearestResponse,
    PropertyDetail,
    PropertyPoint,
)
from ..services.colors import (
    DEFAULT_THRESHOLDS,
    AGE_STROKE,
    PRICE_FILL,
    BucketThresholds,
    age_bucket,
    fill_color,
    price_bucket,
    stroke_color,
)

router = APIRouter(prefix="/properties", tags=["properties"])


def _load_thresholds(cur) -> BucketThresholds:
    cur.execute("SELECT p10, p50, p90 FROM price_buckets WHERE id = 1")
    row = cur.fetchone()
    if not row:
        return DEFAULT_THRESHOLDS
    return BucketThresholds(p10=row["p10"], p50=row["p50"], p90=row["p90"])


def _row_to_point(row: dict[str, Any], thr: BucketThresholds) -> PropertyPoint:
    pb = price_bucket(row.get("unit_price_ping"), thr)
    ab = age_bucket(row.get("building_age_years"))
    return PropertyPoint(
        id=row["id"],
        lat=row["lat"],
        lng=row["lng"],
        building_age_years=row.get("building_age_years"),
        unit_price_ping=row.get("unit_price_ping"),
        price_bucket=pb,
        age_bucket=ab,
        fill_color=fill_color(pb),
        stroke_color=stroke_color(ab),
        distance_m=float(row["distance_m"]),
        building_type=row.get("building_type"),
        tx_date=row.get("tx_date"),
    )


LEGEND = {
    "price_fill": {
        "low": {"label": "較低坪價", "color": PRICE_FILL["low"]},
        "mid": {"label": "中間坪價", "color": PRICE_FILL["mid"]},
        "high": {"label": "較高坪價", "color": PRICE_FILL["high"]},
    },
    "age_stroke": {
        "new": {"label": "屋齡 0–10 年", "color": AGE_STROKE["new"]},
        "mid": {"label": "屋齡 11–30 年", "color": AGE_STROKE["mid"]},
        "old": {"label": "屋齡 31+ 年", "color": AGE_STROKE["old"]},
        "unknown": {"label": "屋齡未知", "color": AGE_STROKE["unknown"]},
    },
    "disclaimer": (
        "本 App 資料來自內政部實價登錄公開資訊之彙整，僅供參考，"
        "非不動產估價、非即時成交保證；點位為門牌 geocode 約略位置，"
        "可能與實際建物有偏差。"
    ),
}


@router.get("/nearby", response_model=NearbyResponse)
def nearby(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_m: float = Query(500, gt=0, le=5000),
    limit: int = Query(20, ge=1, le=50),
) -> NearbyResponse:
    sql = """
      SELECT
        id, lat, lng, building_age_years, unit_price_ping,
        building_type, tx_date,
        ST_Distance(geom, ST_SetSRID(ST_MakePoint(%(lng)s, %(lat)s), 4326)::geography) AS distance_m
      FROM transactions
      WHERE lat IS NOT NULL
        AND lng IS NOT NULL
        AND geom IS NOT NULL
        AND ST_DWithin(
          geom,
          ST_SetSRID(ST_MakePoint(%(lng)s, %(lat)s), 4326)::geography,
          %(radius_m)s
        )
      ORDER BY distance_m ASC
      LIMIT %(limit)s
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            thr = _load_thresholds(cur)
            cur.execute(sql, {"lat": lat, "lng": lng, "radius_m": radius_m, "limit": limit})
            rows = cur.fetchall()

    items = [_row_to_point(r, thr) for r in rows]
    return NearbyResponse(count=len(items), items=items, legend=LEGEND)


@router.get("/nearest", response_model=NearestResponse)
def nearest(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    max_m: float = Query(100, gt=0, le=1000),
) -> NearestResponse:
    sql = """
      SELECT
        id, lat, lng, building_age_years, unit_price_ping,
        building_type, tx_date,
        ST_Distance(geom, ST_SetSRID(ST_MakePoint(%(lng)s, %(lat)s), 4326)::geography) AS distance_m
      FROM transactions
      WHERE lat IS NOT NULL
        AND lng IS NOT NULL
        AND geom IS NOT NULL
        AND ST_DWithin(
          geom,
          ST_SetSRID(ST_MakePoint(%(lng)s, %(lat)s), 4326)::geography,
          %(max_m)s
        )
      ORDER BY distance_m ASC
      LIMIT 1
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            thr = _load_thresholds(cur)
            cur.execute(sql, {"lat": lat, "lng": lng, "max_m": max_m})
            row = cur.fetchone()

    if not row:
        return NearestResponse(
            found=False,
            empty_message="附近 100 公尺內尚無成交資料",
        )
    return NearestResponse(found=True, item=_row_to_point(row, thr))


@router.get("/{property_id}", response_model=PropertyDetail)
def detail(property_id: int) -> PropertyDetail:
    sql = """
      SELECT
        id, address_text, district, building_type, total_price,
        unit_price_m2, unit_price_ping, building_age_years, tx_date,
        rooms, halls, baths, has_elevator, lat, lng, detail_url
      FROM transactions
      WHERE id = %s
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (property_id,))
            row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Property not found")

    return PropertyDetail(
        **row,
        detail_url=row.get("detail_url"),
        detail_status="coming_soon",
    )
