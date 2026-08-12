#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INPUT_DIR="$SCRIPT_DIR/input"
TXT_DIR="$INPUT_DIR/txt"
ZIP_FILE="$INPUT_DIR/cbeta-text.zip"
EXTRACT_DIR="$INPUT_DIR/cbeta-text-extracted"

mkdir -p "$TXT_DIR" "$EXTRACT_DIR"

echo "=== Downloading CBETA plain text (no notes)… ==="
curl -L -o "$ZIP_FILE" "https://cbdata.dila.edu.tw/stable/download/cbeta-text.zip"

echo "=== Extracting… ==="
unzip -o "$ZIP_FILE" -d "$EXTRACT_DIR"

echo "=== Moving .txt files to input/txt/ ==="
find "$EXTRACT_DIR" -name '*.txt' -type f | while read -r f; do
  base=$(basename "$f")
  # Skip TOC files (T0001-toc.txt etc.)
  if echo "$base" | grep -q '\-toc\.txt$'; then
    continue
  fi
  # Only keep files that look like work-level (e.g. T0001.txt, not T0001_001.txt per-juan)
  # The bulk zip has one txt per work already
  cp "$f" "$TXT_DIR/$base"
done

COUNT=$(ls -1 "$TXT_DIR"/*.txt 2>/dev/null | wc -l | tr -d ' ')
echo "=== Done: $COUNT .txt files in $TXT_DIR ==="
