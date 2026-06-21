from __future__ import annotations

import json
import unittest

from telos_kit import __version__
from telos_kit.installers import RESOURCE_ROOT, _versions


class VersionTests(unittest.TestCase):
    def test_all_version_sources_match(self) -> None:
        versions = _versions()
        self.assertEqual(versions["package"], __version__)

        codex = json.loads(
            (RESOURCE_ROOT / "codex" / "telos" / ".codex-plugin" / "plugin.json").read_text(encoding="utf-8")
        )
        claude = json.loads(
            (
                RESOURCE_ROOT
                / "claude-marketplace"
                / "plugins"
                / "telos"
                / ".claude-plugin"
                / "plugin.json"
            ).read_text(encoding="utf-8")
        )
        self.assertEqual(codex["version"], versions["codex"])
        self.assertEqual(claude["version"], versions["claude"])


if __name__ == "__main__":
    unittest.main()
