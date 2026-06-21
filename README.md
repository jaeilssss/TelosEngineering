# Telos

Spec-first plugins for Codex and Claude Code.

Telos는 요구사항을 `SPEC.md` 계약으로 확정한 뒤 구현하고 평가하는 워크플로를 제공한다.

## 설치

Python 3.10 이상이 필요하다.

```bash
python3 -m pip install telos-kit
telos install codex
telos install claude
telos install all
```

기존 GitHub 설치 명령도 호환 래퍼로 유지한다.

```bash
bash install.sh codex
bash install.sh claude
bash install.sh all
```

업데이트는 패키지를 갱신한 뒤 원하는 키트를 다시 설치한다.

```bash
python3 -m pip install --upgrade telos-kit
telos install all
```

## Claude Code

Claude용 Telos는 `telos@telos-kit` 사용자 플러그인으로 설치된다. 설치 CLI는 로컬
marketplace를 `~/.telos/claude-marketplace`에 만들고 Claude Code에 등록한다.

```text
/telos:spec   소크라테스 인터뷰, 자동 모호성 점검, SPEC.md frozen
/telos:impl   frozen SPEC.md 기준 구현
/telos:eval   인수 기준 평가
```

플러그인은 두 개의 훅을 포함한다.

- `SessionStart`: Telos spec-first 규칙을 세션 컨텍스트에 추가
- `PostToolUse (Write|Edit)`: 코드 편집 후 `SPEC.md`가 없거나 draft이면 경고

훅 정의는 `~/.claude/settings.json`에 복사하지 않는다. Claude는 사용자 설정에 플러그인
활성화 상태만 기록한다. 이전 Telos 전역 설치가 있으면 Telos 소유 파일, CLAUDE.md 마커,
legacy `spec_gate.py` 훅만 제거하고 다른 사용자 설정은 보존한다.

## Codex

Codex용 Telos는 `telos@personal` 사용자 플러그인으로 설치된다.

```text
$spec   요구사항 인터뷰와 자동 모호성 점검
$impl   frozen SPEC.md 기준 구현
$eval   인수 기준 평가
```

플러그인의 `PostToolUse (Edit|Write)` 훅은 코드 편집 후 `SPEC.md` 상태를 확인한다. 최초
설치나 훅 변경 후 새 Codex 스레드에서 `/hooks`를 열어 Telos 훅을 검토하고 신뢰해야 한다.
훅은 경고만 표시하며 편집을 차단하지 않는다.

설치 위치:

```text
~/plugins/telos/
~/.agents/plugins/marketplace.json
```

## 버전

PyPI 패키지, Codex 플러그인, Claude 플러그인은 각각 버전을 가진다. 설치된 플러그인의
`.telos-version.json`에서 패키지 버전과 키트 버전을 확인할 수 있다.

## 배포

관리자는 `src/telos_kit/__init__.py`, `kit_versions.json`, 두 플러그인 manifest의 버전을
갱신하고 `v<패키지 버전>` GitHub Release를 발행한다. 배포 워크플로는 버전과 wheel을
검증하고 `kit_versions.json`을 Release에 첨부한 뒤 PyPI로 발행한다.

최초 배포 전에 PyPI의 `telos-kit` 프로젝트에 GitHub Trusted Publisher를 등록해야 한다.

```text
Repository: jaeilssss/telos
Workflow: publish.yml
Environment: pypi
```

## 비용

- 모호성 점검: Claude Haiku 또는 현재 세션의 저비용 Codex 서브에이전트
- 기계 검증: 테스트·린트·타입체크·빌드, LLM 비용 없음
- 의미 평가: Claude Sonnet 또는 Codex 평가 서브에이전트
- 교차 검증: 고위험 또는 불확실한 경우에만 선택적으로 수행
