# Telos V2

> 승인된 목표가 검증될 때까지 구현과 평가 Loop를 관리하는 Spec-driven Harness

Telos는 Codex와 Claude Code를 위한 오픈소스 개발 Harness입니다. 사용자의 목표를 실행 가능한 계약으로 만들고, 현재 환경에서 사용할 수 있는 Capability를 선택한 뒤, 구현·테스트·평가가 완료 조건을 만족할 때까지 관리합니다.

Telos는 전문 스킬을 대체하거나 자체 키워드 라우터로 스킬을 고르지 않습니다. 현재 Codex 또는 Claude Code 하네스가 구현 능력을 선택합니다. Telos는 그 작업을 frozen Spec, 실행 상태, 재현 가능한 검증, 독립적인 최종 판정에 연결합니다.

## Telos가 지향하는 것

코드 생성만으로 작업이 완료되지는 않습니다. 목표가 명확해야 하고, 범위가 통제돼야 하며, 테스트와 근거를 통해 정말 완료됐는지 판단해야 합니다.

```text
사용자 목표 → Spec → 하네스가 Capability 선택 → 구현 → Eval
                                               ↑          │
                                               └── 재시도 ─┘
```

사용자는 목표를 정의합니다. Telos는 워크플로우·상태·최종 평가를 관리합니다.

## 하네스가 선택하는 Capability

설치된 스킬·플러그인·에이전트는 교체 가능한 Capability입니다. Telos는 특정 제공자에 종속되지 않으며, Capability 이름을 키워드로 채점하지 않습니다.

- 현재 Codex 또는 Claude Code 하네스가 Spec과 저장소 맥락을 보고 적절한 Capability를 선택합니다.
- Telos는 선택 결과를 감사용 정보로 기록하지만, 하네스와 경쟁하는 두 번째 선택기를 실행하지 않습니다.
- 적절한 외부 스킬이 없다면 현재 Codex 또는 Claude Code 세션과 기본 도구로 계속 진행합니다.
- Eval이 rejected이면 다음 iteration에서 하네스가 다른 Capability를 선택할 수 있습니다.

## 설치

Node.js 20 이상이 필요합니다.

```bash
npx telos-kit install all
# 또는
npm install -g telos-kit
telos install all
```

`all` 대신 `codex` 또는 `claude`를 지정하면 한쪽만 설치합니다. 설치 후 해당 클라이언트를 재시작하세요.

`telos uninstall codex|claude|all`은 Telos가 소유한 플러그인 파일과 카탈로그 항목만 제거합니다.

## 업데이트

```bash
# npx
npx telos-kit@latest update all

# 전역 설치
npm update -g telos-kit
telos update all
```

## 워크플로우

```text
spec → run → eval
```

1. `$spec` / `/telos:spec`은 목표를 측정 가능한 인수 기준이 담긴 `.telos/specs/<slug>/SPEC.md`로 만듭니다.
2. `$run` / `/telos:run`은 구현 → 테스트 → 평가 Loop를 관리합니다.
3. `$eval` / `/telos:eval`은 frozen Spec을 기준으로 근거를 확인해 approved, rejected, uncertain을 판정합니다.

기능 작업은 항상 명시적인 slug로 시작합니다. 기능별 상태와 Eval 리포트는 서로 분리됩니다.

```bash
telos run start --spec payment-flow --project-root . --capability implementation
telos run record --spec payment-flow --project-root . --status approved --summary "모든 인수 기준 통과"
telos run status --spec payment-flow --project-root .
```

`run`은 iteration을 `.telos/runs/<slug>.json`에, Eval 결과를 `.telos/evals/<slug>/<iteration>.md`에 기록합니다. 범위를 넓혀야 하거나, Spec과 저장소가 충돌하거나, 적절한 Capability가 없거나, 반복 제한에 도달하면 사용자에게 방향을 요청합니다.

`telos run start`는 선택한 slug를 Git에서 무시되는 개발자 로컬 파일 `.telos/active`에 기록합니다. 설치된 훅은 이 포인터와 `.telos/project.yml`의 경로 설정을 사용해, 활성 Feature SPEC에만 게이트를 적용합니다.

