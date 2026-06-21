---
description: "SPEC.md의 인수 기준에 대해 3단계 평가 게이트 실행"
aliases: [verify, gate]
---

현재 프로젝트 루트의 `SPEC.md` 인수 기준(Acceptance Criteria) 충족 여부를 **비용 순서**로
검증한다. 싼 단계가 통과해야 비싼 단계로 넘어간다.

## 작업 입력 (선택: 특정 AC만 평가)
$ARGUMENTS

## Stage 1 — Mechanical (LLM 없음, $0)
프로젝트에 맞는 기계 검증을 실행:
- 테스트: (예) `pytest` / `npm test` / `go test ./...`
- 린트/포맷: (예) `ruff check` / `eslint`
- 타입체크: (예) `mypy` / `tsc --noEmit`
- 빌드: 해당 시

**하나라도 실패하면 여기서 멈춘다.** 실패 내역을 보고하고 LLM 단계로 넘어가지 않는다.

## Stage 2 — Semantic
Stage 1 통과 시, `telos:spec-evaluator` 서브에이전트를 호출한다. SPEC.md 의 각 인수 기준에 대해
코드/동작 근거와 함께 `approved` / `rejected` / `uncertain` 을 판정하게 한다.

## Stage 3 — Consensus (선택, 기본 OFF)
다음일 때만 사용자에게 교차 검증을 제안한다(평소엔 생략 — 토큰 절약):
- 고위험 변경(인증/결제/마이그레이션 등), 또는 Stage 2에 `uncertain` 이 있을 때.
동의 시 다른 모델로 동일 평가를 한 번 더 돌려 비교한다.

## 마무리
- 통과: 통과한 AC를 SPEC.md 에서 `[x]` 로 체크.
- 실패: 실패한 AC를 SPEC.md 의 Open Questions/다음 반복 입력으로 **되먹인다**
  (평가 출력이 다음 사이클 입력이 되는 우로보로스 루프).
