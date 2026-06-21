#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

usage() {
  cat <<'EOF'
Usage:
  bash install.sh claude   # install Claude Code plugin
  bash install.sh codex    # install Codex plugin
  bash install.sh all      # install both
EOF
}

target="${1:-}"

case "$target" in
  claude|claude-code|codex|all)
    [ "$target" = "claude-code" ] && target="claude"
    ;;
  *)
    usage
    exit 2
    ;;
esac

if command -v python3 >/dev/null 2>&1; then
  PYTHON="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON="python"
else
  echo "telos: Python 3.10 or newer is required." >&2
  exit 1
fi

if "$PYTHON" -c 'import wheel' >/dev/null 2>&1; then
  "$PYTHON" -m pip install --upgrade --no-build-isolation "$ROOT"
  exec "$PYTHON" -m telos_kit install "$target"
fi

echo "telos: wheel is unavailable; running the bundled installer without installing the CLI." >&2
export PYTHONPATH="$ROOT/src${PYTHONPATH:+:$PYTHONPATH}"
exec "$PYTHON" -m telos_kit install "$target"
