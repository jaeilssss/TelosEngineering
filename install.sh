#!/usr/bin/env bash
set -euo pipefail

target="${1:-}"
case "$target" in codex|claude|claude-code|all) ;; *) echo "Usage: bash install.sh <codex|claude|all>" >&2; exit 2 ;; esac
[ "$target" = "claude-code" ] && target="claude"
command -v npm >/dev/null 2>&1 || { echo "telos: Node.js 20+ and npm are required." >&2; exit 1; }
npm install --ignore-scripts
npm run build
exec node dist/cli.js install "$target"
