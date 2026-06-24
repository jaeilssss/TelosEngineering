from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from telos_kit.installers import RESOURCE_ROOT


class GateTests(unittest.TestCase):
    def run_gate(self, script: Path, cwd: Path, command: str, direct_path: str | None = None) -> str:
        tool_input = {"command": command}
        if direct_path:
            tool_input["file_path"] = direct_path
        payload = {"cwd": str(cwd), "tool_input": tool_input}
        result = subprocess.run(
            [sys.executable, str(script)],
            input=json.dumps(payload),
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout.strip()

    def test_codex_gate_warns_for_code_only_until_frozen(self) -> None:
        script = RESOURCE_ROOT / "codex" / "telos" / "scripts" / "spec_gate.py"
        with tempfile.TemporaryDirectory() as temporary:
            cwd = Path(temporary)
            code_patch = "*** Begin Patch\n*** Add File: app.py\n*** End Patch"
            docs_patch = "*** Begin Patch\n*** Add File: README.md\n*** End Patch"
            self.assertIn("systemMessage", self.run_gate(script, cwd, code_patch))
            self.assertEqual(self.run_gate(script, cwd, docs_patch), "")
            (cwd / "SPEC.md").write_text("Status: draft\n", encoding="utf-8")
            self.assertIn("not frozen", self.run_gate(script, cwd, code_patch))
            (cwd / "SPEC.md").write_text("Status: frozen\n", encoding="utf-8")
            self.assertIn("Test strategy", self.run_gate(script, cwd, code_patch))
            (cwd / "SPEC.md").write_text("Status: frozen\nTest strategy: TDD\n", encoding="utf-8")
            self.assertEqual(self.run_gate(script, cwd, code_patch), "")

    def test_claude_gate_returns_structured_warning(self) -> None:
        script = RESOURCE_ROOT / "claude-marketplace" / "plugins" / "telos" / "scripts" / "spec_gate.py"
        with tempfile.TemporaryDirectory() as temporary:
            output = self.run_gate(script, Path(temporary), "", "feature.ts")
            warning = json.loads(output)
            self.assertIn("/telos:spec", warning["systemMessage"])


if __name__ == "__main__":
    unittest.main()
