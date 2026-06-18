#!/usr/bin/env python3
"""Local ambiguity scorer for SPEC.md.

This is a deterministic, dependency-free approximation of the Claude kit's
optional ambiguity check. It is intentionally conservative and should be used
as a prompt to ask better questions, not as a formal proof of clarity.
"""
import re
import sys
from pathlib import Path

WEIGHTS = {"goal": 0.40, "constraint": 0.30, "success": 0.30}
THRESHOLD = 0.20
VAGUE_WORDS = {
    "improve",
    "optimize",
    "better",
    "fast",
    "simple",
    "easy",
    "robust",
    "nice",
    "개선",
    "최적화",
    "빠르게",
    "쉽게",
    "적절히",
    "좋게",
}


def section(text: str, heading: str) -> str:
    pattern = rf"^##\s+\d+\.\s+{re.escape(heading)}.*?$"
    match = re.search(pattern, text, flags=re.MULTILINE | re.IGNORECASE)
    if not match:
        return ""
    start = match.end()
    next_heading = re.search(r"^##\s+\d+\.\s+", text[start:], flags=re.MULTILINE)
    end = start + next_heading.start() if next_heading else len(text)
    return text[start:end].strip()


def non_placeholder_lines(block: str) -> list[str]:
    lines = []
    for raw in block.splitlines():
        line = raw.strip()
        if not line or line in {"-", "|         |            |       |"}:
            continue
        if line.startswith("<!--") or line.startswith("|---"):
            continue
        lines.append(line)
    return lines


def vague_penalty(text: str) -> float:
    lowered = text.lower()
    hits = sum(1 for word in VAGUE_WORDS if word in lowered)
    return min(0.3, hits * 0.1)


def goal_score(text: str) -> float:
    lines = non_placeholder_lines(section(text, "Goal") or section(text, "목표"))
    if not lines:
        return 0.0
    joined = " ".join(lines)
    score = 0.75 if len(joined) >= 30 else 0.45
    if any(token in joined.lower() for token in ("because", "why", "for ", "위해", "때문")):
        score += 0.15
    return max(0.0, min(1.0, score - vague_penalty(joined)))


def constraint_score(text: str) -> float:
    lines = non_placeholder_lines(section(text, "Constraints") or section(text, "제약"))
    if not lines:
        return 0.0
    score = min(1.0, 0.35 + len(lines) * 0.2)
    return max(0.0, score - vague_penalty(" ".join(lines)))


def success_score(text: str) -> float:
    block = section(text, "Acceptance Criteria") or section(text, "인수 기준")
    lines = [line for line in non_placeholder_lines(block) if re.search(r"AC\d+|-\s+\[[ xX]\]", line)]
    filled = [line for line in lines if not re.search(r"AC\d+:\s*$", line)]
    if not filled:
        return 0.0
    measurable = sum(1 for line in filled if re.search(r"\d|must|should|returns?|fails?|passes?|when|given|then|해야|된다|반환|실패|성공", line, re.IGNORECASE))
    score = min(1.0, 0.25 + len(filled) * 0.15 + measurable * 0.15)
    return max(0.0, score - vague_penalty(" ".join(filled)))


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: python3 ambiguity_score.py <SPEC.md>")
        return 2

    text = Path(sys.argv[1]).read_text(encoding="utf-8", errors="ignore")
    scores = {
        "goal": goal_score(text),
        "constraint": constraint_score(text),
        "success": success_score(text),
    }
    clarity = sum(scores[k] * WEIGHTS[k] for k in WEIGHTS)
    ambiguity = round(1 - clarity, 3)

    print("Dimension clarity:")
    for key, weight in WEIGHTS.items():
        print(f"  {key:10s} {scores[key]:.2f} x {weight:.2f} = {scores[key] * weight:.3f}")
    print(f"\nClarity   = {clarity:.3f}")
    print(f"Ambiguity = {ambiguity}")

    if ambiguity <= THRESHOLD:
        print(f"OK: Ambiguity <= {THRESHOLD}. SPEC can be frozen if open questions are empty.")
    else:
        print(f"Needs work: Ambiguity > {THRESHOLD}. Run $spec and clarify the weak sections.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
