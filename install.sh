#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

usage() {
  cat <<'EOF'
Usage:
  bash install.sh claude   # install Claude Code global kit
  bash install.sh codex    # install Codex plugin kit
  bash install.sh all      # install both
EOF
}

target="${1:-}"

case "$target" in
  claude|claude-code)
    bash "$ROOT/kits/claude-code/install.sh"
    ;;
  codex)
    bash "$ROOT/kits/codex/install.sh"
    ;;
  all)
    bash "$ROOT/kits/claude-code/install.sh"
    bash "$ROOT/kits/codex/install.sh"
    ;;
  *)
    usage
    exit 2
    ;;
esac
