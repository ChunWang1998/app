#!/usr/bin/env bash
set -euo pipefail
# Reproducible subsetting for Naikai fonts (SIL OFL 1.1)
# Requirements: python3 -m pip install fonttools ; curl ; unzip
# This script does NOT commit downloaded originals; it writes subsets under assets/fonts/naikai/

DIR="$(cd "$(dirname "$0")"/.. && pwd)"
OUT="$DIR/assets/fonts/naikai"
TMP="$(mktemp -d)"
CHARLIST="$DIR/assets/fonts/subset-chars.txt"

NAIKAI_RELEASE="${NAIKAI_RELEASE:-https://github.com/max32002/naikaifont/releases/latest/download/NaikaiFont-OTF.zip}"

echo "Downloading Naikai release..."
curl -L "$NAIKAI_RELEASE" -o "$TMP/naikai.zip"
unzip -q "$TMP/naikai.zip" -d "$TMP/naikai"

REG=$(ls "$TMP/naikai"/*Regular*.otf 2>/dev/null | head -n1)
SEM=$(ls "$TMP/naikai"/*SemiBold*.otf 2>/dev/null | head -n1 || true)
BOLD=$(ls "$TMP/naikai"/*Bold*.otf 2>/dev/null | head -n1)
mkdir -p "$OUT"

echo "Subsetting Regular..."
pyftsubset "$REG" --text-file="$CHARLIST" --output-file="$OUT/NaikaiSubset-Regular.ttf" --flavor=ttf --layout-features='*' --glyph-names --no-hinting
if [[ -n "${SEM:-}" && -f "$SEM" ]]; then
  echo "Subsetting SemiBold..."
  pyftsubset "$SEM" --text-file="$CHARLIST" --output-file="$OUT/NaikaiSubset-SemiBold.ttf" --flavor=ttf --layout-features='*' --glyph-names --no-hinting
else
  echo "SemiBold not found in release; copying Regular as fallback"
  cp "$OUT/NaikaiSubset-Regular.ttf" "$OUT/NaikaiSubset-SemiBold.ttf"
fi
echo "Subsetting Bold..."
pyftsubset "$BOLD" --text-file="$CHARLIST" --output-file="$OUT/NaikaiSubset-Bold.ttf" --flavor=ttf --layout-features='*' --glyph-names --no-hinting

echo "Done. Subsets at $OUT"
