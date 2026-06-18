#!/usr/bin/env python3
"""PostToolUse 훅 (전역 설치판): 코드가 frozen SPEC 없이 작성되면 경고를 주입한다.

글로벌(~/.claude/)에 설치되므로, SPEC.md 는 스크립트 위치가 아니라
**현재 작업 중인 프로젝트**에서 찾아야 한다. 작업 디렉터리는:
  1) 훅 입력 JSON 의 cwd, 2) CLAUDE_PROJECT_DIR 환경변수, 3) os.getcwd() 순으로 해석.

LLM 호출이 전혀 없는 $0 게이트. 차단하지 않고 부드럽게 상기시킨다.
"""
import json
import os
import sys
from pathlib import Path

CODE_EXTS = {".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".rs", ".java", ".rb", ".c", ".cpp"}


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        payload = {}

    tool_input = payload.get("tool_input", {}) or {}
    edited = tool_input.get("file_path") or tool_input.get("path") or ""
    ext = Path(edited).suffix.lower() if edited else ""

    # 코드 파일이 아니면 관여하지 않는다 (문서/설정 편집은 자유).
    if ext and ext not in CODE_EXTS:
        sys.exit(0)

    # 작업 중인 프로젝트 루트 해석 (글로벌 설치이므로 스크립트 위치를 쓰지 않는다).
    project_dir = (
        payload.get("cwd")
        or os.environ.get("CLAUDE_PROJECT_DIR")
        or os.getcwd()
    )
    spec = Path(project_dir) / "SPEC.md"

    if not spec.exists():
        print("⚠️ spec-first: 이 프로젝트에 SPEC.md 가 없습니다. "
              "기능 구현이라면 `/spec` 으로 명세를 먼저 합의하세요. (탐색/일회성 작업이면 무시 가능)")
        sys.exit(0)

    text = spec.read_text(encoding="utf-8", errors="ignore")
    status_line = next((line for line in text.splitlines() if line.strip().lower().startswith(("상태:", "status:"))), "")
    normalized_status = status_line.replace("`", "").lower()
    if "frozen" not in normalized_status or "draft" in normalized_status:
        print("⚠️ spec-first: SPEC.md 가 아직 draft 입니다. 인수 기준을 확정(frozen)한 뒤 구현하세요.")
    sys.exit(0)


if __name__ == "__main__":
    main()
