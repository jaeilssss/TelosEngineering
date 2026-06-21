#!/usr/bin/env python3
"""Warn when code-like files are edited without a frozen SPEC.md.

The plugin invokes this helper after code edits. It never blocks the edit.
"""
import json
import os
import sys
from pathlib import Path

CODE_EXTS = {".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".rs", ".java", ".rb", ".c", ".cpp"}
PATCH_PATH_PREFIXES = ("*** Add File: ", "*** Update File: ", "*** Delete File: ")


def edited_paths(tool_input: dict):
    direct_path = tool_input.get("file_path") or tool_input.get("path")
    if direct_path:
        return [Path(direct_path)]

    command = tool_input.get("command") or ""
    return [
        Path(line[len(prefix):].strip())
        for line in command.splitlines()
        for prefix in PATCH_PATH_PREFIXES
        if line.startswith(prefix)
    ]


def warn(message: str) -> None:
    print(json.dumps({
        "systemMessage": message,
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": message,
        },
    }))


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        payload = {}

    tool_input = payload.get("tool_input", {}) or {}
    paths = edited_paths(tool_input)

    if not paths or not any(path.suffix.lower() in CODE_EXTS for path in paths):
        return 0

    project_dir = payload.get("cwd") or os.getcwd()
    spec = Path(project_dir) / "SPEC.md"

    if not spec.exists():
        warn("spec-first: SPEC.md is missing. For feature work, define $spec first.")
        return 0

    text = spec.read_text(encoding="utf-8", errors="ignore")
    status_line = next((line for line in text.splitlines() if line.strip().lower().startswith(("status:", "상태:"))), "")
    normalized_status = status_line.replace("`", "").lower()
    if "frozen" not in normalized_status or "draft" in normalized_status:
        warn("spec-first: SPEC.md is not frozen. Resolve open questions before implementation.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
