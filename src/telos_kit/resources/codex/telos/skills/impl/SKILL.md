---
name: impl
description: "Implement strictly from a frozen SPEC.md. Use when the user writes $impl, asks Codex to implement a spec-first feature, or wants code changes driven by SPEC.md acceptance criteria."
---

# Spec Implementation

Use the current project root's `SPEC.md` as the implementation contract.

Treat this skill as the implementation orchestrator. Keep implementation in the main session by default. Use a fresh implementation worker subagent only when the task requires high-noise exploration, such as a large search surface, unclear impact radius, or broad acceptance-criteria-to-code mapping.

## Preflight

1. Run `telos update-status codex --project-root .` when the `telos` CLI is available. If it prints a message, show that update recommendation before continuing.
2. Read `SPEC.md` first.
3. Stop if `SPEC.md` is missing and tell the user to run `$spec`.
4. Stop if the status is `draft` or still contains a placeholder like `draft | frozen`.
5. Inspect the codebase before editing.

## Codex Model Policy

Use the model and reasoning level already selected for the current Codex session by default, but do not silently skip the model decision.

Before editing, classify the implementation:

- Use `SPEC.md` for the first-pass scope and risk read.
- Then inspect the actual codebase to confirm or correct that read before deciding whether the work is routine or complex.
- Routine: small, local, low-risk changes.
- Complex: broad design, migration, auth, payments, data loss risk, concurrency, or unclear architecture.

Then ask the user to choose before editing:

1. Continue in the current Codex session. Recommend this for routine work.
2. Stop so the user can restart Codex with a stronger model or higher reasoning profile, then rerun `$impl`. Recommend this for complex or high-risk work.
3. Cancel implementation.

Do not emulate Claude's Sonnet/Opus picker literally. In Codex, model selection is a session or CLI/app setting; the skill should make the decision explicit, but it should not pretend it can change the active model in-place.

## Implementation Rules

- Use a fresh worker subagent only when multi-agent tools are available and the implementation would otherwise leave a large trail of low-value search state in the main context.
- Give the worker only the context needed to implement:
  - the frozen `SPEC.md`
  - relevant code paths
  - repository constraints from `AGENTS.md`
  - any known dirty-worktree constraints that affect touched files
- Do not dump the whole prior conversation into the worker unless a specific nuance is not captured in `SPEC.md`.
- When the code path is already clear and the change is small or local, implement directly in the main session instead of spawning a worker.
- Implement only what is required by the acceptance criteria.
- Keep changes surgical; do not refactor unrelated code.
- Do not add speculative features or broad abstractions.
- Map each meaningful change back to one or more acceptance criteria.
- Verify with the narrowest useful command first, then broader checks when relevant.
- Preserve user changes and do not revert unrelated work.

## Worker Output Contract

Require the worker to return:

- requirements summary
- confirmed decisions
- current plan and execution status
- changed files
- acceptance-criteria coverage
- relevant paths or code locations inspected
- verification commands run
- blocked questions, if any
- verification gaps, if any
- handoff files or artifacts for the next step
- commit reference, when a commit exists

If the worker reports a spec conflict or missing acceptance detail, stop and route that back to `$spec` instead of silently guessing.

Keep the main-session return compact. Do not dump long exploration logs or full file contents when a short structured summary and file index are enough for the next instruction.

## Completion

Summarize changed files, verification commands, and which acceptance criteria are now covered. Tell the user to run `$eval` next.
