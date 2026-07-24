#!/usr/bin/env python3
"""Import Kaohsiung real-price CSV → clean → geocode (cached) → Postgres/PostGIS.

Usage:
  cd app2/backend
  python scripts/import_csv.py --csv ../115-1-K.csv --limit 200
  python scripts/import_csv.py --csv ../115-1-K.csv --provider nlsc
"""

from __future__ import annotations

import argparse
import csv
import math
import os
import re
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Any, Optional

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

# Allow `python scripts/import_csv.py` without package install
sys.path.insert(0, str(Path(__file__).resolve().parent))
from geocode import Geocoder, normalize_address_key  # noqa: E402

M2_TO_PING = 3.30579
KEEP_TX_TYPES = {
    "房地(土地+建物)",
    "房地(土地+建物)+車位",
    "建物",
}
NOTE_EXCLUDE_RE = re.compile(
    r"親友|員工|共有人|特殊關係|瑕疵|急買急賣|預售屋|畸零地|公共設施保留地"
)
DOORPLATE_RE = re.compile(r"號")


def parse_roc_date(raw: str) -> Optional[date]:
    raw = (raw or "").strip()
    if not raw or not raw.isdigit() or len(raw) not in (6, 7):
        return None
    # YYYMMDD (7) or YYMMDD rare
    if len(raw) == 6:
        y, m, d = int(raw[:2]) + 1911, int(raw[2:4]), int(raw[4:6])
    else:
        y, m, d = int(raw[:3]) + 1911, int(raw[3:5]), int(raw[5:7])
    try:
        return date(y, m, d)
    except ValueError:
        return None


def parse_building_age(row: dict[str, str], as_of: date) -> Optional[float]:
    age_raw = (row.get("代表建號屋齡") or "").strip()
    if age_raw:
        try:
            return float(age_raw)
        except ValueError:
            pass

    completed = (row.get("建築完成年月") or "").strip()
    if not completed or not completed.isdigit() or len(completed) < 5:
        return None
    # ROC YYYYMM or YYYMM
    if len(completed) == 5:
        y = int(completed[:2]) + 1911
        m = int(completed[2:4])
    elif len(completed) == 6:
        y = int(completed[:3]) + 1911
        m = int(completed[3:5])
    else:
        return None
    m = max(1, min(12, m))
    try:
        done = date(y, m, 1)
    except ValueError:
        return None
    years = (as_of - done).days / 365.25
    return round(max(0.0, years), 1)


def to_float(raw: str) -> Optional[float]:
    raw = (raw or "").strip().replace(",", "")
    if not raw:
        return None
    try:
        v = float(raw)
        return v if math.isfinite(v) else None
    except ValueError:
        return None


def to_int(raw: str) -> Optional[int]:
    v = to_float(raw)
    return int(v) if v is not None else None


def load_rows(csv_path: Path) -> list[dict[str, str]]:
    # UTF-8 with Chinese header on line 1; skip English header on line 2
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        headers = next(reader)
        _english = next(reader)
        rows: list[dict[str, str]] = []
        for parts in reader:
            if not parts or all(not c.strip() for c in parts):
                continue
            # pad / trim to header length
            if len(parts) < len(headers):
                parts = parts + [""] * (len(headers) - len(parts))
            row = {headers[i]: parts[i] for i in range(len(headers))}
            rows.append(row)
    return rows


