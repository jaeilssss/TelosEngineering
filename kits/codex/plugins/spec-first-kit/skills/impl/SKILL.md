---
name: impl
description: "Implement strictly from a frozen SPEC.md. Use when the user writes $impl, asks Codex to implement a spec-first feature, or wants code changes driven by SPEC.md acceptance criteria."
---

# Spec Implementation

Use the current project root's `SPEC.md` as the implementation contract.

## Preflight

1. Read `SPEC.md` first.
2. Stop if `SPEC.md` is missing and tell the user to run `$spec`.
3. Stop if the status is `draft` or still contains a placeholder like `draft | frozen`.
4. Inspect the codebase before editing.

## Codex Model Policy

Use the model and reasoning level already selected for the current Codex session by default, but do not silently skip the model decision.

Before editing, classify the implementation:

- Routine: small, local, low-risk changes.
- Complex: broad design, migration, auth, payments, data loss risk, concurrency, or unclear architecture.

Then ask the user to choose before editing:

1. Continue in the current Codex session. Recommend this for routine work.
2. Stop so the user can restart Codex with a stronger model or higher reasoning profile, then rerun `$impl`. Recommend this for complex or high-risk work.
3. Cancel implementation.

Do not emulate Claude's Sonnet/Opus picker literally. In Codex, model selection is a session or CLI/app setting; the skill should make the decision explicit, but it should not pretend it can change the active model in-place.

## Implementation Rules

- Implement only what is required by the acceptance criteria.
- Keep changes surgical; do not refactor unrelated code.
- Do not add speculative features or broad abstractions.
- Map each meaningful change back to one or more acceptance criteria.
- Verify with the narrowest useful command first, then broader checks when relevant.
- Preserve user changes and do not revert unrelated work.

## Completion

Summarize changed files, verification commands, and which acceptance criteria are now covered. Tell the user to run `$eval` next.
