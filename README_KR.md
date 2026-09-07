# Telos V2

Telos는 Codex와 Claude Code를 위한 Spec-driven Capability Orchestration Harness입니다.

`$spec` / `/telos:spec`이 승인된 목표를 정의합니다. `$run` / `/telos:run`은 설치된 스킬·플러그인·에이전트를 발견하고, 현재 작업에 필요한 Capability를 선택한 뒤 구현 → 테스트 → Eval → 재라우팅을 반복하여 Spec을 검증합니다.

## 설치

Node.js 20 이상이 필요합니다.

```bash
npx telos-kit install all
# 또는
npm install -g telos-kit
telos install all
```

`all` 대신 `codex` 또는 `claude`를 지정하면 한쪽만 설치합니다. 설치 후 해당 클라이언트를 재시작하세요.

## 워크플로우

```text
spec → run → eval
```

`run`은 로컬 `SKILL.md`를 발견하고 선언된 메타데이터를 기준으로 후보를 순위화합니다. 각 iteration은 `.telos/run-state.json`에 기록됩니다. 승인된 Spec과 저장소가 충돌하거나, 범위를 넓혀야 하거나, 필요한 Capability가 없거나, 반복 제한에 도달하면 사용자에게 방향을 요청합니다.

```bash
telos capabilities discover --project-root .
telos capabilities route --project-root . --need "database migration testing"
telos run status --project-root .
```

`$impl`과 `/telos:impl`은 기존 사용자를 위한 `run` 호환 별칭입니다.

## 개발

```bash
npm ci
npm test
npm run check:release
npm pack --dry-run
```

npm 패키지는 컴파일된 Node CLI와 Codex·Claude Code 플러그인 번들을 함께 배포합니다. GitHub Actions는 Node 20·22·24에서 테스트하고, release 시 provenance와 함께 npm에 배포합니다.
