#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from telos_kit import __version__  # noqa: E402
from telos_kit.installers import RESOURCE_ROOT, _versions  # noqa: E402


def main() -> int:
    expected_tag = f"v{__version__}"
    if len(sys.argv) > 1 and sys.argv[1] != expected_tag:
        print(f"release tag {sys.argv[1]!r} must equal {expected_tag!r}", file=sys.stderr)
        return 1

    versions = _versions()
    manifests = {
        "codex": RESOURCE_ROOT / "codex" / "telos" / ".codex-plugin" / "plugin.json",
        "claude": (
            RESOURCE_ROOT
            / "claude-marketplace"
            / "plugins"
            / "telos"
            / ".claude-plugin"
            / "plugin.json"
        ),
    }
    for target, path in manifests.items():
        manifest = json.loads(path.read_text(encoding="utf-8"))
        if manifest.get("version") != versions[target]:
            print(f"{target} manifest version does not match kit_versions.json", file=sys.stderr)
            return 1

    print(
        f"versions valid: package={versions['package']} "
        f"codex={versions['codex']} claude={versions['claude']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
