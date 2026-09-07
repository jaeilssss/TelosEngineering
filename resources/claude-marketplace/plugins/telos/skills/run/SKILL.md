---
description: "frozen SPEC.md를 기준으로 설치된 Capability를 선택·조합해 검증된 완료까지 실행"
aliases: [execute, 실행]
---

# Telos V2 Run

현재 프로젝트 루트의 frozen `SPEC.md`를 목표 계약으로 사용한다. Telos는 Spec과 **final Eval**을 소유한다. 설치된 스킬·플러그인·에이전트는 목표를 달성하기 위해 선택하는 교체 가능한 Capability다.

## 시작 전 확인

1. 가능하면 `telos update-status claude --project-root .`를 실행하고, 업데이트 안내가 있으면 먼저 보여준다.
2. `SPEC.md`를 읽는다. 파일이 없거나 draft이거나 Open Questions가 남아 있으면 중단하고 `/telos:spec`으로 안내한다.
3. 관련 저장소 경로와 worktree 상태를 확인한 뒤 Capability를 고른다.
4. Spec baseline, Expected Change Surface, Verification Plan, Risk Profile, AC를 읽는다. 의미 있는 baseline drift가 있으면 코드 변경 전에 사용자에게 Spec 재확인을 요청한다.
5. `telos` CLI가 있으면 `telos capabilities discover --project-root . --json`을 실행해 설치된 Capability 목록을 가져온다. Capability를 고른 뒤 `telos run start --project-root .`로 기록 가능한 Loop를 시작한다.

## Capability Discovery와 Capability Router

1. `telos capabilities discover --project-root . --json`으로 설치된 스킬·플러그인·에이전트를 발견하고, 현재 세션 도구도 함께 확인한다.
2. 제공자 이름이 아니라 할 수 있는 일(Capability)로 후보를 설명한다. 특정 외부 스킬이 설치됐거나 필수라고 가정하지 않는다.
3. Spec, 저장소, 이전 실패 근거를 보고 이번 iteration에 필요한 최소 Capability를 판단한다. 구현, 스택 전문성, 테스트, 디버깅, 리뷰, 마이그레이션 안전성 등이 대상이 될 수 있다.
4. 지금 필요한 Capability만 선택한다. 작고 명확한 변경은 메인 세션에서 진행하고, 특정 능력이나 독립적인 근거 수집이 실질적으로 도움이 될 때만 위임한다.
5. `telos capabilities route --project-root . --need "..." --json`으로 메타데이터 기반 후보 순위를 확인한다. 키워드 점수만으로 선택을 확정하지 말고 Spec과 근거로 적합성을 판단한다.
6. 선택한 Capability에는 frozen Spec, 관련 파일, 저장소 지침, iteration 상태, 구체적 실패 근거만 전달한다. 관련 없는 대화 전체를 넘기지 않는다.

## 실행 Loop

선택한 Capability, 변경 내용, 검증 근거, 실패, 다음 라우팅 결정을 짧은 iteration 기록으로 유지한다.

1. 선택한 조합으로 작업한다. AC에 필요한 변경만 구현하고, 의미 있는 변경을 AC에 연결한다.
2. Spec에 기록된 프로젝트별 검증과 필요한 위험 검사를 실행한다. 파괴적·네트워크 사용·효과가 불명확한 명령은 사용자 확인 없이 실행하지 않는다.
3. `/telos:eval`을 호출하거나, run 안에서 같은 증거 기반 Eval 게이트를 수행한다.
4. `telos run record --project-root . --status approved|rejected|uncertain|blocked --summary "..."`로 final Eval 결과를 기록한다.
5. final Eval이 approved면 AC 근거와 함께 완료를 보고한다.
6. final Eval이 rejected 또는 uncertain이면 실패 근거를 분석하고 **Re-route**한다. 다음 iteration에 필요한 최소 Capability를 새로 선택한 뒤 `telos run retry --project-root . --capability <id>`로 다음 iteration을 시작하고 Fix → Test → Eval을 반복한다.
7. Spec과 저장소가 충돌하거나, 필요한 Capability가 없거나, 범위를 넓혀야 하거나, CLI iteration limit에 도달했거나, 반복해도 새 근거가 생기지 않으면 중단하고 사용자에게 방향을 묻는다.

## 원칙

- 설치된 스킬이 제공할 수 있는 능력을 Telos가 다시 구현하지 않는다.
- 설치된 스킬을 모두 불러오지 않는다. 정확한 라우팅이 우선이다.
- 외부 Capability는 iteration마다 교체할 수 있지만 최종 오케스트레이터는 Telos다.
- Expected Change Surface를 지키고, 범위 충돌은 추측하지 말고 `/telos:spec`으로 되돌린다.
- 구현·테스트·평가 근거를 분리한다. 구현 Capability가 자기 결과를 승인하지 않는다.

## 완료 보고

최종 상태, 역할별로 선택한 Capability, 변경 파일, 검증 명령과 결과, AC별 근거, 남은 위험을 짧게 보고한다. frozen Spec을 final Eval이 승인하기 전에는 완료라고 말하지 않는다.
