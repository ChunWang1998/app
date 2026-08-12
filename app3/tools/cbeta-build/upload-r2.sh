#!/bin/bash
set -e

# Usage: BUCKET_NAME=your-bucket-name ./upload-r2.sh
# Requires: wrangler (npm i -g wrangler) + `wrangler login`

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/../../corpus-dist/full"
BUCKET="${BUCKET_NAME:?Set BUCKET_NAME env var to your R2 bucket name}"

if [ ! -f "$DIST_DIR/manifest.json" ]; then
  echo "Error: $DIST_DIR/manifest.json not found. Run build:full first."
  exit 1
fi

echo "=== Uploading corpus to R2 bucket: $BUCKET ==="

wrangler r2 object put "$BUCKET/manifest.json" --file="$DIST_DIR/manifest.json" --content-type="application/json"
wrangler r2 object put "$BUCKET/catalog.json" --file="$DIST_DIR/catalog.json" --content-type="application/json"

COUNT=0
TOTAL=$(ls -1 "$DIST_DIR/units/"*.json 2>/dev/null | wc -l | tr -d ' ')

for f in "$DIST_DIR/units/"*.json; do
  base=$(basename "$f")
  COUNT=$((COUNT + 1))
  if [ $((COUNT % 100)) -eq 0 ] || [ "$COUNT" -eq "$TOTAL" ]; then
    echo "  uploading units/$base ($COUNT/$TOTAL)"
  fi
  wrangler r2 object put "$BUCKET/units/$base" --file="$f" --content-type="application/json"
done

echo "=== Done: uploaded $COUNT unit files + manifest + catalog ==="
