#!/usr/bin/env python3
"""
Typefully scheduler for tinytoolshedhq/app
Reads drafts from shared/drafts/ready/ and schedules them via Typefully API.
Moves successful drafts to shared/drafts/processed/

Environment:
  TYPEFULLY_API_KEY (required)
  TYPEFULLY_SOCIAL_SET_ID (optional, otherwise uses first available)
"""

import os
import json
import shutil
import requests
from pathlib import Path
from datetime import datetime

API_BASE = "https://api.typefully.com/v2"
API_KEY = os.environ.get("TYPEFULLY_API_KEY")
SOCIAL_SET_ID = os.environ.get("TYPEFULLY_SOCIAL_SET_ID")

DRAFTS_READY = Path("shared/drafts/ready")
DRAFTS_PROCESSED = Path("shared/drafts/processed")

def get_headers():
    if not API_KEY:
        raise SystemExit("ERROR: TYPEFULLY_API_KEY is not set")
    return {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }

def get_social_set_id():
    if SOCIAL_SET_ID:
        return SOCIAL_SET_ID
    resp = requests.get(f"{API_BASE}/social-sets", headers=get_headers(), timeout=30)
    resp.raise_for_status()
    data = resp.json()
    sets = data.get("data") or data.get("social_sets") or []
    if not sets:
        raise SystemExit("No social sets found. Connect accounts in Typefully first.")
    # Prefer the first one
    return str(sets[0].get("id") or sets[0].get("social_set_id"))

def parse_markdown(content: str) -> dict:
    """Turn markdown into a Typefully payload. Split on --- for threads."""
    parts = [p.strip() for p in content.split("\n---\n") if p.strip()]
    if not parts:
        return None
    posts = [{"text": p} for p in parts]
    return {
        "platforms": {
            "x": {"posts": posts},
            # Uncomment or extend for LinkedIn if needed
            # "linkedin": {"post_text": parts[0]}
        },
        "publish_at": "next-free-slot",
    }

def process_file(path: Path, social_set_id: str):
    print(f"Processing {path.name}...")
    content = path.read_text(encoding="utf-8")

    if path.suffix == ".json":
        payload = json.loads(content)
        # Ensure publish_at if not present
        payload.setdefault("publish_at", "next-free-slot")
    elif path.suffix == ".md":
        payload = parse_markdown(content)
        if not payload:
            print(f"  Skipping empty file: {path.name}")
            return False
    else:
        print(f"  Unsupported extension: {path.name}")
        return False

    url = f"{API_BASE}/social-sets/{social_set_id}/drafts"
    resp = requests.post(url, headers=get_headers(), json=payload, timeout=60)

    if resp.status_code in (200, 201):
        print(f"  Scheduled successfully: {path.name}")
        # Move to processed
        date_dir = DRAFTS_PROCESSED / datetime.utcnow().strftime("%Y-%m-%d")
        date_dir.mkdir(parents=True, exist_ok=True)
        dest = date_dir / path.name
        shutil.move(str(path), str(dest))
        return True
    else:
        print(f"  Failed ({resp.status_code}): {resp.text[:500]}")
        return False

def main():
    DRAFTS_READY.mkdir(parents=True, exist_ok=True)
    DRAFTS_PROCESSED.mkdir(parents=True, exist_ok=True)

    social_set_id = get_social_set_id()
    print(f"Using social set ID: {social_set_id}")

    files = list(DRAFTS_READY.glob("*.md")) + list(DRAFTS_READY.glob("*.json"))
    if not files:
        print("No drafts found in shared/drafts/ready/")
        return

    success = 0
    for f in sorted(files):
        if process_file(f, social_set_id):
            success += 1

    print(f"Done. Scheduled {success}/{len(files)} drafts.")

if __name__ == "__main__":
    main()
