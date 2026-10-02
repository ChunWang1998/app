#!/usr/bin/env python3
"""公衆トイレ — BODIK 與東京都目錄的標準 CSV（全國，含座標）。"""
from common import SESSION, dump_sample, save_json
from jp_common import dedupe
from jp_public_toilets import decode, list_csv_urls, rows_from_csv

CATALOGS = {
    "bodik": "https://data.bodik.jp/api/3/action/package_search",
    "tokyo": "https://catalog.data.metro.tokyo.lg.jp/api/3/action/package_search",
}


def fetch() -> list[dict]:
    rows: list[dict] = []
    seen_urls: set[str] = set()
    for name, catalog in CATALOGS.items():
        urls = [url for url in list_csv_urls(catalog) if url not in seen_urls]
        seen_urls.update(urls)
        print(f"  {name}: {len(urls)} csv", flush=True)
        for url in urls:
            try:
                resp = SESSION.get(url, timeout=40)
                resp.raise_for_status()
                got = rows_from_csv(decode(resp.content), url)
            except Exception as exc:  # noqa: BLE001
                print(f"  skip {url}: {exc}", flush=True)
                continue
            print(f"  {len(got):4d}  {url}", flush=True)
            rows.extend(got)
    return dedupe(rows)


if __name__ == "__main__":
    data = fetch()
    dump_sample(data)
    save_json("jp_ckan_public_toilets.json", data)
