from __future__ import annotations

import argparse
import sys
from pathlib import Path

from . import __version__
from .installers import InstallError, install
from .update_status import get_update_notice


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="telos",
        description="Install Telos spec-first plugins for Codex and Claude Code.",
    )
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")

    subparsers = parser.add_subparsers(dest="command", required=True)
    install_parser = subparsers.add_parser("install", help="Install one or both Telos plugins.")
    install_parser.add_argument("target", choices=("codex", "claude", "all"))
    update_status_parser = subparsers.add_parser(
        "update-status",
        help="Print an update recommendation when the installed plugin is older than this repo.",
    )
    update_status_parser.add_argument("target", choices=("codex", "claude"))
    update_status_parser.add_argument(
        "--project-root",
        default=".",
        help="Project root to inspect for src/telos_kit/kit_versions.json.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command == "update-status":
        message = get_update_notice(args.target, project_root=Path(args.project_root).resolve())
        if message:
            print(message)
        return 0
    try:
        for message in install(args.target):
            print(message)
    except InstallError as exc:
        print(f"telos: {exc}", file=sys.stderr)
        return 1
    return 0
