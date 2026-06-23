from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from telos_kit.update_status import get_update_notice, get_update_status


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
        self.assertEqual(
            get_update_status("codex", project_root=self.project, home=self.home),
            {
                "target": "codex",
                "status": "unknown",
                "installed_version": None,
                "latest_version": None,
                "update_available": False,
            },
        )

    def test_returns_none_when_plugin_is_current(self) -> None:
        self.write_versions()
        self.write_installed("codex", "0.2.0")

        self.assertIsNone(get_update_notice("codex", project_root=self.project, home=self.home))
        self.assertEqual(
            get_update_status("codex", project_root=self.project, home=self.home),
            {
                "target": "codex",
                "status": "up-to-date",
                "installed_version": "0.2.0",
                "latest_version": "0.2.0",
                "update_available": False,
            },
        )

    def test_returns_not_installed_status(self) -> None:
        self.write_versions()

        self.assertEqual(
            get_update_status("claude", project_root=self.project, home=self.home),
            {
                "target": "claude",
                "status": "not-installed",
                "installed_version": None,
                "latest_version": "0.2.0",
                "update_available": False,
            },
        )

    def test_warns_when_codex_plugin_is_outdated(self) -> None:
        self.write_versions(codex="0.3.0")
        self.write_installed("codex", "0.2.0")

        message = get_update_notice("codex", project_root=self.project, home=self.home)

        self.assertEqual(
            message,
            "업데이트 권장: 설치된 Telos codex 플러그인 버전 0.2.0은(는) "
            "현재 저장소 기준 버전 0.3.0보다 낮습니다. 먼저 `telos update codex`로 "
            "현재 telos-kit 패키지의 플러그인을 다시 적용하세요. 패키지까지 최신 배포본으로 "
            "올리려면 `python3 -m pip install --upgrade telos-kit`를 먼저 실행하세요.",
        )
        self.assertEqual(
            get_update_status("codex", project_root=self.project, home=self.home),
            {
                "target": "codex",
                "status": "update-available",
                "installed_version": "0.2.0",
                "latest_version": "0.3.0",
                "update_available": True,
            },
        )

    def test_warns_when_claude_plugin_is_outdated(self) -> None:
        self.write_versions(claude="0.3.0")
        self.write_installed("claude", "0.2.0")

        message = get_update_notice("claude", project_root=self.project, home=self.home)

        self.assertEqual(
            message,
            "업데이트 권장: 설치된 Telos claude 플러그인 버전 0.2.0은(는) "
            "현재 저장소 기준 버전 0.3.0보다 낮습니다. 먼저 `telos update claude`로 "
            "현재 telos-kit 패키지의 플러그인을 다시 적용하세요. 패키지까지 최신 배포본으로 "
            "올리려면 `python3 -m pip install --upgrade telos-kit`를 먼저 실행하세요.",
        )


if __name__ == "__main__":
    unittest.main()
