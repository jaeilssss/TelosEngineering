#!/usr/bin/env python3
"""Warn after Claude edits code without a frozen SPEC.md."""
import json
import os
import sys
from pathlib import Path

CODE_EXTS = {".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".rs", ".java", ".rb", ".c", ".cpp"}


def warn(message: str) -> None:
    print(json.dumps({"systemMessage": message}))


def has_test_strategy(text: str) -> bool:
    for line in text.splitlines():
        normalized = line.strip()
        lower = normalized.lower()
        if lower.startswith(("test strategy:", "테스트 전략:")):
            _, _, value = normalized.partition(":")
            return bool(value.strip())
    return False


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        payload = {}

    tool_input = payload.get("tool_input", {}) or {}
    edited = tool_input.get("file_path") or tool_input.get("path") or ""
    ext = Path(edited).suffix.lower() if edited else ""

    if not ext or ext not in CODE_EXTS:
        return 0

    project_dir = (
        payload.get("cwd")
        or os.environ.get("CLAUDE_PROJECT_DIR")
        or os.getcwd()
    )
    spec = Path(project_dir) / "SPEC.md"

    if not spec.exists():
        warn("spec-first: SPEC.md가 없습니다. 기능 구현이라면 /telos:spec을 먼저 실행하세요.")
        return 0

    text = spec.read_text(encoding="utf-8", errors="ignore")
    status_line = next((line for line in text.splitlines() if line.strip().lower().startswith(("상태:", "status:"))), "")
    normalized_status = status_line.replace("`", "").lower()
    if "frozen" not in normalized_status or "draft" in normalized_status:
        warn("spec-first: SPEC.md가 draft입니다. /telos:spec으로 frozen 상태를 확정하세요.")
        return 0

    if not has_test_strategy(text):
        warn("spec-first: SPEC.md에 비어 있지 않은 Test strategy를 먼저 기록하세요.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
