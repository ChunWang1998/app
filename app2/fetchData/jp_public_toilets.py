#!/usr/bin/env python3
"""公衆トイレ — 東京都オープンデータカタログ（自治体標準データセット CSV）。"""
from __future__ import annotations

import csv
import io

from common import SESSION, dump_sample, save_json
from jp_common import dedupe, hours_from_range, jp_record

CKAN = "https://catalog.data.metro.tokyo.lg.jp/api/3/action/package_search"


def list_csv_urls(catalog: str = CKAN) -> list[str]:
    urls: list[str] = []
    start = 0
    while True:
        resp = SESSION.get(
            catalog,
            params={"q": "公衆トイレ", "rows": 100, "start": start},
            timeout=40,
        )
        resp.raise_for_status()
        result = (resp.json().get("result") or {})
        packages = result.get("results") or []
        if not packages:
            break
        for pkg in packages:
            title = pkg.get("title") or ""
            if "公衆トイレ" not in title and "公衆便所" not in title:
                continue
            for res in pkg.get("resources") or []:
                url = res.get("url") or ""
                name = f"{res.get('name') or ''} {res.get('format') or ''}"
                blob = f"{url} {name}".lower()
                if "csv" not in blob and not url.lower().endswith(".csv"):
                    continue
                urls.append(url)
        start += len(packages)
        if start >= int(result.get("count") or 0):
            break
    # Preserve order, drop duplicates.
    seen: set[str] = set()
    unique: list[str] = []
    for url in urls:
        if url in seen:
            continue
        seen.add(url)
        unique.append(url)
    return unique


def decode(raw: bytes) -> str:
    for enc in ("utf-8-sig", "cp932", "utf-8"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    else:
        text = raw.decode("utf-8", errors="replace")
    return text.replace("\r\n", "\n").replace("\r", "\n")


def rows_from_csv(text: str, source: str) -> list[dict]:
    out = []
    for i, row in enumerate(csv.DictReader(io.StringIO(text))):
        lat = row.get("緯度") or row.get("latitude")
        lng = row.get("経度") or row.get("longitude")
        if not lat or not lng:
            continue
        try:
            lat_f, lng_f = float(lat), float(lng)
        except ValueError:
            continue
        name = (row.get("名称") or row.get("name") or f"公衆トイレ{i}").strip()
        city = (row.get("地方公共団体名") or "").strip()
        address = (row.get("所在地_連結表記") or "").strip()
        if not address:
            address = "".join(
                (row.get(key) or "")
                for key in ("所在地_都道府県", "所在地_市区町村", "所在地_町字", "所在地_番地以下")
            )
        hours = hours_from_range(
            row.get("利用開始時間"),
            row.get("利用終了時間"),
            row.get("利用可能時間特記事項"),
        )
        out.append(
            jp_record(
                "公衆トイレ",
                f"{city} {name}".strip(),
                address,
                lat_f,
                lng_f,
                hours,
                extra={"osm_id": row.get("ID") or f"{source}:{i}"},
            )
        )
    return out


def fetch() -> list[dict]:
    rows: list[dict] = []
    for url in list_csv_urls():
        try:
            resp = SESSION.get(url, timeout=40)
            resp.raise_for_status()
            text = decode(resp.content)
            got = rows_from_csv(text, url)
        except Exception as exc:  # noqa: BLE001
            print(f"  skip {url}: {exc}", flush=True)
            continue
        print(f"  {len(got):4d}  {url}", flush=True)
        rows.extend(got)
    return dedupe(rows)


if __name__ == "__main__":
    data = fetch()
    dump_sample(data)
    save_json("jp_public_toilets.json", data)
