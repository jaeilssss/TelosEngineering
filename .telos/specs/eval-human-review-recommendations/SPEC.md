# Spec: Eval-owned human review recommendations

Status: frozen
Date: 2026-10-31
Spec baseline: feat/prd-spec-coverage at 98b5bdbc765dc427b3f3e1e45a6c249de8c1d6fa
Discovery source: `.telos/discoveries/human-review-recommendations/PRD.md` (approved)
Changes: `.telos/specs/human-review-recommendations/SPEC.md`

## 1. Goal

Make `$eval` produce the advisory, risk-based human-review recommendation table from the current worktree diff after successful mechanical verification, including when `$eval` runs by itself, while `$run` forwards that one result without performing a duplicate scan.

## 2. Expected Change Surface

- allowed: `resources/shared/skills/eval/SKILL.md`, `resources/shared/skills/run/SKILL.md`, `src/core.test.ts`
- excluded: `src/**` production behavior, CLI commands, run-state schema, `.telos/project.yml`, external Git-hosting integrations, generated `dist/**`
- dependency/API/schema changes: none

## 3. Acceptance Criteria

- [ ] AC1: After successful mechanical verification, `$eval` completes the SPEC acceptance-criteria evaluation first, then performs a separate recommendation pass on the current uncommitted staged and unstaged worktree diff, and reports the verdict with its advisory recommendations.
- [ ] AC2: `$eval` defines the same actionable table contract and risk-signal taxonomy as the completed human-review-recommendations SPEC, including the `critical` condition, active-SPEC vocabulary evidence, heuristic labeling, and no-findings disclaimer.
- [ ] AC3: `$run` treats `$eval` as the sole producer of the table, includes that result once in its final completion handoff, and does not independently rescan or duplicate the table.
- [ ] AC4: The table remains advisory for every Eval verdict and never changes the verdict, blocks completion, records reviewer identity or acknowledgment, or requires project-specific configuration.
- [ ] AC5: Regression tests pass and assert that the distributed `$eval` skill contains the review-recommendation contract and the distributed `$run` skill delegates to it.
- [ ] AC6: The recommendation instructions require relevant surrounding code, callers, and tests to be inspected while anchoring each row to a changed location; confirmed defects go through the existing Eval decision rules and cannot be downgraded to advisory-only findings.

## 4. Verification Plan

- `telos verify --changed --project-root .`
- manual check: read the final `$eval` and `$run` instructions to confirm standalone Eval output and one-table Run handoff behavior.
- manual check: confirm that a proven duplicate-payment defect is handled by the existing Eval decision rules, while an unresolved operational retry-policy question can appear as an advisory recommendation; confirm that a transaction-boundary recommendation considers relevant callers and tests rather than only changed lines.

## 5. Test Strategy

Test strategy: test-after

## 6. Ontology

| Concept | Definition | Notes |
|---|---|---|
| Eval-owned recommendation | The canonical advisory review output produced during `$eval`. | It is available in standalone Eval and forwarded by Run. |
| Forwarded recommendation | Eval-owned table included once in a `$run` completion handoff. | Run does not recompute it. |
| Mechanical verification success | A passing `telos verify --changed` result. | A failed mechanical check preserves Eval's existing early-stop behavior. |
| Final Eval verdict | `approved`, `rejected`, or `uncertain`. | Review recommendations do not alter it. |

## 7. Constraints

- Preserve Eval's existing requirement to stop and report when mechanical checks fail.
- Use the same current worktree diff that Eval already evaluates against Expected Change Surface.
- Use the diff as the starting point, then inspect relevant surrounding code, callers, and tests to understand the behavior; report recommendations at changed locations.
- Complete AC evaluation before the separate recommendation pass. If that pass uncovers new evidence of a defect, apply the existing Eval decision rules before reporting the final verdict; advisory status must not suppress a correctness finding.
- Keep the prior completed SPEC as historical evidence; do not revise it.
- Do not add CLI commands, persistent state, reviewer workflow, or configuration.
- Contrary case: when `$run` invokes `$eval`, emitting the table in both the Eval section and a second Run scan is duplicate output and must not occur.

## 8. Out of Scope

- Showing recommendations after a failed mechanical verification.
- PR, commit-range, or CI diff support.
- Reviewer assignment, acknowledgment, or enforcement.
- Automatic fixes based on a recommendation.

## 9. Decisions

| Decision | Reason |
|---|---|
| `$eval` owns risk-based recommendation generation | Eval already reads the diff and is usable as a standalone workflow. |
| `$run` forwards rather than regenerates the table | Prevents duplicate reports and keeps criteria in one canonical place. |
| Produce recommendations for all semantic verdicts after mechanical success | A rejected or uncertain implementation can still contain a consequential change worth human attention. |
| Evaluate acceptance criteria before extracting review candidates | Keeps the correctness evaluation focused while retaining a separate human-judgment pass. |
| Preserve defect handling and inspect surrounding context | Prevents confirmed defects from being treated as optional review and avoids judging transactions or concurrency from isolated changed lines. |

## 10. Open Questions

-
