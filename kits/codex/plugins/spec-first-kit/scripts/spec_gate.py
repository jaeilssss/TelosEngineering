#!/usr/bin/env python3
"""Warn when code-like files are edited without a frozen SPEC.md.

This helper is bundled for teams that want to wire a local Codex hook later.
It does not block; it only prints warnings.
"""
import json
import os
import sys
from pathlib import Path

CODE_EXTS = {".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".rs", ".java", ".rb", ".c", ".cpp"}


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        payload = {}

    tool_input = payload.get("tool_input", {}) or {}
    edited = tool_input.get("file_path") or tool_input.get("path") or ""
    ext = Path(edited).suffix.lower() if edited else ""

    if ext and ext not in CODE_EXTS:
        return 0

    project_dir = payload.get("cwd") or os.getcwd()
    spec = Path(project_dir) / "SPEC.md"

    if not spec.exists():
        print("spec-first: SPEC.md is missing. For feature work, define $spec first.")
        return 0

    text = spec.read_text(encoding="utf-8", errors="ignore")
    status_line = next((line for line in text.splitlines() if line.strip().lower().startswith(("status:", "상태:"))), "")
    normalized_status = status_line.replace("`", "").lower()
    if "frozen" not in normalized_status or "draft" in normalized_status:
        print("spec-first: SPEC.md is not frozen. Resolve open questions before implementation.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
