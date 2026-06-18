#!/usr/bin/env bash
# 글로벌(~/.claude) 설치 스크립트. 멱등(idempotent) — 재실행해도 안전하다.
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.claude" && pwd)"
DEST="$HOME/.claude"
MANIFEST="$DEST/.spec-first-kit-manifest"
CLAUDE_MARKER_BEGIN="<!-- ▼ spec-first-kit-begin -->"
CLAUDE_MARKER_END="<!-- ▲ spec-first-kit-end -->"

# ── 1. 이전 설치 파일 제거 (매니페스트 기반) ────────────────────────────────
if [ -f "$MANIFEST" ]; then
  echo "• 이전 설치 파일 정리 중…"
  while IFS= read -r f; do
    [ -e "$f" ] && rm -rf "$f"
  done < "$MANIFEST"
  rm -f "$MANIFEST"
fi

# 구 commands/ 경로 잔재 정리 (매니페스트 없이 설치된 레거시 대응)
for legacy in spec impl eval; do
  rm -f "$DEST/commands/${legacy}.md"
done

# ── 2. 파일 설치 ────────────────────────────────────────────────────────────
mkdir -p "$DEST/skills" "$DEST/agents" "$DEST/scripts"

cp -r "$SRC/skills/spec" "$SRC/skills/impl" "$SRC/skills/eval" "$DEST/skills/"
cp "$SRC/agents/"*.md     "$DEST/agents/"
cp "$SRC/scripts/"*.py    "$DEST/scripts/"
cp "$SRC/SPEC.template.md" "$DEST/"
chmod +x "$DEST/scripts/"*.py
echo "• skills / agents / scripts / SPEC.template.md 설치 완료"

# ── 3. 매니페스트 기록 ──────────────────────────────────────────────────────
{
  find "$DEST/skills/spec" "$DEST/skills/impl" "$DEST/skills/eval" -type f
  find "$DEST/agents" -name "spec-evaluator.md"
  find "$DEST/scripts" -name "spec_gate.py" -o -name "ambiguity_score.py"
  echo "$DEST/SPEC.template.md"
} > "$MANIFEST"
echo "• 매니페스트 기록: $MANIFEST"

# ── 4. CLAUDE.md — 마커 블록 교체 (중복 방지) ──────────────────────────────
if [ -f "$DEST/CLAUDE.md" ]; then
  # 이전 블록 제거 (마커가 있으면)
  if grep -q "$CLAUDE_MARKER_BEGIN" "$DEST/CLAUDE.md"; then
    sed -i '' "/$CLAUDE_MARKER_BEGIN/,/$CLAUDE_MARKER_END/d" "$DEST/CLAUDE.md"
    echo "• 기존 spec-first-kit 블록 교체"
  fi
  # 새 블록 append
  {
    echo ""
    echo "$CLAUDE_MARKER_BEGIN"
    cat "$SRC/CLAUDE.md"
    echo "$CLAUDE_MARKER_END"
  } >> "$DEST/CLAUDE.md"
  echo "• ~/.claude/CLAUDE.md 업데이트 완료"
else
  {
    echo "$CLAUDE_MARKER_BEGIN"
    cat "$SRC/CLAUDE.md"
    echo "$CLAUDE_MARKER_END"
  } > "$DEST/CLAUDE.md"
  echo "• ~/.claude/CLAUDE.md 생성"
fi

# ── 5. settings.json ────────────────────────────────────────────────────────
if [ -f "$DEST/settings.json" ]; then
  cp "$SRC/settings.json" "$DEST/settings.json.spec-first"
  echo "⚠ ~/.claude/settings.json 이 이미 존재합니다 (덮어쓰지 않음)."
  echo "  → ~/.claude/settings.json.spec-first 의 PostToolUse 훅을 기존 파일의 hooks 에 직접 병합하세요."
else
  cp "$SRC/settings.json" "$DEST/"
  echo "• ~/.claude/settings.json 생성"
fi

echo ""
echo "✅ 설치 완료. Claude Code 세션을 '완전히 재시작'하세요 (settings/hook 적용)."
echo "   첫 실행:  /spec \"만들 기능 설명\"   →   SPEC.md 생성   →   /impl   →   /eval"
