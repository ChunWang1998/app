#!/usr/bin/env bash
set -euo pipefail

# Deploy app1/app2/app3/app4 store HTML (support + privacy) to GitHub Pages (gh-pages).
#
# How to run (from the repo root, after this PR is merged):
#   git checkout main && git pull origin main
#   ./deploy-store-pages.sh
#
# Do not run from a feature branch unless you intend to publish that branch's
# store HTML. The script copies from the *current working tree* onto gh-pages
# and pushes. It does not commit store files on main.
#
# After running:
#   https://tinytoolshedhq.github.io/app/app4/store/support.html
#   https://tinytoolshedhq.github.io/app/app4/store/privacy.html
# (same pattern for app1 / app2 / app3)
#
# History: gh-pages `app4/store/` previously held CraftQ / 業問 pages (deployed
# 2026-09-17) because this repo's app4 slot was used for that product before
# Decibel Meter existed. Later deploys skipped app4 when main had no
# `app4/store/*.html`, so CraftQ stayed live. This script now requires those
# files and overwrites dest files; the index labels match the current apps.

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT"

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

if git rev-parse --verify gh-pages >/dev/null 2>&1; then
  git worktree add "$TEMP_DIR" gh-pages
else
  git fetch origin gh-pages
  git worktree add "$TEMP_DIR" origin/gh-pages
fi

missing=0
for app in app1 app2 app3 app4; do
  src="$REPO_ROOT/$app/store"
  dest="$TEMP_DIR/$app/store"
  mkdir -p "$dest"
  for f in support.html privacy.html; do
    if [ -f "$src/$f" ]; then
      cp "$src/$f" "$dest/$f"
      echo "copied $app/store/$f"
    else
      echo "missing $src/$f" >&2
      missing=1
    fi
  done
done
if [ "$missing" -ne 0 ]; then
  echo "Refusing to deploy with missing store pages (would leave stale gh-pages files)." >&2
  exit 1
fi

# Tiny root index so /app/ is not an empty listing error
cat > "$TEMP_DIR/index.html" <<'EOF'
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>App store pages</title>
</head>
<body>
  <p>Store pages:</p>
  <ul>
    <li><a href="./app4/store/support.html">分貝計 support</a> · <a href="./app4/store/privacy.html">privacy</a></li>
    <li><a href="./app3/store/support.html">Been Ages support</a> · <a href="./app3/store/privacy.html">privacy</a></li>
    <li><a href="./app2/store/support.html">急廁 Go support</a> · <a href="./app2/store/privacy.html">privacy</a></li>
    <li><a href="./app1/store/support.html">諧音猜猜 support</a> · <a href="./app1/store/privacy.html">privacy</a></li>
  </ul>
</body>
</html>
EOF

cd "$TEMP_DIR"
git add app1/store app2/store app3/store app4/store index.html
if git diff --cached --quiet; then
  echo "No changes to commit."
else
  git commit -m "deploy store support/privacy pages $(date +%Y-%m-%d)"
  git push origin HEAD:gh-pages
fi

cd "$REPO_ROOT"
git worktree remove "$TEMP_DIR" --force 2>/dev/null || true

echo "Done. Verify:"
echo "  https://tinytoolshedhq.github.io/app/app4/store/support.html"
echo "  https://tinytoolshedhq.github.io/app/app4/store/privacy.html"
