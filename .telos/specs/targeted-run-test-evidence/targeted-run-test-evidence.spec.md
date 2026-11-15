# Spec: Run-scoped targeted test evidence

Status: `frozen`
Date: 2026-11-15
Spec baseline: feat/targeted-run-test-evidence at 5dda5773b7f007612c9a7a2da4d352f9f5705d7d
Discovery source: `not used`
Changes: `not used`

## 1. Goal

Make a Telos Run record AC-linked test commands and their Red or Green outcome, so Eval can independently rerun only that Run's final Green tests instead of using `.telos/project.yml` to select a broad test suite.

## 2. Expected Change Surface

- allowed: `src/cli.ts`, `src/run-state.ts`, `src/verification.ts`, `src/core.test.ts`, `resources/shared/skills/run/SKILL.md`, `resources/shared/skills/eval/SKILL.md`, `resources/shared/skills/spec/SKILL.md`, `README.md`, `README_KR.md`
- excluded: dependency changes, generated `dist/**`, project-specific test-target configuration, CI workflow files
- dependency/API/schema changes: new Telos CLI subcommands and ignored Run-state fields are permitted; existing `telos verify --changed` behavior remains compatible

## 3. Acceptance Criteria

- [ ] AC1: `telos run test` records an active Run iteration's AC identifier, test identifier, command, and expected Red or Green outcome; it runs the command and accepts the outcome only when it matches the expectation.
- [ ] AC2: A Run cannot record duplicate or malformed test evidence, evidence for an inactive or mismatched SPEC, or a passing result when the command fails; recorded Green evidence remains available only for its active Run iteration.
- [ ] AC3: `telos verify --run-tests` reruns only the active iteration's recorded Green test commands, records a verification snapshot, reports the selected commands, and fails when any rerun fails.
- [ ] AC4: `telos verify --run-tests` does not run `.telos/project.yml` module `verify` commands; the existing `telos verify --changed` command keeps its current configured-module behavior.
- [ ] AC5: `$spec` requires each behavior-changing acceptance criterion to declare automated-test evidence or an explicit manual-verification reason; `$run` records Red then Green for `TDD`, records Green for `test-after`, and does not treat `none` as valid for behavior-changing work.
- [ ] AC6: `$eval` uses `telos verify --run-tests` exactly once for an active Run, rejects or marks uncertain a behavior-changing criterion without its required automated or explicit manual evidence, and still performs scope evidence, semantic evaluation, and Human review.
- [ ] AC7: Regression tests cover Red and Green evidence recording, malformed or inactive-run rejection, targeted rerun selection and failure, legacy configured verification compatibility, and distributed skill wording.

## 4. Verification Plan

- `npm test`
- `npm run check:release`
- manual check: create an active Run with two Green test commands and one Red command, then confirm `telos verify --run-tests` reruns exactly the two Green commands.

## 5. Test Strategy

Test strategy: TDD

## 6. Ontology

| Concept | Definition | Notes |
|---|---|---|
| Test evidence | An AC-linked command and its observed Red or Green outcome in an active Run iteration. | It is ignored runtime state, not project configuration. |
| Red evidence | A test command expected to fail before an implementation change. | Eval does not rerun Red evidence. |
| Green evidence | A test command expected to pass after an implementation change. | Eval reruns this command. |
| Targeted verification | Rerunning only the active iteration's Green evidence through `telos verify --run-tests`. | It does not select tests from `project.yml`. |
| Manual evidence | A specific, reproducible non-automated verification procedure and observed result. | It is allowed only when recorded in the SPEC with a reason. |

## 7. Constraints

- Keep evidence in the existing ignored `.telos/runs/` state and bind it to the active SPEC hash and iteration.
- Execute recorded commands with the same permission model and timeout behavior as existing configured verification commands.
- Do not infer tests from filenames or silently fall back to a full suite.
- Preserve `.telos/project.yml` for legacy configured checks, risks, and scopes; it must not be required to map source files to test classes.
- A changed test file alone is not sufficient evidence: Eval must inspect whether its assertions support the linked AC.
- Test deletion or assertion weakening around a behavior-changing AC is evaluation evidence and must not be treated as new Green proof.
- Contrary case: a Run whose only recorded Green command is unrelated to AC1 cannot approve AC1 merely because the command passes.

## 8. Edge Cases

| Scenario | Expected behavior | Resolution source | Verification |
|---|---|---|---|
| A Red command succeeds | Reject the evidence record because its outcome contradicts TDD Red. | AC1 | CLI test |
| A Green command fails | Reject the evidence record and do not make it available to Eval. | AC1, AC2 | CLI test |
| The same command is recorded twice for one AC and iteration | Reject the duplicate to keep Eval's test set deterministic. | AC2 | CLI test |
| A Run moves to the next iteration | Previous iteration evidence is not selected by targeted verification. | AC2, AC3 | CLI test |
| A behavior criterion has no test evidence | Eval rejects or reports uncertain unless the frozen SPEC states a concrete manual procedure and result. | AC5, AC6 | skill regression test |
| No active Run exists | `telos verify --run-tests` fails clearly rather than using configured module tests. | AC3 | CLI test |

## 9. Out of Scope

- Running all historical tests locally or in Eval.
- CI workflow creation or modification.
- Source-to-test dependency analysis or filename-based test discovery.
- Test coverage measurement.
- Persisting human-review acknowledgments.

## 10. Decisions

| Decision | Reason |
|---|---|
| Store explicit test commands in Run state | Eval can rerun exact evidence without per-file project configuration or heuristic discovery. |
| Run tests in both Run and Eval | Run establishes Red/Green feedback; Eval independently verifies final Green evidence. |
| Keep broad regression testing in CI | Fast local Run/Eval feedback should not be replaced by expensive whole-suite execution. |
| Preserve `verify --changed` | Existing projects retain their configured mechanical verification workflow while targeted verification is adopted deliberately. |

## 11. Open Questions

-
