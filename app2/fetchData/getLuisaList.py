import hashlib
import json
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from hours import normalize_hours

URL = "https://www.louisacoffee.co/visit_result"
OUT_PATH = Path(__file__).resolve().parent.parent / "data" / "louisa_stores.json"
STORE_TYPE = "路易莎"

# jquery.twzipcode county names that return results
COUNTIES = [
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

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.louisacoffee.co/visit",
    "X-Requested-With": "XMLHttpRequest",
    "Accept": "text/html, */*; q=0.01",
}

# Decimal degrees, or DMS e.g. 25°02'56.5"N
DMS_RE = re.compile(
    r"(?P<deg>\d+)\s*°\s*(?P<min>\d+)\s*['\u2032]\s*(?P<sec>[\d.]+)\s*"
    r"[\"\u2033]?\s*(?P<hem>[NSEW])?",
    re.I,
)


def make_id(name: str, address: str) -> str:
    digest = hashlib.sha1(f"{STORE_TYPE}|{name}|{address}".encode("utf-8")).hexdigest()[:12]
    return f"louisa-{digest}"


def attr_str(value) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return str(value[0]) if value else ""
    return str(value)


def parse_coord(raw) -> float | None:
    text = attr_str(raw).strip()
    if text in ("", "0"):
        return None
    try:
        return float(text)
    except ValueError:
        pass

    m = DMS_RE.match(text)
    if not m:
        return None
    value = float(m["deg"]) + float(m["min"]) / 60 + float(m["sec"]) / 3600
    if (m["hem"] or "").upper() in ("S", "W"):
        value = -value
    return value


def parse_stores(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    stores = []

    for row in soup.select("div.row"):
        info = row.select_one(".store_info")
        if info is None:
            continue

        name = ""
        address = ""
        business_hours = ""

        h4 = info.find("h4")
        if h4:
            name = h4.get_text(strip=True)

        for p in info.find_all("p"):
            text = p.get_text(" ", strip=True)
            if text.startswith("地址/"):
                address = text.replace("地址/", "").strip()
            elif text.startswith("營業時間/"):
                business_hours = text.replace("營業時間/", "").strip()

        marker = row.select_one(".marker")
        lat_raw = attr_str(marker.get("rel-store-lat")) if marker else ""
        lng_raw = attr_str(marker.get("rel-store-lng")) if marker else ""
        lat = parse_coord(lat_raw)
        lng = parse_coord(lng_raw)

        if lat is None or lng is None:
            print(f"  skip no coords: {name or address}")
            continue

        stores.append({
            "id": make_id(name, address),
            "type": STORE_TYPE,
            "name": name,
            "地址": address,
            "lat": lat,
            "lng": lng,
            "營業時間": normalize_hours(business_hours),
            "備註": [],
        })

    return stores


def fetch_county(session: requests.Session, county: str, retries: int = 5) -> str:
    data = {
        "data[name]": "",
        "data[address]": "",
        "data[county]": county,
        "data[district]": "",
    }
    last_err: Exception | None = None
    for i in range(retries):
        try:
            resp = session.post(URL, data=data, timeout=30)
            resp.raise_for_status()
            return resp.text
        except (requests.RequestException, ValueError) as err:
            last_err = err
            time.sleep(1.0 * (i + 1))
    raise RuntimeError(f"failed {county}: {last_err}")


def main() -> None:
    session = requests.Session()
    session.headers.update(HEADERS)
    session.trust_env = False

    try:
        session.get("https://www.louisacoffee.co/visit", timeout=30)
    except requests.RequestException as err:
        print(f"warn: visit warmup failed ({err}); continue")

    all_stores: list[dict] = []
    seen: set[str] = set()

    for county in COUNTIES:
        time.sleep(0.3)
        html = fetch_county(session, county)
        stores = parse_stores(html)
        added = 0
        for store in stores:
            if store["id"] in seen:
                continue
            seen.add(store["id"])
            all_stores.append(store)
            added += 1
        print(f"{county}: +{added} (page {len(stores)}, cumulative {len(all_stores)})")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(all_stores, f, ensure_ascii=False, indent=2)

    print(f"Export {len(all_stores)} stores → {OUT_PATH}")


if __name__ == "__main__":
    main()
