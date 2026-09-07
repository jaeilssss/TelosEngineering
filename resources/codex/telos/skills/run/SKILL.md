---
name: run
description: "Orchestrate installed capabilities from a frozen SPEC.md until its acceptance criteria are verified. Use when the user writes $run or asks Telos to execute a spec-driven task."
---

# Telos V2 Run

Use the current project root's frozen `SPEC.md` as the goal contract. Telos owns the Spec and the final Eval; installed skills, plugins, and agents are replaceable capabilities used to achieve that contract.

## Preflight

1. Run `telos update-status codex --project-root .` when the `telos` CLI is available. Show an update recommendation before continuing when one is returned.
2. Read `SPEC.md`. Stop and direct the user to `$spec` if it is missing, draft, or has unresolved questions.
3. Inspect the relevant repository paths and the current worktree state before choosing capabilities.
4. Read the Spec baseline, Expected Change Surface, Verification Plan, Risk Profile, and acceptance criteria. If meaningful baseline drift exists, ask the user to reconfirm the spec before changing code.
5. When the `telos` CLI is available, run `telos capabilities discover --project-root . --json` and use its result as the installed-capability inventory. Start the auditable loop with `telos run start --project-root .` after selecting capabilities.

## Capability Discovery and Capability Router

1. Discover capabilities available in the current environment: use `telos capabilities discover --project-root . --json` for installed skills, plugins, and agents, then include the current session's own tools.
2. Describe each candidate by what it can do, not by its provider or name. Do not assume any particular external skill is installed or required.
3. Derive the minimum capabilities required by the current iteration from the Spec, repository, and prior failure evidence. Examples include implementation, stack-specific knowledge, testing, debugging, review, or migration safety.
4. Select only the capabilities relevant now. Keep the main session when the change is small and clear; delegate only when a capability or independent evidence-gathering pass materially helps.
5. Use `telos capabilities route --project-root . --need "..." --json` as a transparent metadata ranking aid. The agent must still judge suitability from the Spec and evidence; a keyword score alone cannot approve a selection.
6. Assemble a narrow context for every selected capability: frozen Spec, relevant files, repository instructions, current iteration state, and concrete failure evidence. Do not forward unrelated conversation history.

## Execution Loop

Maintain a compact iteration record containing the selected capabilities, changes made, verification evidence, failures, and next routing decision.

1. Execute the selected capability combination. Implement only what the acceptance criteria require, and map meaningful changes to those criteria.
2. Run the recorded project-specific verification plan and required risk checks. Do not run destructive, networked, or unclear commands without user confirmation.
3. Invoke `$eval` (or perform its same evidence-based gate when invoked as part of this run) against the frozen Spec.
4. Record the final Eval result with `telos run record --project-root . --status approved|rejected|uncertain|blocked --summary "..."`.
5. If final Eval is approved, report completion with acceptance-criteria evidence.
6. If final Eval is rejected or uncertain, analyze the failed evidence, then **Re-route**: select the minimum additional or replacement capabilities and run `telos run retry --project-root . --capability <id>` for the next iteration. Fix, test, and evaluate again.
7. Stop and ask for direction when the Spec conflicts with the repository, a required capability is unavailable, scope must expand, the CLI iteration limit is reached, or continued looping would not create new evidence.

## Rules

- Do not reimplement a capability merely because an installed skill can provide it.
- Do not load every installed skill. More skills are useful only when routing is accurate.
- External capabilities may be substituted at any iteration; Telos remains the final orchestrator.
- Preserve user changes and stay within Expected Change Surface. Route a scope conflict back to `$spec` rather than guessing.
- Keep implementation, test, and evaluation evidence distinct. An implementation capability does not approve its own result.

## Completion

Report the final status, selected capabilities by role, changed files, verification commands and results, acceptance-criteria evidence, and any unresolved risks. Do not claim completion until final Eval approves the frozen Spec.
