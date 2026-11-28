#!/bin/sh
set -e
ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
REQUIRED_MAJOR="$(sed -n '1s/^[^0-9]*\([0-9]*\).*/\1/p' "$ROOT/.node-version" 2>/dev/null || true)"
REQUIRED_MAJOR="${REQUIRED_MAJOR:-24}"

if [ -n "$NODE" ] && [ -x "$NODE" ]; then
  CANDIDATES="$NODE"
else
  CANDIDATES=""
fi
CANDIDATES="$CANDIDATES $(command -v node 2>/dev/null || true)"
CANDIDATES="$CANDIDATES /opt/homebrew/bin/node /usr/local/bin/node"
for candidate in "$HOME"/.nvm/versions/node/*/bin/node "$HOME"/.volta/bin/node "$HOME"/.fnm/node-versions/*/installation/bin/node; do
  [ -e "$candidate" ] && CANDIDATES="$CANDIDATES $candidate"
done

BEST=""
BEST_VERSION=""
for candidate in $CANDIDATES; do
  [ -x "$candidate" ] || continue
  version="$("$candidate" -p 'process.versions.node' 2>/dev/null || true)"
  [ -n "$version" ] || continue
  major="${version%%.*}"
  [ "$major" -ge "$REQUIRED_MAJOR" ] 2>/dev/null || continue
  if [ -z "$BEST_VERSION" ] || [ "$(printf '%s\n%s\n' "$version" "$BEST_VERSION" | sort -V | tail -1)" = "$version" ]; then
    BEST="$candidate"
    BEST_VERSION="$version"
  fi
done

if [ -z "$BEST" ]; then
  echo "error: Xcode 构建需要 Node.js ${REQUIRED_MAJOR}+（见 .node-version），当前 PATH 与常见安装位置都没有可用版本。" >&2
  echo "已检查：$CANDIDATES" >&2
  exit 1
fi
echo "Xcode Web 预构建：使用 Node.js v${BEST_VERSION}（${BEST}）"
exec "$BEST" "$ROOT/scripts/xcode-web-build.mjs"
