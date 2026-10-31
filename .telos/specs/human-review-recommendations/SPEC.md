# Spec: Risk-based human review recommendations

Status: frozen
Date: 2026-10-31
Spec baseline: feat/prd-spec-coverage at 98b5bdbc765dc427b3f3e1e45a6c249de8c1d6fa
Discovery source: `.telos/discoveries/human-review-recommendations/PRD.md` (approved)
Changes: not used

## 1. Goal

After `$eval` approves a Feature SPEC run, Telos recommends only high-signal locations in that run's uncommitted Git worktree diff for human review, so developers can focus on consequential code changes without adding a review-approval workflow.

## 2. Expected Change Surface

- allowed: `resources/shared/skills/run/SKILL.md`, `src/core.test.ts`
- excluded: `src/**` production behavior, CLI commands, run-state schema, `.telos/project.yml`, external Git-hosting integrations, generated `dist/**`
- dependency/API/schema changes: none

## 3. Acceptance Criteria

- [ ] AC1: The `$run` completion instructions require a post-approval review-recommendation pass over the current uncommitted Git worktree diff, including staged changes, and identify only locations changed by that run.
- [ ] AC2: The instructions define an advisory Markdown table with priority, file and symbol-or-line location, matched signal, human-review reason, and review focus; rows at the same location combine signals and are ordered by priority.
- [ ] AC3: The instructions cover concurrency or idempotency, transaction or persistence, business policy, authorization, irreversible state, external effects, privacy, public contract or dependency changes, behavior-bearing deletion, and risk-area test-only changes; `critical` requires both high-impact domain and failure-prone mechanism.
- [ ] AC4: The instructions use active-SPEC vocabulary and changed public or state-changing code as optional business-rule evidence, label uncertain heuristic findings, avoid generic filename/length/keyword-only findings, and state that no findings is not a guarantee that review is unnecessary.
- [ ] AC5: The instructions never block or alter the Eval result, collect reviewer identity, persist acknowledgment, or require project-specific configuration in this version.
- [ ] AC6: Regression tests pass and assert that the distributed `$run` skill retains the required advisory review-recommendation contract.

## 4. Verification Plan

- `telos verify --changed --project-root .`
- manual check: inspect the final `$run` completion instructions and confirm each table field, signal family, advisory constraint, and no-findings disclaimer is explicit.

## 5. Test Strategy

Test strategy: test-after

## 6. Ontology

| Concept | Definition | Notes |
|---|---|---|
| Review recommendation | A non-blocking request for human judgment about a changed location. | It is not a defect finding or an approval record. |
| Risk signal | An explainable change pattern that warrants human review. | A signal can be heuristic and may be uncertain. |
| Critical | The highest advisory priority. | Requires a high-impact domain plus a failure-prone mechanism. |
| Changed location | A function, method, symbol, or diff line range in the current run's uncommitted worktree diff. | Use the most precise stable location available. |
| Business-rule evidence | Active-SPEC vocabulary combined with changed public interfaces or state-changing code. | No project configuration is required initially. |

## 7. Constraints

- Apply the recommendation pass only after `$eval` has approved the iteration.
- Use the same current uncommitted worktree diff, including staged changes, that the final verification concerns.
- Keep Eval as the only approval/rejection/uncertainty authority.
- Do not create a reviewer-acknowledgment state or a required review gate.
- Do not claim that a human has reviewed a change.
- Contrary case: a function named `retry` in a test helper is not enough to recommend concurrency review; a recommendation needs changed behavior or explicit risk-area test coverage.

## 8. Out of Scope

- Pull-request, commit-range, or CI diff support.
- Automatic AST parsing for every supported language.
- Project-specific signal configuration.
- Human reviewer assignment, identity, acknowledgment, or enforcement.
- Automatically changing source code in response to a recommendation.

## 9. Decisions

| Decision | Reason |
|---|---|
| Analyze the uncommitted worktree diff, including staged changes | Aligns the recommendation scope with `$eval`'s changed-worktree verification. |
| Keep all priorities advisory | Preserves existing completion semantics and avoids approval-state design. |
| Implement the first version as `$run` skill guidance with regression coverage | Telos's workflow behavior is defined by its distributed skills; no CLI or state change is needed. |

## 10. Open Questions

-
