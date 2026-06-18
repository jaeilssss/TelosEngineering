# Spec-First Kit

우로보로스의 **명세 우선** 방법론 핵심을 Claude Code와 Codex에 설치하기 쉽게 묶은 키트.

## 구조

```
kits/
  claude-code/   Claude Code 전역 설치판
  codex/         Codex 전역 플러그인 설치판
```

## 설치

원하는 대상만 설치한다.

```bash
bash install.sh claude
bash install.sh codex
bash install.sh all
```

## Claude Code 설치판

`bash install.sh claude`는 Claude Code 사용자 레벨(`~/.claude/`)에 설치한다. 어떤 레포도
직접 수정하지 않고 회사·개인 프로젝트 전부에 자동 적용된다.

설치 위치:

```text
~/.claude/
  CLAUDE.md                 전역 규칙 (모든 프로젝트에 적용)
  SPEC.template.md          계약 문서 템플릿
  skills/spec/SKILL.md      /spec  — 소크라테스식 인터뷰
  skills/impl/SKILL.md      /impl  — 모델 선택 후 서브에이전트 구현
  skills/eval/SKILL.md      /eval  — 3단계 평가 게이트
  agents/spec-evaluator.md  Stage 2 의미 평가 (Sonnet)
  settings.json             PostToolUse 훅
  scripts/spec_gate.py      $0 게이트 (작업 중인 프로젝트의 SPEC.md 를 확인)
  scripts/ambiguity_score.py (선택) 모호성 자동 채점 (Haiku)
```

> 기존에 `~/.claude/CLAUDE.md` 나 `settings.json` 이 있으면 install.sh 가 덮어쓰지 않는다.
> CLAUDE.md 는 끝에 append, settings.json 은 `settings.json.spec-first` 로 따로 떨궈 수동 병합을 안내한다.

설치 후 **Claude Code 세션을 완전히 재시작**한다. `/clear` 로는 settings/hook 이 다시 로드되지 않는다.

## Codex 설치판

`bash install.sh codex`는 Codex 사용자 전역 플러그인을 설치한다.

여기서 플러그인 source는 로컬 파일(`~/plugins/spec-first-kit`)이지만, `codex plugin add`로
사용자 전역에 설치되므로 새 Codex 세션 전반에서 사용할 수 있다.

설치 위치:

```text
~/plugins/spec-first-kit/             전역 플러그인의 로컬 소스
~/.agents/plugins/marketplace.json    개인 marketplace 등록
```

설치 스크립트는 가능하면 `codex plugin add spec-first-kit@personal`까지 실행한다. 실패하면 같은
명령을 직접 실행하면 된다. 설치 후에는 새 Codex 스레드를 열어 플러그인 스킬을 로드한다.

## 사용 흐름

작업할 프로젝트 디렉터리에서:

```
$spec  "주문 목록 API 를 만들고 싶어"   # 질문으로 모호함 제거 → 프로젝트 루트에 SPEC.md 생성
$impl                                   # SPEC.md 기준 구현
$eval                                   # 인수 기준 채점
# 실패 항목 되먹이고 $impl → $eval … 수렴까지 반복
```

Claude Code와 Codex 모두 스킬 기반이다.
Claude Code에서는 기존 Claude UX에 맞춰 `/spec`, `/impl`, `/eval`로 사용하고,
Codex에서는 전역 플러그인 스킬인 `$spec`, `$impl`, `$eval`로 사용한다.

SPEC.md 는 **각 프로젝트 루트**에 생긴다.

## 동작 범위 / 끄기

- Claude Code 설치판은 전역 규칙과 PostToolUse 훅을 설치한다. 단, **게이트 훅은 차단이 아니라 경고**라
  일회성 스크립트·탐색 작업이면 그냥 무시하고 진행해도 된다.
- 특정 Claude 프로젝트에서 전역 규칙을 덮고 싶으면, 그 프로젝트 루트에 `CLAUDE.md` 를 두면
  프로젝트 설정이 우선한다.
- Codex 설치판을 빼려면 `codex plugin remove spec-first-kit` 실행 후 `~/plugins/spec-first-kit`와
  `~/.agents/plugins/marketplace.json`의 해당 entry를 제거한다.
- Claude Code 설치판을 완전히 빼려면: `~/.claude/skills/{spec,impl,eval}/`, `~/.claude/agents/spec-evaluator.md`,
  `~/.claude/scripts/{spec_gate,ambiguity_score}.py`, `SPEC.template.md` 삭제 +
  `settings.json` 의 해당 훅 제거 + CLAUDE.md 의 appended 블록 삭제.

## 토큰 비용 레버

- Stage 1(테스트·린트)은 LLM 0원으로 먼저 거른다.
- 채점 Haiku / 의미 평가 Sonnet / Opus 는 정말 어려운 추론에만.
- Consensus 기본 OFF, 고위험·불확실 시에만.
- 무한 진화 루프 없음 — 간단한 작업엔 가볍게.

## 커스터마이즈

- Claude Code: `~/.claude/skills/eval/SKILL.md` 의 Stage 1 명령을 본인 스택 명령으로 교체.
- `~/.claude/agents/spec-evaluator.md` 의 `model:` 티어 조정.
- 게이트를 강제 차단형으로 바꾸려면 `spec_gate.py` 가 exit code 로 거부하도록 수정(주의).
- Codex: `~/plugins/spec-first-kit/skills/{spec,impl,eval}/SKILL.md` 를 수정한 뒤
  `codex plugin add spec-first-kit@personal`로 다시 설치.
