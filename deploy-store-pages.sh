#!/usr/bin/env bash
set -euo pipefail

# Deploy app1/app2/app3 store HTML (support + privacy) to GitHub Pages (gh-pages).
# After running:
#   https://chunwang1998.github.io/app/app3/store/support.html
#   https://chunwang1998.github.io/app/app3/store/privacy.html
# (same pattern for app1 / app2)

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

for app in app1 app2 app3; do
  src="$REPO_ROOT/$app/store"
  dest="$TEMP_DIR/$app/store"
  mkdir -p "$dest"
  for f in support.html privacy.html; do
    if [ -f "$src/$f" ]; then
      cp "$src/$f" "$dest/$f"
      echo "copied $app/store/$f"
    else
      echo "skip missing $app/store/$f" >&2
    fi
  done
done

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
    <li><a href="./app3/store/support.html">鄰汪 support</a> · <a href="./app3/store/privacy.html">privacy</a></li>
    <li><a href="./app2/store/support.html">app2 support</a> · <a href="./app2/store/privacy.html">privacy</a></li>
    <li><a href="./app1/store/support.html">app1 support</a> · <a href="./app1/store/privacy.html">privacy</a></li>
  </ul>
</body>
</html>
EOF

cd "$TEMP_DIR"
git add -A
if git diff --cached --quiet; then
  echo "No changes to commit."
else
  git commit -m "deploy store support/privacy pages $(date +%Y-%m-%d)"
  git push origin HEAD:gh-pages
fi

cd "$REPO_ROOT"
git worktree remove "$TEMP_DIR" --force 2>/dev/null || true

echo "Done. Verify:"
echo "  https://chunwang1998.github.io/app/app3/store/support.html"
echo "  https://chunwang1998.github.io/app/app3/store/privacy.html"
