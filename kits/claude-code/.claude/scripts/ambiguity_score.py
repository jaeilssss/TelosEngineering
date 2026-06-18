#!/usr/bin/env python3
"""모호성 점수 산정기 (선택 도구).

우로보로스 공식의 경량 복제:  Ambiguity = 1 − Σ(clarityᵢ × weightᵢ)
목표/제약/성공기준 명확도를 저렴한 모델로 0~1 채점하고 가중합한다.
임계값 0.2 이하이면 "Seed 생성(=frozen) 가능".

사용:
    export ANTHROPIC_API_KEY=...
    pip install anthropic
    python3 scripts/ambiguity_score.py SPEC.md

비용 메모: 채점은 의도적으로 가장 싼 Haiku 티어를 쓴다. 한 번 호출 = 한 번 채점.
"""
import json
import sys
from pathlib import Path

# 그린필드 가중치 (우로보로스와 동일). 브라운필드면 context 차원을 추가하면 된다.
WEIGHTS = {"goal": 0.40, "constraint": 0.30, "success": 0.30}
THRESHOLD = 0.20
SCORING_MODEL = "claude-haiku-4-5-20251001"  # 채점은 싼 모델로 충분

PROMPT = """다음 명세서를 읽고 세 차원의 '명확도'를 0.0~1.0 으로 채점하라.
- goal: 목표가 구체적이고 단일한가?
- constraint: 제약/요구사항이 정의되어 있는가?
- success: 성공/인수 기준이 측정 가능한가?
오직 JSON 으로만 답하라. 다른 텍스트, 마크다운 펜스 금지.
형식: {{"goal": 0.0, "constraint": 0.0, "success": 0.0}}

명세서:
---
{spec}
---"""


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: python3 ambiguity_score.py <SPEC.md>")
        return 2

    spec_text = Path(sys.argv[1]).read_text(encoding="utf-8")

    try:
        import anthropic
    except ImportError:
        print("anthropic 패키지가 필요합니다:  pip install anthropic")
        return 1

    client = anthropic.Anthropic()
    resp = client.messages.create(
        model=SCORING_MODEL,
        max_tokens=200,
        temperature=0.1,  # 재현성
        messages=[{"role": "user", "content": PROMPT.format(spec=spec_text)}],
    )
    raw = "".join(b.text for b in resp.content if b.type == "text").strip()
    raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        scores = json.loads(raw)
    except json.JSONDecodeError:
        print(f"점수 파싱 실패. 원응답:\n{raw}")
        return 1

    clarity = sum(float(scores[k]) * w for k, w in WEIGHTS.items())
    ambiguity = round(1 - clarity, 3)

    print("차원별 명확도:")
    for k, w in WEIGHTS.items():
        print(f"  {k:10s} {scores[k]:.2f} × {w:.2f} = {float(scores[k]) * w:.3f}")
    print(f"\nClarity   = {clarity:.3f}")
    print(f"Ambiguity = {ambiguity}")

    if ambiguity <= THRESHOLD:
        print(f"✓ Ambiguity ≤ {THRESHOLD} → SPEC 을 frozen 하고 구현 시작 가능")
        return 0
    print(f"✗ Ambiguity > {THRESHOLD} → 아직 모호함. /spec 으로 더 캐물어라")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