## 프로젝트 검증과 scope 증거

`.telos/project.yml`에는 프로젝트별 기계 검증을 기록합니다. `risks`는 변경 경로와 일치할 때만 실행되고, `scopes`는 인수 기준의 검증 범위를 선언합니다.

`verify`와 `risks[].check`의 명령은 사용자 권한으로 실행됩니다. 특히 신뢰하지 않는 PR에서 `project.yml`이 바뀌었다면 실행 전에 내용을 확인해야 합니다.

```yaml
modules:
  - name: web
    paths: ["src/**"]
    verify: ["npm test"]
risks:
  - id: secret-literal
    when: ["src/**"]
    check: grep -rnE '(token|secret)=' src/
    fail_when: found
scopes: ["ios", "android"]
```

scope가 있는 AC에는 모든 scope별 증거를 남기고 존재 여부를 검사합니다. 증거가 실제로 충분한지는 최종 Eval이 계속 판단합니다.

```markdown
- [ ] AC1 [scopes: ios, android] 로그인이 성공한다.
  - Evidence [ios]: iOS E2E 테스트 통과.
  - Evidence [android]: Android E2E 테스트 통과.
```

```bash
telos verify --changed --project-root .
telos evidence check --spec .telos/specs/payment-flow/SPEC.md --project-root .
```

```bash
telos run status --spec payment-flow --project-root .
```

처음 설정하거나 문제가 있는지 확인할 때는 다음 명령을 사용합니다.

```bash
telos init --project-root .
telos doctor --project-root .
```

`init`은 `paths: ["**"]`인 모듈 하나를 만들고, 저장소 표식을 바탕으로 검증 명령을 최대 하나만 추론합니다. 확신할 수 없으면 `verify: []`을 기록합니다. `doctor`는 설정 파싱, 모듈별 경로 일치 수, 각 검증 명령의 결과를 보여줍니다.

## 이력과 리뷰

활성 Run에서 `verify --changed`를 실행하면 현재 작업 트리 지문이 저장됩니다. 이후 코드가 달라지면 Eval 결과를 기록할 수 없으므로, 테스트 뒤에 바뀐 코드를 실수로 승인하지 않습니다. 완료된 slug를 다시 사용하면 이전 상태와 Markdown 리포트는 archive로 이동합니다.

```bash
telos history --since 7d --project-root .
```

`$review` / `/telos:review`는 반복된 거절 이력을 읽고 예방책만 제안합니다. 우선순위는 회귀 테스트, 도구가 관리하는 lint/type 규칙, 표현 가능한 risk 검사 순서입니다. `project.yml`을 직접 수정하지 않습니다. risk에는 선택적으로 `added`, `origin`, `caught` 메타데이터를 기록할 수 있습니다. 오래됐지만 `caught: 0`인 risk는 사람이 검토할 후보일 뿐, 자동 삭제 대상이 아닙니다.


## 원칙

- **실행 전 Spec** — 작업은 검토 가능한 완료 계약에서 시작합니다.
- **제공자보다 Capability** — 스킬 이름이나 설치 순서가 아니라 현재 필요한 능력으로 선택합니다.
- **의도보다 근거** — 모든 인수 기준을 뒷받침하는 증거가 있어야 완료됩니다.
- **안전하고 제한된 Loop** — 근거 없이 반복하지 않고, 사용자 판단이나 새 Capability가 필요하면 멈춥니다.
- **Codex와 Claude Code 모두 지원** — 동일한 V2 Workflow를 두 환경에 제공합니다.

## 개발

```bash
npm ci
npm test
npm run check:release
npm pack --dry-run
```

npm 패키지는 Node CLI와 Codex·Claude Code 플러그인 번들을 함께 배포합니다. GitHub Actions는 Node 20·22·24에서 테스트하고, GitHub Release를 통해 검증된 버전을 npm에 배포할 수 있습니다.
