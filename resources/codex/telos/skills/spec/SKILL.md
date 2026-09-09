---
name: spec
description: "Create or refine a SPEC.md contract before implementation. Use when the user writes $spec, asks to define requirements, wants a spec-first interview, or needs goals, constraints, ontology, and acceptance criteria clarified before coding."
---

# Spec Interview

Do not write implementation code while using this skill. Your job is to remove ambiguity and create a concrete `SPEC.md` in the current project root.

Treat this skill as the spec orchestrator. Keep the user questioning loop in the main session by default. Use a subagent only for narrow, high-noise exploration that can be returned as a small index, such as a terminology scan in a large repository, and still use the ambiguity-check subagent before freezing.

Treat the text after `$spec` as the initial task input. `$spec quick` is allowed only for a small, local, low-risk change; it creates the same contract with concise fields. Auth, payments, data deletion, database migrations, public API changes, concurrency, or unclear architecture must use the full interview.

## Workflow

1. Before the main workflow, run `telos update-status codex --project-root .` when the `telos` CLI is available. If it prints a message, show that update recommendation before continuing.
2. Ask 1-3 focused questions at a time.
3. Define ontology first: clarify the key nouns before discussing implementation.
4. Before drafting the spec, read the project's TDD decision guidance from `AGENTS.md` when it exists. If `AGENTS.md` is absent, decide from the nature of the work: default to `TDD` for bug fixes and behavior-changing code, use `test-after` when tests are still appropriate but writing them first would be inefficient, and use `none` only for work like docs or prompt text where tests are not a meaningful fit.
5. Decide and record `Test strategy` in `SPEC.md` as exactly one of `TDD`, `test-after`, or `none`. If you choose `none`, include the reason on the same line.
6. Fill the goal, constraints, test strategy, expected change surface, verification plan, risk profile, acceptance criteria, out-of-scope items, and open questions.
   - Use `.telos/project.yml` `risks[]` for project-specific mechanical risks. When it declares scopes, write `[scopes: name-a, name-b]` on a multi-scope AC and add one `- Evidence [name]: ...` line per scope.
   - Expected change surface names allowed files/areas and whether dependency, API, or schema changes are permitted.
   - Verification plan records the project's actual commands and manual checks. It is stack-neutral: for example, a Spring project may use `./gradlew test --tests ...` or `./mvnw test -Dtest=...`.
   - Select a risk profile only when applicable: auth/authorization, database migration, public API, payment/data deletion, or concurrency. Record the falsifying check for each selected risk.
7. If `Test strategy` is `TDD` or `test-after`, include an acceptance criterion that the related tests pass. If the task is a bug fix, also include an acceptance criterion requiring at least one regression test. If `Test strategy` is `none`, do not add those test criteria automatically.
8. Challenge one important assumption with a contrary case.
9. Continue until acceptance criteria are measurable and open questions are resolved.
10. Create `SPEC.md` using `assets/SPEC.template.md`.
11. If open questions remain, keep asking.
12. When open questions are exhausted, automatically run a low-cost ambiguity check with a subagent.
13. When freezing, record `Spec baseline` as the current branch and `git rev-parse HEAD`; use `not a Git repository` when unavailable. Set status to `frozen` only when the ambiguity check passes.

## Subagent Handoff

When you use a subagent for narrow repo exploration, keep the handoff narrow:

- initial user task
- relevant `AGENTS.md` guidance
- any existing `SPEC.md`
- the current list of open questions and resolved answers

Do not forward the whole conversation when a structured summary is enough. Relay user answers back to the worker as directly as possible; do not reinterpret them unless the user explicitly asks for reframing.

## Ambiguity Check

Use a narrow prompt for the subagent:

```text
You are a strict ambiguity evaluator. Read SPEC.md, score goal / constraint / success from 0.0 to 1.0, compute Ambiguity = 1 - (goal*0.4 + constraint*0.3 + success*0.3), and return pass only when Ambiguity <= 0.2. If open questions remain or the SPEC is vague, return retry with concrete evidence.
```

## Rules

- Keep acceptance criteria scoreable by `$eval`.
- Do not leave `Test strategy` blank. `none` is allowed only with an explicit reason.
- Do not mark vague specs as frozen.
- If the task is too small for a spec, say so and ask whether to continue without one.
- In quick mode, keep the same fields but use concise values. If a high-risk signal appears, stop quick mode and continue with the full interview.
- Do not use `frozen` as a placeholder. A status line like `Status: draft | frozen` is still draft.
- The ambiguity gate uses `Ambiguity <= 0.2` as the pass threshold.
- If the ambiguity check fails or cannot be parsed, return to questioning and do not freeze the SPEC.
- The ambiguity gate should use the lowest-cost available subagent path in the current Codex session.