def clean_rows(raw_rows: list[dict[str, str]], as_of: date) -> list[dict[str, Any]]:
    cleaned: list[dict[str, Any]] = []
    for row in raw_rows:
        tx_type = (row.get("交易標的種類") or "").strip()
        if tx_type not in KEEP_TX_TYPES:
            continue

        unit_m2 = to_float(row.get("單價元平方公尺") or "")
        if unit_m2 is None or unit_m2 <= 0:
            continue

        address = (row.get("代表地號或門牌") or "").strip()
        if not address or not DOORPLATE_RE.search(address):
            continue

        note = (row.get("備註欄") or "").strip()
        note_flag = bool(NOTE_EXCLUDE_RE.search(note))
        if note_flag:
            continue

        tx_date = parse_roc_date(row.get("交易日期") or "")
        age = parse_building_age(row, as_of=tx_date or as_of)
        elev = (row.get("電梯") or "").strip()
        has_elevator = True if elev == "有" else False if elev == "無" else None

        cleaned.append(
            {
                "address_text": normalize_address_key(address),
                "district": (row.get("行政區") or "").strip() or None,
                "building_type": (row.get("建物型態") or "").strip() or None,
                "total_price": to_int(row.get("房地總價") or ""),
                "unit_price_m2": unit_m2,
                "unit_price_ping": unit_m2 * M2_TO_PING,
                "building_age_years": age,
                "tx_date": tx_date,
                "rooms": to_int(row.get("幾房") or ""),
                "halls": to_int(row.get("幾廳") or ""),
                "baths": to_int(row.get("幾衛") or ""),
                "has_elevator": has_elevator,
                "note_flag": False,
            }
        )
    return cleaned


