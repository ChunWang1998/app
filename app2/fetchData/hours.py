"""Normalize free-text 營業時間 into a machine-checkable weekly schedule."""

from __future__ import annotations

import re
from typing import Any

# ISO weekday: 1=Mon ... 7=Sun
WEEKDAYS = ("1", "2", "3", "4", "5", "6", "7")
ALL_DAYS = list(WEEKDAYS)
WEEKDAYS_ONLY = ["1", "2", "3", "4", "5"]
WEEKEND = ["6", "7"]

TIME_RE = re.compile(r"(\d{1,2})\s*[:：]\s*(\d{2})")
RANGE_RE = re.compile(
    r"(\d{1,2})\s*[:：]\s*(\d{2})\s*[~～\-–—至到]\s*(\d{1,2})\s*[:：]\s*(\d{2})"
)

DAY_CHAR = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "日": 7, "天": 7}

CLOSED_RE = re.compile(r"(公休|不營業|休息|休業)")
ALL_DAY_RE = re.compile(r"24\s*[Hh小時]|全日|全天", re.I)

# Day expression kept as one token (do not split 週一至週日 mid-range)
DAY_EXPR = (
    r"(?:"
    r"平日|週末|周末|假日|例假日|國定假日|国定假日|每日|每天|"
    r"週[一二三四五六日天]\s*[至到\-–—~～]\s*(?:週)?(?:[一二三四五六日天]|週末|周末)|"
    r"週[一二三四五六日天](?:\s*[、,，和與及]\s*(?:週)?[一二三四五六日天])+|"
    r"週[一二三四五六日天]"
    r")"
)

SEGMENT_RE = re.compile(
    rf"(?P<days>{DAY_EXPR})"
    rf"(?:\s*及\s*(?:國定假日|国定假日|假日|例假日|寒暑假))*"
    rf"\s*"
    rf"(?P<body>公休|不營業|不定期公休|休息|休業|{RANGE_RE.pattern})",
    re.I,
)


def empty_by_day() -> dict[str, list]:
    return {d: [] for d in WEEKDAYS}


def normalize_time(hour: int, minute: int) -> str | None:
    if hour == 24 and minute == 0:
        return "24:00"
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        return None
    return f"{hour:02d}:{minute:02d}"


def parse_time_range(text: str) -> tuple[str, str] | None:
    m = RANGE_RE.search(text)
    if not m:
        return None
    open_t = normalize_time(int(m.group(1)), int(m.group(2)))
    close_t = normalize_time(int(m.group(3)), int(m.group(4)))
    if open_t is None or close_t is None:
        return None
    return open_t, close_t


def slot(open_t: str, close_t: str) -> dict[str, str]:
    return {"open": open_t, "close": close_t}


def apply_slots(by_day: dict[str, list], days: list[str], open_t: str, close_t: str) -> None:
    s = slot(open_t, close_t)
    for d in days:
        by_day[d] = [s]  # last rule wins for that day


def mark_closed(by_day: dict[str, list], days: list[str]) -> None:
    for d in days:
        by_day[d] = []


def day_num(token: str) -> int | None:
    token = token.strip()
    if token in ("週末", "周末"):
        return 7  # end-bound of「週一至週末」→ Sunday (whole week when start=1)
    if len(token) == 1 and token in DAY_CHAR:
        return DAY_CHAR[token]
    if token.startswith("週") and len(token) >= 2 and token[1] in DAY_CHAR:
        return DAY_CHAR[token[1]]
    return None


