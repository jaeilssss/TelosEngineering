from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import __version__
from .installers import InstallError, install
from .update_status import get_update_notice, get_update_status


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="telos",
        description="Install Telos spec-first plugins for Codex and Claude Code.",
    )
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")

    subparsers = parser.add_subparsers(dest="command", required=True)
    install_parser = subparsers.add_parser("install", help="Install one or both Telos plugins.")
    install_parser.add_argument("target", choices=("codex", "claude", "all"))
    update_parser = subparsers.add_parser(
        "update",
        help="Reinstall one or both Telos plugins from the current telos-kit package.",
    )
    update_parser.add_argument("target", choices=("codex", "claude", "all"))
    update_status_parser = subparsers.add_parser(
        "update-status",
        help="Print an update recommendation when the installed plugin is older than this repo.",
    )
    update_status_parser.add_argument("target", choices=("codex", "claude", "all"))
    update_status_parser.add_argument(
        "--project-root",
        default=".",
        help="Project root to inspect for src/telos_kit/kit_versions.json.",
    )
    update_status_parser.add_argument(
        "--json",
        action="store_true",
        help="Print structured JSON output.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command == "update-status":
        targets = ("codex", "claude") if args.target == "all" else (args.target,)
        project_root = Path(args.project_root).resolve()
        if args.json:
            payload = [get_update_status(target, project_root=project_root) for target in targets]
            print(json.dumps(payload, ensure_ascii=False, indent=2))
            return 0
        for target in targets:
            message = get_update_notice(target, project_root=project_root)
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
