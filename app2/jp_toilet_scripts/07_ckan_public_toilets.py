#!/usr/bin/env python3
"""Nationwide public-toilet CSVs from BODIK ODCS and the Tokyo open-data catalog.

These are the Digital Agency standard 公衆トイレ一覧 files (lat/lng, fixtures, hours).
BODIK's JSON API often omits coordinates, so this script downloads the CSVs.

Usage:
  python 07_ckan_public_toilets.py --out public_toilets_jp.json
  python 07_ckan_public_toilets.py --catalog tokyo --limit-files 5
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("pub", HERE / "03_public_toilets.py")
pub = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pub)

CATALOGS = {
    "bodik": "https://data.bodik.jp/api/3/action/package_search",
    "tokyo": "https://catalog.data.metro.tokyo.lg.jp/api/3/action/package_search",
}


def get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "jp-toilet-export/1.0"})
    with urllib.request.urlopen(req, timeout=40) as resp:
        return json.loads(resp.read().decode())


def csv_urls(base: str, limit_files: int) -> list[str]:
    urls: list[str] = []
    start = 0
    while len(urls) < limit_files:
        payload = get_json(f"{base}?q=%E5%85%AC%E8%A1%86%E3%83%88%E3%82%A4%E3%83%AC&rows=50&start={start}")
        results = payload.get("result", {}).get("results") or []
        if not results:
            break
        for pkg in results:
            for res in pkg.get("resources") or []:
                url = res.get("url") or ""
                fmt = (res.get("format") or "").lower()
                if url.lower().endswith(".csv") or fmt == "csv":
                    urls.append(url)
                    if len(urls) >= limit_files:
                        return urls
        start += 50
    return urls


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--catalog", choices=["both", "bodik", "tokyo"], default="both")
    p.add_argument("--limit-files", type=int, default=30)
    p.add_argument("--out", default="public_toilets_jp.json")
    args = p.parse_args()
    names = ["bodik", "tokyo"] if args.catalog == "both" else [args.catalog]
    rows = []
    seen = set()
    for name in names:
        urls = csv_urls(CATALOGS[name], args.limit_files)
        print(f"{name}: {len(urls)} csv")
        for url in urls:
            if url in seen:
                continue
            seen.add(url)
            try:
                text = pub.decode(pub.get(url))
            except Exception as exc:  # noqa: BLE001
                print(f"skip {url}: {exc}")
                continue
            got = pub.rows_from_csv(text, url)
            print(f"{len(got):4d}  {url}")
            rows.extend(got)
    pub.dump(args.out, rows)
    print(f"wrote {len(rows)} -> {args.out}")


if __name__ == "__main__":
    main()
