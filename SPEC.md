# Spec: Telos version update notice for `spec`

Status: `draft`
Date: 2026-06-18

## 1. Goal
`spec` 실행 시 GitHub release tag를 확인해, 현재 설치된 kit보다 새 버전이 있으면 해당 kit 사용자에게만 업데이트 안내를 표시한다.

## 2. Ontology
| Concept | Definition | Notes |
|---------|------------|-------|
| Telos | 이 저장소에서 배포하는 kit 전체 | `codex` kit와 `claude` kit를 포함한다. |
| Kit | 특정 실행 환경에 설치되는 배포 단위 | `codex` kit와 `claude` kit를 별도로 관리한다. |
| `spec` 실행 | 사용자가 `spec` 스킬을 호출해 인터뷰를 시작하는 시점 | 버전 체크는 이 진입점에서만 수행한다. |
| GitHub release tag | 원격에서 기준으로 삼는 버전 식별자 | 업데이트 가능 여부의 단일 기준이다. |
| 현재 설치 버전 | 로컬에 설치된 kit의 버전 식별자 | 원격 tag와 비교하는 값이다. |
| 업데이트 안내 | 새 버전 존재를 알리는 경고 메시지 | 작업은 중단하지 않는다. |

## 3. Constraints
- 버전 확인은 `spec` 실행 시에만 수행한다.
- 버전 비교 기준은 GitHub release tag이다.
- 네트워크 조회에 실패해도 `spec` 작업은 계속 진행한다.
- 네트워크 실패 시에는 경고만 표시하고 중단하지 않는다.
- `codex` kit 업데이트는 `codex` 사용자에게만 안내한다.
- `claude` kit 업데이트는 `claude` 사용자에게만 안내한다.
- 두 kit 모두 업데이트되면 두 사용자 모두에게 각각 안내한다.

## 4. Acceptance Criteria
- [ ] AC1: `spec` 실행 시 원격 GitHub release tag와 로컬 설치 버전을 비교하는 경로가 존재한다.
- [ ] AC2: 원격에 `codex` kit의 새 버전만 있으면 `codex` 사용자에게만 업데이트 안내가 표시된다.
- [ ] AC3: 원격에 `claude` kit의 새 버전만 있으면 `claude` 사용자에게만 업데이트 안내가 표시된다.
- [ ] AC4: 두 kit 모두 새 버전이면 두 사용자에게 각각 업데이트 안내가 표시된다.
- [ ] AC5: 버전 조회가 네트워크 오류로 실패해도 `spec` 작업은 계속되고, 경고만 표시된다.

## 5. Out of Scope
- 자동 업데이트 실행
- `spec` 외 다른 명령에서의 버전 체크
- 릴리즈 노트 전문 출력
- 설치 방식 자체의 재설계

## 6. Open Questions
- 없음
