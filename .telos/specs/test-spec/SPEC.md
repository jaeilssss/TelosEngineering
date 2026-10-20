# Spec: Telos 테스트 SPEC

Status: `frozen`
Date: 2026-10-20
Spec baseline: `feat/engine-knowledge-separation` at `b5e74eba9915e9575a5af6b1c8b36b306d148bfa`

## 1. Goal

Telos의 프로젝트 로컬 SPEC 생성 경로를 확인하기 위해 구현 작업 없이 테스트용 계약 문서를 만든다.

## 2. Ontology

| Concept | Definition | Notes |
|---------|------------|-------|
| 테스트 SPEC | Telos 동작 확인만을 위해 만드는 기능 변경 없는 Feature SPEC | 구현 Run을 시작하지 않는다. |

## 3. Constraints

- 소스 코드, 의존성, 설정 동작을 변경하지 않는다.
- 이 SPEC은 Telos의 프로젝트 로컬 `.telos/specs/` 경로에만 저장한다.

## 4. Test Strategy

Test strategy: none — 문서 생성 경로만 확인하며 구현 또는 동작 변경이 없다.

## 5. Expected Change Surface

- allowed: `.telos/specs/test-spec/SPEC.md`
- excluded: source code, tests, dependencies, project configuration
- dependency/API/schema changes: none

## 6. Verification Plan

- manual check: `.telos/specs/test-spec/SPEC.md`가 존재하고 이 문서의 상태가 frozen이다.

## 7. Acceptance Criteria

- [ ] AC1: `.telos/specs/test-spec/SPEC.md`가 프로젝트 내부에 존재한다.
- [ ] AC2: 이 SPEC 생성으로 소스 코드, 의존성, 프로젝트 설정이 변경되지 않는다.

## 8. Out of Scope

- Telos Run 시작, 구현 작업, Eval 실행

## 9. Open Questions

- 없음
