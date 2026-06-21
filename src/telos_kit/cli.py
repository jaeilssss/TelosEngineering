from __future__ import annotations

import argparse
import sys

from . import __version__
from .installers import InstallError, install


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="telos",
        description="Install Telos spec-first plugins for Codex and Claude Code.",
    )
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")

    subparsers = parser.add_subparsers(dest="command", required=True)
    install_parser = subparsers.add_parser("install", help="Install one or both Telos plugins.")
    install_parser.add_argument("target", choices=("codex", "claude", "all"))
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        for message in install(args.target):
            print(message)
    except InstallError as exc:
        print(f"telos: {exc}", file=sys.stderr)
        return 1
    return 0
