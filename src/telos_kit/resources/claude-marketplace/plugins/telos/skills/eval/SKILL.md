---
description: "SPEC.md의 인수 기준에 대해 3단계 평가 게이트 실행"
aliases: [verify, gate]
---

현재 프로젝트 루트의 `SPEC.md` 인수 기준(Acceptance Criteria) 충족 여부를 **비용 순서**로
검증한다. 싼 단계가 통과해야 비싼 단계로 넘어간다.

이 스킬은 `eval` 오케스트레이터로 동작한다. 의미 판정은 구현 워커와 독립된 평가 서브에이전트가 맡아야 한다.

## 작업 입력 (선택: 특정 AC만 평가)
$ARGUMENTS

가능하면 먼저 `telos update-status claude --project-root .`를 실행한다. 메시지가 나오면 업데이트 권장을 먼저 보여준다.

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

평가 워커에는 다음만 넘긴다:
- `SPEC.md`
- 관련 변경 파일
- Stage 1 결과
- 이미 알려진 검증 한계

구현 의도, 장문의 구현 대화, 희망적 추정은 넘기지 않는다. 평가는 증거 중심이어야 한다.

## Stage 3 — Consensus (선택, 기본 OFF)
다음일 때만 사용자에게 교차 검증을 제안한다(평소엔 생략 — 토큰 절약):
- 고위험 변경(인증/결제/마이그레이션 등), 또는 Stage 2에 `uncertain` 이 있을 때.
동의 시 다른 모델로 동일 평가를 한 번 더 돌려 비교한다.

## 마무리
- 통과: 통과한 AC를 SPEC.md 에서 `[x]` 로 체크.
- 실패: 실패한 AC를 SPEC.md 의 Open Questions/다음 반복 입력으로 **되먹인다**
  (평가 출력이 다음 사이클 입력이 되는 우로보로스 루프).
