---
description: "Telos V2 호환 진입점. frozen SPEC.md 실행을 /telos:run으로 라우팅"
aliases: [implement, 구현]
---

# Compatibility: Impl → Run

기존 사용자를 위해 `/telos:impl`을 유지한다. Telos V2의 실행 진입점은 `/telos:run`이다.

frozen `SPEC.md`를 읽고 `/telos:run`의 전체 흐름을 따른다. 즉, 사용 가능한 Capability를 발견하고 현재 iteration에 필요한 것만 선택한 뒤 실행·검증하고 final Eval 게이트까지 진행한다. 구현 완료만으로 작업을 완료 처리하지 않는다.

새 워크플로우에서는 `/telos:run`을 안내한다.
