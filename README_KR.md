# Telos

Codex와 Claude Code를 위한 spec-first 플러그인입니다.

Telos는 프로젝트 루트의 `SPEC.md`를 중심으로 다음 흐름을 추가합니다.

- 먼저 계약을 정의하고
- frozen spec 기준으로 구현하고
- 측정 가능한 인수 기준으로 평가합니다

이 저장소는 다음을 제공합니다.

- Python CLI 패키지: `telos-kit`
- Codex 플러그인
- Claude Code용 marketplace 번들

영문 문서는 [README.md](README.md)를 참고하세요.

## Telos가 하는 일

Telos는 세 가지 명령/스킬을 중심으로 동작합니다.

- `spec`: 요구사항을 명확히 하고 `SPEC.md`를 작성
- `impl`: frozen 상태의 `SPEC.md`를 기준으로 구현
- `eval`: 스펙의 인수 기준에 맞춰 구현을 검증

또한 frozen `SPEC.md` 없이 코드를 수정할 때 경고하는 비차단 훅도 설치합니다.

## 요구사항

- Python 3.10 이상
- Codex 플러그인 설치를 위한 Codex CLI
- Claude 플러그인 설치를 위한 Claude CLI / Claude Code

CLI가 없더라도 플러그인 파일 복사 자체는 수행하고, 수동 다음 단계만 안내합니다.

## 설치

먼저 PyPI에서 패키지를 설치합니다.

```bash
python3 -m pip install telos-kit
```

그 다음 플러그인을 설치합니다.

```bash
telos install codex
telos install claude
telos install all
```

이 저장소에는 GitHub 기반 설치용 셸 래퍼도 유지합니다.

```bash
bash install.sh codex
bash install.sh claude
bash install.sh all
```

이 래퍼는 가능하면 먼저 로컬 패키지를 설치하고, 이후 동일한 CLI 흐름을 실행합니다.

## 플러그인 설치 위치

### Codex

Codex 플러그인은 다음 위치에 설치됩니다.

```text
~/plugins/telos/
~/.agents/plugins/marketplace.json
```

설치 후에는 새 Codex 스레드를 시작하고 `/hooks`에서 Telos 훅을 검토하세요.

Codex에서의 명령 표면:

```text
$spec
$impl
$eval
```

### Claude Code

Claude marketplace 번들은 다음 위치에 설치됩니다.

```text
~/.telos/claude-marketplace/
```

사용자 플러그인 id는 다음과 같습니다.

```text
telos@telos-kit
```

Claude에서의 명령 표면:

```text
/telos:spec
/telos:impl
/telos:eval
```

설치 과정에서 Telos는 자신의 legacy Claude 전역 파일과 훅 항목만 제거하고, 관련 없는 사용자 설정은 유지합니다.

## 워크플로우

### 1. 스펙 작성 또는 보정

기능 작업은 먼저 spec 명령으로 시작합니다.

```text
$spec
/telos:spec
```

spec 흐름은 집중된 질문으로 요구사항을 정리하고 `SPEC.md`를 채운 뒤, 모호성 점검을 통과했을 때만 상태를 `frozen`으로 바꿉니다.

### 2. frozen spec 기준 구현

```text
$impl
/telos:impl
```

구현 흐름은 다음을 전제로 합니다.

- 현재 프로젝트 루트에 `SPEC.md`가 있어야 함
- 상태가 `frozen`이어야 함
- 인수 기준이 구현 가능한 수준으로 구체적이어야 함

### 3. 스펙 기준 평가

```text
$eval
/telos:eval
```

평가 흐름은 다음 순서로 진행됩니다.

1. 먼저 기계 검증
2. 인수 기준 기반 의미 평가
3. 고위험 또는 불확실한 경우 선택적 합의 검증

## 훅

Telos는 코드 편집에 대해 비차단 훅을 설치합니다.

동작:

- `SPEC.md`가 없으면 경고
- `SPEC.md`가 아직 `draft`면 경고
- 코드 파일이 아니면 아무 일도 하지 않음

이 훅은 안내용입니다. 편집을 막지 않습니다.

## 업데이트

업데이트에는 두 층이 있습니다.

1. `telos-kit` 패키지 업데이트
2. 사용자 환경에 설치된 플러그인 파일 재적용

### 현재 패키지 기준으로 플러그인 다시 적용

다음 명령을 사용합니다.

```bash
telos update codex
telos update claude
telos update all
```

`telos update`는 install 흐름을 재사용하며, 현재 설치된 `telos-kit` 패키지에 들어 있는 플러그인 파일을 다시 적용합니다.

### 최신 패키지로 올린 뒤 플러그인 다시 적용

먼저 최신 배포 패키지로 올리려면:

```bash
python3 -m pip install --upgrade telos-kit
telos update all
```

### 업데이트 상태 확인

다음 명령을 사용할 수 있습니다.

```bash
telos update-status codex
telos update-status claude
telos update-status all
telos update-status all --json
```

중요: `update-status`는 설치된 플러그인을 Telos 저장소 체크아웃에 기록된 버전과 비교합니다. 기본적으로 다음 파일을 찾습니다.

```text
./src/telos_kit/kit_versions.json
```

즉 이 명령은 현재 저장소에서 실행하거나, `--project-root`로 Telos 체크아웃 경로를 넘길 때 가장 유용합니다.

```bash
telos update-status all --project-root /path/to/telos
```

JSON 출력은 대상별 상태 객체 리스트입니다.

```json
[
  {
    "target": "codex",
    "status": "up-to-date",
    "installed_version": "0.4.0",
    "latest_version": "0.4.0",
    "update_available": false
  }
]
```

가능한 상태 값:

- `up-to-date`
- `update-available`
- `not-installed`
- `unknown`

## 버전 모델

Telos는 다음 버전을 분리해서 관리합니다.

- Python 패키지 버전
- Codex 플러그인 번들 버전
- Claude 플러그인 번들 버전

설치된 플러그인은 적용된 버전을 다음 파일에 기록합니다.

```text
.telos-version.json
```

이 저장소에서 패키징되는 플러그인 버전의 기준 파일은 다음입니다.

```text
src/telos_kit/kit_versions.json
```

## 저장소 구조

```text
src/telos_kit/
  cli.py
  installers.py
  update_status.py
  resources/
    codex/telos/
    claude-marketplace/plugins/telos/
tests/
install.sh
```

## 개발

패키지 테스트는 다음처럼 실행할 수 있습니다.

```bash
PYTHONPATH=src python3 -m unittest
```

작업 중에는 필요한 테스트만 좁게 실행해도 됩니다.

```bash
PYTHONPATH=src python3 -m unittest tests.test_cli tests.test_installers tests.test_update_status tests.test_versions
```

전역 설치 없이 저장소에서 직접 CLI를 실행하려면:

```bash
PYTHONPATH=src python3 -m telos_kit --version
PYTHONPATH=src python3 -m telos_kit install codex
```

## 배포 담당자 참고

새 버전을 발행할 때는 다음 버전 소스를 함께 맞춰야 합니다.

- `src/telos_kit/__init__.py`
- `src/telos_kit/kit_versions.json`
- Codex 플러그인 manifest 버전
- Claude 플러그인 manifest 버전

이 저장소에는 `scripts/` 아래에 배포 검증용 스크립트도 포함되어 있습니다.
