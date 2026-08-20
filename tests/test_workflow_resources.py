from __future__ import annotations

import unittest

from telos_kit.installers import RESOURCE_ROOT


class WorkflowResourceTests(unittest.TestCase):
    def test_spec_templates_include_contract_and_evaluation_fields(self) -> None:
        codex = (
            RESOURCE_ROOT / "codex" / "telos" / "skills" / "spec" / "assets" / "SPEC.template.md"
        ).read_text(encoding="utf-8")
        claude = (
            RESOURCE_ROOT / "claude-marketplace" / "plugins" / "telos" / "assets" / "SPEC.template.md"
        ).read_text(encoding="utf-8")

        for content in (codex, claude):
            self.assertIn("Spec baseline:", content)
            self.assertIn("Expected Change Surface", content)
            self.assertIn("Verification Plan", content)
            self.assertIn("Risk Profile", content)

    def test_codex_workflow_skills_preserve_scope_and_project_verification(self) -> None:
        root = RESOURCE_ROOT / "codex" / "telos" / "skills"
        spec = (root / "spec" / "SKILL.md").read_text(encoding="utf-8")
        impl = (root / "impl" / "SKILL.md").read_text(encoding="utf-8")
        evaluate = (root / "eval" / "SKILL.md").read_text(encoding="utf-8")

        self.assertIn("$spec quick", spec)
        self.assertIn("Spec baseline", spec)
        self.assertIn("Expected Change Surface", impl)
        self.assertIn("scope-drift", impl)
        self.assertIn("recorded verification-plan commands", evaluate)
        self.assertIn("lean pass", evaluate)


if __name__ == "__main__":
    unittest.main()
