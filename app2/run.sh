#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

case "${1:-}" in
  db)
    docker compose -f "$ROOT/docker-compose.yml" up -d
    ;;
  import)
    cd "$ROOT/backend"
    source .venv/bin/activate 2>/dev/null || true
    python scripts/import_csv.py --csv ../115-1-K.csv --limit "${2:-500}" --provider demo
    ;;
  api)
    cd "$ROOT/backend"
    source .venv/bin/activate 2>/dev/null || true
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    ;;
  ios)
    cd "$ROOT/mobile"
    EXPO_PUBLIC_FORCE_LAT=22.6273 EXPO_PUBLIC_FORCE_LNG=120.3014 npm run ios
    ;;
  *)
    echo "Usage: $0 {db|import [limit]|api|ios}"
    exit 1
    ;;
esac
