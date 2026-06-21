#!/usr/bin/env python3
from __future__ import annotations

import sys
import zipfile
from pathlib import Path

REQUIRED = {
    "telos_kit/kit_versions.json",
    "telos_kit/resources/codex/telos/.codex-plugin/plugin.json",
    "telos_kit/resources/codex/telos/hooks/hooks.json",
    "telos_kit/resources/claude-marketplace/.claude-plugin/marketplace.json",
    "telos_kit/resources/claude-marketplace/plugins/telos/.claude-plugin/plugin.json",
    "telos_kit/resources/claude-marketplace/plugins/telos/hooks/hooks.json",
    "telos_kit/resources/claude-marketplace/plugins/telos/skills/spec/SKILL.md",
}


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: check_wheel.py <wheel>", file=sys.stderr)
        return 2
    wheel = Path(sys.argv[1])
    with zipfile.ZipFile(wheel) as archive:
        names = set(archive.namelist())
    missing = sorted(REQUIRED - names)
    if missing:
        print("wheel is missing required resources:", file=sys.stderr)
        for name in missing:
            print(f"- {name}", file=sys.stderr)
        return 1
    bytecode = sorted(
        name for name in names if "__pycache__" in name or name.endswith((".pyc", ".pyo"))
    )
    if bytecode:
        print("wheel contains Python bytecode:", file=sys.stderr)
        for name in bytecode:
            print(f"- {name}", file=sys.stderr)
        return 1
    print(f"wheel resources valid: {wheel.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
