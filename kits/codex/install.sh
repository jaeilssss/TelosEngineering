#!/usr/bin/env bash
set -euo pipefail

PLUGIN_NAME="spec-first-kit"
SRC="$(cd "$(dirname "$0")/plugins/$PLUGIN_NAME" && pwd)"
DEST="$HOME/plugins/$PLUGIN_NAME"
MARKETPLACE="$HOME/.agents/plugins/marketplace.json"

mkdir -p "$HOME/plugins" "$(dirname "$MARKETPLACE")"
rm -rf "$DEST"
cp -R "$SRC" "$DEST"

python3 - "$MARKETPLACE" "$PLUGIN_NAME" <<'PY'
import json
import sys
from pathlib import Path

marketplace = Path(sys.argv[1])
plugin_name = sys.argv[2]

if marketplace.exists():
    data = json.loads(marketplace.read_text(encoding="utf-8"))
else:
    data = {
        "name": "personal",
        "interface": {"displayName": "Personal"},
        "plugins": [],
    }

data.setdefault("name", "personal")
data.setdefault("interface", {"displayName": "Personal"})
data.setdefault("plugins", [])

entry = {
    "name": plugin_name,
    "source": {
        "source": "local",
        "path": f"./plugins/{plugin_name}",
    },
    "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL",
    },
    "category": "Productivity",
}

plugins = [p for p in data["plugins"] if p.get("name") != plugin_name]
plugins.append(entry)
data["plugins"] = plugins

marketplace.write_text(
    json.dumps(data, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
PY

marketplace_name="$(python3 - "$MARKETPLACE" <<'PY'
import json
import sys
from pathlib import Path

print(json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))["name"])
PY
)"

echo "• Codex plugin copied: $DEST"
echo "• Marketplace updated: $MARKETPLACE"

if command -v codex >/dev/null 2>&1; then
  if codex plugin add "$PLUGIN_NAME@$marketplace_name"; then
    echo "• Codex plugin installed: $PLUGIN_NAME@$marketplace_name"
  else
    echo "⚠ codex plugin add failed. Run manually:"
    echo "  codex plugin add $PLUGIN_NAME@$marketplace_name"
  fi
else
  echo "⚠ codex command not found. After installing Codex, run:"
  echo "  codex plugin add $PLUGIN_NAME@$marketplace_name"
fi

echo ""
echo "✅ Codex 설치 완료. 새 Codex 스레드를 열어 플러그인 스킬을 로드하세요."
