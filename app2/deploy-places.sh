#!/usr/bin/env bash
set -euo pipefail

# Deploy data/dist/ to GitHub Pages (gh-pages branch) under /places/
# After running, cells and cities are available at:
#   https://chunwang1998.github.io/app/places/cells/{i}_{j}.json
#   https://chunwang1998.github.io/app/places/cities/{縣市}.json

DIST_DIR="$(cd "$(dirname "$0")/data/dist" && pwd)"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -d "$DIST_DIR/cells" ]; then
  echo "Error: $DIST_DIR/cells not found. Run 'python3 fetchData/buildDataSet.py' first."
  exit 1
fi

cd "$REPO_ROOT"

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

# Try checking out gh-pages; if it doesn't exist, create an orphan branch manually
if git rev-parse --verify gh-pages >/dev/null 2>&1; then
  git worktree add "$TEMP_DIR" gh-pages
else
  git worktree add --detach "$TEMP_DIR"
  cd "$TEMP_DIR"
  git checkout --orphan gh-pages
  git rm -rf . >/dev/null 2>&1 || true
  cd "$REPO_ROOT"
fi

rm -rf "$TEMP_DIR/places"
mkdir -p "$TEMP_DIR/places"
cp -r "$DIST_DIR/cells" "$TEMP_DIR/places/cells"
if [ -d "$DIST_DIR/cities" ]; then
  cp -r "$DIST_DIR/cities" "$TEMP_DIR/places/cities"
fi
cp "$DIST_DIR/manifest.json" "$TEMP_DIR/places/manifest.json" 2>/dev/null || true
cp "$DIST_DIR/index.slim.json" "$TEMP_DIR/places/index.slim.json" 2>/dev/null || true

cd "$TEMP_DIR"
git add -A
git commit -m "update places data $(date +%Y-%m-%d)" --allow-empty
git push origin gh-pages

cd "$REPO_ROOT"
git worktree remove "$TEMP_DIR" --force 2>/dev/null || true

echo "Done! Places CDN: https://chunwang1998.github.io/app/places"
