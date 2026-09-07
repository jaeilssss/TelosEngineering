<!--
  SPEC.md 템플릿 — /telos:spec 으로 채운다. 이 파일이 "Seed"이자 구현/평가의 기준점.
  템플릿은 Telos 플러그인에 있고, 실제 SPEC.md 는 작업 중인 각 프로젝트 루트에 생성된다.
  모든 섹션이 구체적으로 채워지기 전에는 구현을 시작하지 않는다.
-->

# Spec: <기능/작업 이름>

상태: `draft` | `frozen`   <!-- frozen 이어야 구현 시작 가능 -->
작성일: <YYYY-MM-DD>
Spec baseline: <frozen 시점의 브랜치와 Git revision, Git 저장소가 아니면 `not a Git repository`>

## 1. 목표 (Goal)
<!-- 한 문장으로 구체적으로. "무엇을, 누구를 위해, 왜". 모호어("개선","최적화") 금지. -->

## 2. 온톨로지 (핵심 개념 정의)
<!-- 핵심 명사가 "정확히 무엇인지". 예: Task란? 삭제 가능한가/보관인가? -->
| 개념 | 정의 | 비고 |
|------|------|------|
|      |      |      |

## 3. 제약 (Constraints)
<!-- 스택, 성능/보안 요구, 하면 안 되는 것, 의존성, 호환성 등 -->
-

## 4. 테스트 전략 (Test Strategy)
<!-- 정확히 하나를 고른다: TDD | test-after | none. none 이면 같은 줄에 사유를 함께 적는다. -->
Test strategy:

## 5. 예상 변경 범위 (Expected Change Surface)
<!-- 변경 가능한 파일/영역, 의존성·API·스키마 호환성 제약. 의도적으로 제한하지 않을 때만 `not constrained`라고 쓴다. -->
- allowed:
- excluded:
- dependency/API/schema changes:

## 6. 검증 계획 (Verification Plan)
<!-- AC를 증명할 명령과 수동 확인. 프로젝트 스택을 쓴다. 예: ./gradlew test --tests ..., ./mvnw test -Dtest=..., npm test -->
- command:
- manual check:

## 7. 위험 프로필 (Risk Profile)
<!-- 해당되는 위험만 선택: 인증/인가, DB 마이그레이션, 공개 API, 결제/데이터 삭제, 동시성. 각각 반드시 통과할 검사를 쓴다. -->
-

## 8. 인수 기준 (Acceptance Criteria)
<!-- 측정 가능한 검증 항목. /telos:eval 이 이 목록을 하나씩 채점한다. -->
- [ ] AC1:
- [ ] AC2:
- [ ] AC3:

## 9. 범위 밖 (Out of Scope)
-

## 10. 미해결 질문 (Open Questions)
<!-- frozen 전에 비워져야 한다. 남아 있으면 아직 모호한 것. -->
-
