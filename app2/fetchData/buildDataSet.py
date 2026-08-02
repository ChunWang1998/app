"""Merge source JSON files under data/ into data/dataSet.json and app bundles."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
OUT_PATH = DATA_DIR / "dataSet.json"
SYNC_TARGETS = [
    ROOT / "web" / "public" / "dataSet.json",
    ROOT / "mobile" / "assets" / "dataSet.json",
]

SOURCE_FILES = [
    "711_with_toilet.json",
    "louisa_stores.json",
]

REQUIRED = ("id", "type", "地址", "lat", "lng", "營業時間")

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hours import normalize_hours  # noqa: E402


def load_source(path: Path) -> list[dict]:
    if not path.exists():
        print(f"skip missing: {path.name}")
        return []
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError(f"{path.name} must be a JSON array")
    return data


def coerce_hours(value) -> dict:
    if isinstance(value, dict) and "byDay" in value:
        return {
            "raw": str(value.get("raw") or ""),
            "allDay": bool(value.get("allDay")),
            "unknown": bool(value.get("unknown")),
            "byDay": value.get("byDay") or {},
        }
    return normalize_hours(str(value or ""))


def normalize(item: dict) -> dict | None:
    for key in REQUIRED:
        if key not in item:
            print(f"skip incomplete record (missing {key}): {item.get('地址')}")
            return None
    return {
        "id": str(item["id"]),
        "type": str(item["type"]),
        "name": str(item.get("name") or ""),
        "地址": str(item["地址"]),
        "lat": float(item["lat"]),
        "lng": float(item["lng"]),
        "營業時間": coerce_hours(item["營業時間"]),
        "備註": list(item.get("備註") or []),
    }


def main() -> None:
    merged: list[dict] = []
    seen: set[str] = set()

    for name in SOURCE_FILES:
        for item in load_source(DATA_DIR / name):
            normalized = normalize(item)
            if normalized is None:
                continue
            if normalized["id"] in seen:
                continue
            seen.add(normalized["id"])
            merged.append(normalized)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(merged, ensure_ascii=False, indent=2)
    OUT_PATH.write_text(payload, encoding="utf-8")
    print(f"wrote {len(merged)} places → {OUT_PATH}")

    for target in SYNC_TARGETS:
        if not target.parent.exists():
            print(f"skip sync (missing dir): {target}")
            continue
        target.write_text(payload, encoding="utf-8")
        print(f"synced → {target}")


if __name__ == "__main__":
    main()
