from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from telos_kit.update_status import get_update_notice


class UpdateStatusTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.project = self.root / "project"
        self.home = self.root / "home"
        (self.project / "src" / "telos_kit").mkdir(parents=True)
        self.home.mkdir()

    def write_versions(self, codex: str = "0.2.0", claude: str = "0.2.0") -> None:
        (self.project / "src" / "telos_kit" / "kit_versions.json").write_text(
            json.dumps({"package": "0.1.0", "codex": codex, "claude": claude}),
            encoding="utf-8",
        )

    def write_installed(self, target: str, version: str) -> None:
        if target == "codex":
            path = self.home / "plugins" / "telos" / ".telos-version.json"
        else:
            path = self.home / ".telos" / "claude-marketplace" / "plugins" / "telos" / ".telos-version.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps({"package": "0.1.0", "target": target, "version": version}),
            encoding="utf-8",
        )

    def test_returns_none_outside_telos_repo(self) -> None:
        self.assertIsNone(get_update_notice("codex", project_root=self.project, home=self.home))

    def test_returns_none_when_plugin_is_current(self) -> None:
        self.write_versions()
        self.write_installed("codex", "0.2.0")

        self.assertIsNone(get_update_notice("codex", project_root=self.project, home=self.home))

    def test_warns_when_codex_plugin_is_outdated(self) -> None:
        self.write_versions(codex="0.3.0")
        self.write_installed("codex", "0.2.0")

        message = get_update_notice("codex", project_root=self.project, home=self.home)

        self.assertEqual(
            message,
            "Update recommended: installed Telos codex plugin 0.2.0 is older than "
            "this repository's 0.3.0. Run `python3 -m pip install --upgrade telos-kit` "
            "and `telos install codex`.",
        )

    def test_warns_when_claude_plugin_is_outdated(self) -> None:
        self.write_versions(claude="0.3.0")
        self.write_installed("claude", "0.2.0")

        message = get_update_notice("claude", project_root=self.project, home=self.home)

        self.assertEqual(
            message,
            "Update recommended: installed Telos claude plugin 0.2.0 is older than "
            "this repository's 0.3.0. Run `python3 -m pip install --upgrade telos-kit` "
            "and `telos install all`.",
        )


if __name__ == "__main__":
    unittest.main()