def expand_days(phrase: str) -> list[str] | None:
    text = phrase.strip()
    if not text:
        return None

    text = text.replace("星期", "週").replace("周", "週")
    text = re.sub(r"\s+", "", text)

    if text in ("平日", "週間"):
        return list(WEEKDAYS_ONLY)
    if text in ("週末", "周末", "假日", "例假日", "國定假日", "国定假日", "休假日"):
        return list(WEEKEND)
    if text in ("每日", "每天", "天天"):
        return list(ALL_DAYS)

    m = re.fullmatch(
        r"週?([一二三四五六日天])[至到\-–—~～](?:週)?([一二三四五六日天]|週末|周末)",
        text,
    )
    if m:
        start = DAY_CHAR[m.group(1)]
        end_tok = m.group(2)
        end = 7 if end_tok in ("週末", "周末") else DAY_CHAR[end_tok]
        if start <= end:
            return [str(i) for i in range(start, end + 1)]
        return [str(i) for i in range(start, 8)] + [str(i) for i in range(1, end + 1)]

    # 週六、週日 / 週一和週三
    parts = re.split(r"[、,，和與及]+", text)
    days: list[str] = []
    for part in parts:
        n = day_num(part)
        if n is None:
            # try strip leading 週
            chars = re.findall(r"[一二三四五六日天]", part)
            for ch in chars:
                days.append(str(DAY_CHAR[ch]))
            continue
        days.append(str(n))

    if days:
        seen: set[str] = set()
        out: list[str] = []
        for d in days:
            if d not in seen:
                seen.add(d)
                out.append(d)
        return out

    return None


def preprocess(raw: str) -> str:
    text = raw.strip()
    text = text.replace("星期", "週").replace("周", "週")
    # typo: 週一至週6:30 → 週一至週日 6:30
    text = re.sub(r"(週[一二三四五六日天][至到\-–—~～]週)(?=\d)", r"\1日 ", text)
    # typo 7:000 → 7:00
    text = re.sub(r"(\d{1,2})[:：](\d{3,})", lambda m: f"{m.group(1)}:{m.group(2)[:2]}", text)
    # drop parenthetical asides
    text = re.sub(r"[（(][^）)]*[）)]", " ", text)
    # treat slash lists after weekend as synonyms: 週末/例假日/寒暑假
    text = re.sub(r"(週末|假日|例假日)(?:\s*[/／]\s*(?:例假日|假日|寒暑假|國定假日))+", r"\1", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_hours(raw: str | None) -> dict[str, Any]:
    """Convert a free-text hours string into the unified 營業時間 object."""
    original = (raw or "").strip()
    result: dict[str, Any] = {
        "raw": original,
        "allDay": False,
        "unknown": False,
        "byDay": empty_by_day(),
    }

    if not original:
        result["unknown"] = True
        return result

    compact = original.replace(" ", "")
    if ALL_DAY_RE.search(original) or compact.upper() in ("24H", "24", "24小時"):
        result["allDay"] = True
        for d in WEEKDAYS:
            result["byDay"][d] = [slot("00:00", "24:00")]
        return result

    text = preprocess(original)
    by_day = empty_by_day()
    applied = False

    # Bare time before the first day phrase → default for all days
    # e.g. "7:30-19:00 例假日8:00-20:00"
    first_day = re.search(DAY_EXPR, text)
    leading = text[: first_day.start()] if first_day else text
    leading_tr = parse_time_range(leading)
    if leading_tr:
        apply_slots(by_day, ALL_DAYS, leading_tr[0], leading_tr[1])
        applied = True

    matches = list(SEGMENT_RE.finditer(text))
    for m in matches:
        days = expand_days(m.group("days"))
        body = m.group("body")
        if days is None:
            continue
        if CLOSED_RE.search(body):
            mark_closed(by_day, days)
            applied = True
            continue
        tr = parse_time_range(body)
        if tr:
            apply_slots(by_day, days, tr[0], tr[1])
            applied = True

    rest = SEGMENT_RE.sub(" ", text)
    if re.search(r"(週末|周末|假日|例假日|國定假日).{0,6}(公休|不營業)", rest):
        mark_closed(by_day, WEEKEND)
        applied = True

    if not applied:
        result["unknown"] = True
        return result

    result["byDay"] = by_day
    return result
