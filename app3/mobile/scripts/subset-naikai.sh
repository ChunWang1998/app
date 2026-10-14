#!/usr/bin/env bash
set -euo pipefail
# Reproducible subsetting for Naikai fonts (SIL OFL 1.1)
# Requirements: python3 -m pip install fonttools ; curl
# Source: https://github.com/max32002/naikaifont (tw/ TTF files on master)
# This script does NOT commit downloaded originals; it writes subsets under assets/fonts/naikai/

DIR="$(cd "$(dirname "$0")"/.. && pwd)"
OUT="$DIR/assets/fonts/naikai"
TMP="$(mktemp -d)"
CHARLIST="$DIR/assets/fonts/subset-chars.txt"
trap 'rm -rf "$TMP"' EXIT

# Release zip has no attached assets; pull the TTF files from the git tree.
BASE="${NAIKAI_TTF_BASE:-https://raw.githubusercontent.com/max32002/naikaifont/master/tw}"

mkdir -p "$OUT" "$TMP"
echo "Downloading Naikai TTFs from ${BASE}..."
UA="Mozilla/5.0 (compatible; been-ages-subset/1.0)"
curl -fsSL -A "$UA" "${BASE}/NaikaiFont-Regular.ttf" -o "$TMP/Regular.ttf"
curl -fsSL -A "$UA" "${BASE}/NaikaiFont-SemiBold.ttf" -o "$TMP/SemiBold.ttf"
curl -fsSL -A "$UA" "${BASE}/NaikaiFont-Bold.ttf" -o "$TMP/Bold.ttf"

# pyftsubset is on PATH after `python3 -m pip install --user fonttools`
PYFT="${PYFTSUBSET:-pyftsubset}"
if ! command -v "$PYFT" >/dev/null 2>&1; then
  PYFT="python3 -m fontTools.subset"
fi

subset() {
  local src="$1"
  local dest="$2"
  $PYFT "$src" \
    --text-file="$CHARLIST" \
    --output-file="$dest" \
    --layout-features='*' \
    --glyph-names \
    --no-hinting \
    --name-IDs='*' \
    --recommended-glyphs
}

echo "Subsetting Regular..."
subset "$TMP/Regular.ttf" "$OUT/NaikaiSubset-Regular.ttf"
echo "Subsetting SemiBold..."
subset "$TMP/SemiBold.ttf" "$OUT/NaikaiSubset-SemiBold.ttf"
echo "Subsetting Bold..."
subset "$TMP/Bold.ttf" "$OUT/NaikaiSubset-Bold.ttf"

python3 "$DIR/scripts/rename-font-family.py"

ls -l "$OUT"/NaikaiSubset-*.ttf
echo "Done. Subsets at $OUT"
