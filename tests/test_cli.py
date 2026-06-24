from __future__ import annotations

import io
import json
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

from telos_kit import cli


class CliTests(unittest.TestCase):
    @patch("telos_kit.cli.install", return_value=["done"])
    def test_update_reuses_install_flow(self, install) -> None:
        output = io.StringIO()

        with redirect_stdout(output):
            exit_code = cli.main(["update", "all"])

        self.assertEqual(exit_code, 0)
        install.assert_called_once_with("all")
        self.assertEqual(output.getvalue(), "done\n")

    @patch("telos_kit.cli.get_update_notice")
    def test_update_status_all_prints_each_available_notice(self, get_update_notice) -> None:
        get_update_notice.side_effect = ["codex notice", None]
        output = io.StringIO()

        with redirect_stdout(output):
            exit_code = cli.main(["update-status", "all", "--project-root", "."])

        self.assertEqual(exit_code, 0)
        self.assertEqual(output.getvalue(), "codex notice\n")
        self.assertEqual(get_update_notice.call_count, 2)

    @patch("telos_kit.cli.get_update_status")
    def test_update_status_json_prints_structured_output(self, get_update_status) -> None:
        get_update_status.side_effect = [
            {
                "target": "codex",
                "status": "update-available",
                "installed_version": "0.2.0",
                "latest_version": "0.4.0",
                "update_available": True,
            },
            {
                "target": "claude",
                "status": "up-to-date",
                "installed_version": "0.4.0",
                "latest_version": "0.4.0",
                "update_available": False,
            },
        ]
        output = io.StringIO()

        with redirect_stdout(output):
            exit_code = cli.main(["update-status", "all", "--project-root", ".", "--json"])

        self.assertEqual(exit_code, 0)
        self.assertEqual(
            json.loads(output.getvalue()),
            [
                {
                    "target": "codex",
                    "status": "update-available",
                    "installed_version": "0.2.0",
                    "latest_version": "0.4.0",
                    "update_available": True,
                },
                {
                    "target": "claude",
                    "status": "up-to-date",
                    "installed_version": "0.4.0",
                    "latest_version": "0.4.0",
                    "update_available": False,
                },
            ],
        )


if __name__ == "__main__":
    unittest.main()
