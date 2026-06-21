#!/usr/bin/env python3
"""Inject Telos spec-first rules when the Claude plugin starts."""

import os
from pathlib import Path


def main() -> int:
    plugin_root = Path(os.environ.get("CLAUDE_PLUGIN_ROOT", Path(__file__).parents[1]))
    rules = plugin_root / "rules" / "spec-first.md"
    print(rules.read_text(encoding="utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
