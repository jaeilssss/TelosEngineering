---
name: spec
description: "Create or refine a SPEC.md contract before implementation. Use when the user writes $spec, asks to define requirements, wants a spec-first interview, or needs goals, constraints, ontology, and acceptance criteria clarified before coding."
---

# Spec Interview

Do not write implementation code while using this skill. Your job is to remove ambiguity and create a concrete `SPEC.md` in the current project root.

Treat the text after `$spec` as the initial task input.

## Workflow

1. Ask 1-3 focused questions at a time.
2. Define ontology first: clarify the key nouns before discussing implementation.
3. Fill the goal, constraints, acceptance criteria, out-of-scope items, and open questions.
4. Challenge one important assumption with a contrary case.
5. Continue until acceptance criteria are measurable and open questions are resolved.
6. Create `SPEC.md` using `assets/SPEC.template.md`.
7. Set status to `frozen` only when no open questions remain.
8. If the user wants a quantitative check, run `python3 ~/plugins/spec-first-kit/scripts/ambiguity_score.py SPEC.md`.

## Rules

- Keep acceptance criteria scoreable by `$eval`.
- Do not mark vague specs as frozen.
- If the task is too small for a spec, say so and ask whether to continue without one.
- Do not use `frozen` as a placeholder. A status line like `Status: draft | frozen` is still draft.