def dedupe_latest(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    best: dict[str, dict[str, Any]] = {}
    for row in rows:
        key = row["address_text"]
        prev = best.get(key)
        if prev is None:
            best[key] = row
            continue
        prev_d = prev.get("tx_date") or date.min
        cur_d = row.get("tx_date") or date.min
        if cur_d >= prev_d:
            best[key] = row
    return list(best.values())


def filter_price_outliers(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, float]]:
    prices = sorted(r["unit_price_ping"] for r in rows if r.get("unit_price_ping"))
    if len(prices) < 20:
        mid = prices[len(prices) // 2] if prices else 220000
        return rows, {"p10": mid * 0.6, "p50": mid, "p90": mid * 1.6}

    def pct(p: float) -> float:
        idx = int(round((len(prices) - 1) * p))
        return prices[idx]

    p01, p99 = pct(0.01), pct(0.99)
    filtered = [r for r in rows if p01 <= r["unit_price_ping"] <= p99]
    prices2 = sorted(r["unit_price_ping"] for r in filtered)

    def pct2(p: float) -> float:
        idx = int(round((len(prices2) - 1) * p))
        return prices2[idx]

    buckets = {"p10": pct2(0.10), "p50": pct2(0.50), "p90": pct2(0.90)}
    return filtered, buckets


def upsert_all(
    conn: psycopg.Connection,
    rows: list[dict[str, Any]],
    source_file: str,
    geocoder: Geocoder,
) -> dict[str, int]:
    stats = {"geocode_hit": 0, "geocode_miss": 0, "geocode_new": 0, "upserted": 0}

    with conn.cursor(row_factory=dict_row) as cur:
        for row in rows:
            addr = row["address_text"]
            cur.execute(
                "SELECT lat, lng, provider FROM geocode_cache WHERE address_text = %s",
                (addr,),
            )
            cached = cur.fetchone()
            lat = lng = None
            provider = None
            if cached and cached["lat"] is not None and cached["lng"] is not None:
                lat, lng, provider = cached["lat"], cached["lng"], cached["provider"]
                stats["geocode_hit"] += 1
            else:
                geo = geocoder.geocode(addr, row.get("district"))
                if geo:
                    lat, lng, provider = geo.lat, geo.lng, geo.provider
                    cur.execute(
                        """
                        INSERT INTO geocode_cache (address_text, lat, lng, provider, updated_at)
                        VALUES (%s, %s, %s, %s, NOW())
                        ON CONFLICT (address_text) DO UPDATE
                          SET lat = EXCLUDED.lat,
                              lng = EXCLUDED.lng,
                              provider = EXCLUDED.provider,
                              updated_at = NOW()
                        """,
                        (addr, lat, lng, provider),
                    )
                    stats["geocode_new"] += 1
                else:
                    stats["geocode_miss"] += 1

            if lat is None or lng is None:
                continue

            cur.execute(
                """
                INSERT INTO transactions (
                  address_text, district, building_type, total_price,
                  unit_price_m2, unit_price_ping, building_age_years, tx_date,
                  rooms, halls, baths, has_elevator, note_flag,
                  lat, lng, geom, source_file, detail_url, updated_at
                ) VALUES (
                  %(address_text)s, %(district)s, %(building_type)s, %(total_price)s,
                  %(unit_price_m2)s, %(unit_price_ping)s, %(building_age_years)s, %(tx_date)s,
                  %(rooms)s, %(halls)s, %(baths)s, %(has_elevator)s, %(note_flag)s,
                  %(lat)s, %(lng)s,
                  ST_SetSRID(ST_MakePoint(%(lng)s, %(lat)s), 4326)::geography,
                  %(source_file)s, NULL, NOW()
                )
                ON CONFLICT (address_text, source_file) DO UPDATE SET
                  district = EXCLUDED.district,
                  building_type = EXCLUDED.building_type,
                  total_price = EXCLUDED.total_price,
                  unit_price_m2 = EXCLUDED.unit_price_m2,
                  unit_price_ping = EXCLUDED.unit_price_ping,
                  building_age_years = EXCLUDED.building_age_years,
                  tx_date = EXCLUDED.tx_date,
                  rooms = EXCLUDED.rooms,
                  halls = EXCLUDED.halls,
                  baths = EXCLUDED.baths,
                  has_elevator = EXCLUDED.has_elevator,
                  lat = EXCLUDED.lat,
                  lng = EXCLUDED.lng,
                  geom = EXCLUDED.geom,
                  updated_at = NOW()
                """,
                {
                    **row,
                    "lat": lat,
                    "lng": lng,
                    "source_file": source_file or "",
                },
            )
            stats["upserted"] += 1

        conn.commit()
    return stats


def save_buckets(conn: psycopg.Connection, buckets: dict[str, float]) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO price_buckets (id, p10, p50, p90, updated_at)
            VALUES (1, %(p10)s, %(p50)s, %(p90)s, NOW())
            ON CONFLICT (id) DO UPDATE SET
              p10 = EXCLUDED.p10,
              p50 = EXCLUDED.p50,
              p90 = EXCLUDED.p90,
              updated_at = NOW()
            """,
            buckets,
        )
        conn.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Import real-price CSV into PostGIS")
    parser.add_argument("--csv", required=True, type=Path, help="Path to CSV e.g. ../115-1-K.csv")
    parser.add_argument("--limit", type=int, default=0, help="Max unique addresses after clean (0=all)")
    parser.add_argument("--provider", choices=["demo", "nlsc"], default=None)
    parser.add_argument("--database-url", default=None)
    args = parser.parse_args()

    backend_dir = Path(__file__).resolve().parents[1]
    load_dotenv(backend_dir / ".env")
    load_dotenv(backend_dir / ".env.example")

    db_url = args.database_url or os.getenv(
        "DATABASE_URL", "postgresql://kaohsiung:kaohsiung@127.0.0.1:5432/kaohsiung_price"
    )
    provider = args.provider or os.getenv("GEOCODE_PROVIDER", "demo")
    geocoder = Geocoder(provider=provider)

    print(f"Reading {args.csv} ...")
    raw = load_rows(args.csv)
    print(f"  raw rows: {len(raw)}")

    cleaned = clean_rows(raw, as_of=date.today())
    print(f"  after filters: {len(cleaned)}")

    deduped = dedupe_latest(cleaned)
    print(f"  after address dedupe: {len(deduped)}")

    filtered, buckets = filter_price_outliers(deduped)
    print(f"  after price outlier trim: {len(filtered)}")
    print(f"  price buckets p10/p50/p90: {buckets['p10']:.0f}/{buckets['p50']:.0f}/{buckets['p90']:.0f}")

    if args.limit and args.limit > 0:
        filtered = filtered[: args.limit]
        print(f"  limited to: {len(filtered)}")

    source_file = args.csv.name
    print(f"Connecting DB + geocoding with provider={provider} ...")
    with psycopg.connect(db_url) as conn:
        # Ensure schema exists (idempotent for re-runs without docker init)
        schema_sql = (backend_dir / "sql" / "schema.sql").read_text(encoding="utf-8")
        with conn.cursor() as cur:
            cur.execute(schema_sql)
        conn.commit()

        save_buckets(conn, buckets)
        stats = upsert_all(conn, filtered, source_file, geocoder)

    print("Done:", stats)
    print(f"Finished at {datetime.now().isoformat(timespec='seconds')}")


if __name__ == "__main__":
    main()
