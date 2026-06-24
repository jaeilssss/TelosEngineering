---
name: spec
description: "Create or refine a SPEC.md contract before implementation. Use when the user writes $spec, asks to define requirements, wants a spec-first interview, or needs goals, constraints, ontology, and acceptance criteria clarified before coding."
---

# Spec Interview

Do not write implementation code while using this skill. Your job is to remove ambiguity and create a concrete `SPEC.md` in the current project root.

Treat the text after `$spec` as the initial task input.

## Workflow

1. Before the main workflow, run `telos update-status codex --project-root .` when the `telos` CLI is available. If it prints a message, show that update recommendation before continuing.
2. Ask 1-3 focused questions at a time.
3. Define ontology first: clarify the key nouns before discussing implementation.
4. Before drafting the spec, read the project's TDD decision guidance from `AGENTS.md` when it exists. If `AGENTS.md` is absent, decide from the nature of the work: default to `TDD` for bug fixes and behavior-changing code, use `test-after` when tests are still appropriate but writing them first would be inefficient, and use `none` only for work like docs or prompt text where tests are not a meaningful fit.
5. Decide and record `Test strategy` in `SPEC.md` as exactly one of `TDD`, `test-after`, or `none`. If you choose `none`, include the reason on the same line.
6. Fill the goal, constraints, test strategy, acceptance criteria, out-of-scope items, and open questions.
7. If `Test strategy` is `TDD` or `test-after`, include an acceptance criterion that the related tests pass. If the task is a bug fix, also include an acceptance criterion requiring at least one regression test. If `Test strategy` is `none`, do not add those test criteria automatically.
8. Challenge one important assumption with a contrary case.
9. Continue until acceptance criteria are measurable and open questions are resolved.
10. Create `SPEC.md` using `assets/SPEC.template.md`.
11. If open questions remain, keep asking.
12. When open questions are exhausted, automatically run a low-cost ambiguity check with a subagent.
13. Set status to `frozen` only when the ambiguity check passes.

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
- Do not use `frozen` as a placeholder. A status line like `Status: draft | frozen` is still draft.
- The ambiguity gate uses `Ambiguity <= 0.2` as the pass threshold.
- If the ambiguity check fails or cannot be parsed, return to questioning and do not freeze the SPEC.
- The check should use the lowest-cost available subagent path in the current Codex session.
