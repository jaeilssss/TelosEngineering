from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from telos_kit import __version__
from telos_kit.installers import install_claude, install_codex


class InstallerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.home = Path(self.temporary.name)

    @patch("telos_kit.installers.shutil.which", return_value=None)
    def test_codex_install_creates_plugin_and_preserves_marketplace(self, _which) -> None:
        marketplace = self.home / ".agents" / "plugins" / "marketplace.json"
        marketplace.parent.mkdir(parents=True)
        marketplace.write_text(
            json.dumps({
                "name": "personal",
                "interface": {"displayName": "Mine"},
                "plugins": [{"name": "other", "source": "./plugins/other"}],
            }),
            encoding="utf-8",
        )

        install_codex(self.home, "/opt/python")
        install_codex(self.home, "/opt/python")

        plugin = self.home / "plugins" / "telos"
        self.assertTrue((plugin / "skills" / "spec" / "SKILL.md").is_file())
        hook = json.loads((plugin / "hooks" / "hooks.json").read_text(encoding="utf-8"))
        handler = hook["hooks"]["PostToolUse"][0]["hooks"][0]
        self.assertIn("/opt/python", handler["command"])
        self.assertIn("PLUGIN_ROOT", handler["commandWindows"])

        catalog = json.loads(marketplace.read_text(encoding="utf-8"))
        self.assertEqual(catalog["interface"]["displayName"], "Mine")
        self.assertEqual([item["name"] for item in catalog["plugins"]], ["other", "telos"])
        version = json.loads((plugin / ".telos-version.json").read_text(encoding="utf-8"))
        self.assertEqual(version, {"package": __version__, "target": "codex", "version": "0.2.0"})

    @patch("telos_kit.installers.shutil.which", return_value=None)
    def test_claude_install_uses_plugin_hooks_without_user_hook(self, _which) -> None:
        messages = install_claude(self.home, "/opt/python")

        marketplace = self.home / ".telos" / "claude-marketplace"
        plugin = marketplace / "plugins" / "telos"
        self.assertTrue((plugin / ".claude-plugin" / "plugin.json").is_file())
        hooks = json.loads((plugin / "hooks" / "hooks.json").read_text(encoding="utf-8"))
        self.assertEqual(set(hooks["hooks"]), {"SessionStart", "PostToolUse"})
        for groups in hooks["hooks"].values():
            for group in groups:
                for handler in group["hooks"]:
                    self.assertEqual(handler["command"], "/opt/python")
        self.assertFalse((self.home / ".claude" / "settings.json").exists())
        self.assertTrue(any("Claude CLI not found" in message for message in messages))

    @patch("telos_kit.installers.shutil.which", return_value=None)
    def test_claude_migration_removes_only_legacy_content(self, _which) -> None:
        claude = self.home / ".claude"
        (claude / "skills" / "spec").mkdir(parents=True)
        (claude / "skills" / "spec" / "SKILL.md").write_text("legacy", encoding="utf-8")
        (claude / "scripts").mkdir()
        legacy_script = claude / "scripts" / "spec_gate.py"
        legacy_script.write_text("legacy", encoding="utf-8")
        (claude / ".telos-manifest").write_text(
            f"{legacy_script}\n{claude / 'skills' / 'spec' / 'SKILL.md'}\n",
            encoding="utf-8",
        )
        (claude / "CLAUDE.md").write_text(
            "user rule\n<!-- ▼ telos-begin -->\nlegacy telos\n<!-- ▲ telos-end -->\n",
            encoding="utf-8",
        )
        settings = {
            "theme": "dark",
            "hooks": {
                "PostToolUse": [{
                    "matcher": "Write|Edit",
                    "hooks": [
                        {
                            "type": "command",
                            "command": 'python3 "$HOME/.claude/scripts/spec_gate.py"',
                        },
                        {"type": "command", "command": "my-linter"},
                    ],
                }],
            },
        }
        (claude / "settings.json").write_text(json.dumps(settings), encoding="utf-8")

        install_claude(self.home, "/opt/python")

        self.assertEqual((claude / "CLAUDE.md").read_text(encoding="utf-8"), "user rule\n")
        updated = json.loads((claude / "settings.json").read_text(encoding="utf-8"))
        self.assertEqual(updated["theme"], "dark")
        self.assertEqual(updated["hooks"]["PostToolUse"][0]["hooks"], [
            {"type": "command", "command": "my-linter"}
        ])
        self.assertFalse(legacy_script.exists())
        self.assertFalse((claude / ".telos-manifest").exists())

    @patch("telos_kit.installers._run")
    @patch("telos_kit.installers.shutil.which", return_value="/usr/bin/claude")
    def test_claude_install_registers_user_plugin(self, _which, run) -> None:
        run.return_value = subprocess.CompletedProcess([], 0, "", "")

        install_claude(self.home, "/opt/python")

        commands = [call.args[0] for call in run.call_args_list]
        marketplace = self.home / ".telos" / "claude-marketplace"
        self.assertEqual(commands[0], [
            "/usr/bin/claude",
            "plugin",
            "marketplace",
            "add",
            str(marketplace),
            "--scope",
            "user",
        ])
        self.assertEqual(commands[1], [
            "/usr/bin/claude",
            "plugin",
            "install",
            "telos@telos-kit",
            "--scope",
            "user",
        ])


if __name__ == "__main__":
    unittest.main()
