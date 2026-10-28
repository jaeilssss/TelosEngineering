# Spec: $spec Light Path for Small-Scope Work

Status: `frozen`
Date: 2026-10-25
Spec baseline: `feat/prd-spec-coverage` at `c1c70a3`
Discovery source: not used
Changes: not used

## 1. Goal
Add a self-classifying "light path" to the `$spec` skill so that small-scope work skips the ambiguity-check subagent (doing the same scoring inline instead) and never loads the PRD-linked sections (`PRD Coverage Review`, `SPEC Change Handling`, `PRD Traceability`), cutting subagent calls and prompt tokens for small tasks without changing behavior for PRD-linked or larger work.

## 2. Ontology
| Concept | Definition | Notes |
|---------|------------|-------|
| Light task | A task where the drafted SPEC has 2 or fewer acceptance criteria, an expected change surface of 3 or fewer files, and no source PRD | All three conditions must hold; estimated from the draft SPEC content, not the original user request |
| Heavy path | The current, unmodified `$spec` behavior: ambiguity check always via subagent; PRD Coverage Review, SPEC Change Handling, and PRD Traceability always evaluated when a source PRD exists | Default behavior when a task is not classified as light, or when classification is uncertain |
| Automatic classification | `$spec` evaluates the light-task conditions itself after the draft SPEC is complete, with no user action required | Applies every `$spec` invocation; not an opt-in flag |
| One-line notice | A single sentence telling the user the light path was taken, shown once per SPEC, before the ambiguity result | Lets the user immediately ask for the heavy path if the classification looks wrong |
| Inline ambiguity check | Computing `Ambiguity = 1 - (goal*0.4 + constraint*0.3 + success*0.3)` and applying the `<= 0.2` pass threshold directly in the main session instead of a subagent call | Same formula, same threshold, same "do not freeze if it fails" rule as the existing subagent check |
| PRD-linked sections | The `PRD Coverage Review`, `SPEC Change Handling`, and `PRD Traceability` instructions in `spec/SKILL.md`, which only apply when the SPEC has a source PRD | Moved to a separate reference file so they are not part of the always-loaded skill body |

## 3. Constraints
- Do not add a new slash command or a new skill (no new `SKILL.md`). The PRD-linked content moves to a plain reference file inside the existing `spec` skill directory, read only by instruction from `spec/SKILL.md`.
- Do not change `run/SKILL.md` or `eval/SKILL.md`. `eval` already has an equivalent "small, low-risk, evaluate in the current session" branch; `run` does not call its own subagent today, so neither needs a change for this goal.
- Do not change `discover/SKILL.md`, `PRD.template.md`, or `SPEC.template.md`.
- Do not change any `src/*.ts` CLI behavior or add new CLI commands.
- A source PRD always forces the heavy path. The light-task conditions never override PRD presence, so PRD Coverage Review and SPEC Change Handling can never be silently skipped on a PRD-linked SPEC.
- Existing heavy-path instruction text (ambiguity formula, pass threshold, PRD Coverage Review content, SPEC Change Handling content, PRD Traceability content) must be preserved in substance; this work relocates and gates it, it does not reword or weaken it.
- When classification is ambiguous (e.g., AC count or file count is a close call), default to the heavy path.

## 4. Test Strategy
Test strategy: TDD — mirror the existing `shared skills preserve Run and Eval workflow invariants` test in `src/core.test.ts` by adding `assert.match`/`assert.doesNotMatch` assertions for the new light-path phrasing and the reference-file split before editing the skill files.

## 5. Expected Change Surface
- allowed: `resources/shared/skills/spec/SKILL.md`, a new `resources/shared/skills/spec/references/prd-workflow.md`, `src/core.test.ts`
- excluded: `resources/shared/skills/run/**`, `resources/shared/skills/eval/**`, `resources/shared/skills/discover/**`, `resources/shared/skills/spec/assets/SPEC.template.md`, `resources/shared/skills/discover/assets/PRD.template.md`, any `src/*.ts` file other than `core.test.ts`, `package.json`, plugin manifests
- dependency/API/schema changes: none

## 6. Verification Plan
- `telos verify --changed --project-root .` for configured checks (`npm test`, `npm run check:release`).
- manual check: run `$spec` once on a trivial task (for example, renaming one constant) and confirm the light path is taken, the one-line notice appears, and no subagent is invoked for the ambiguity check.
- manual check: run `$spec` once referencing an existing PRD and confirm the heavy path still runs unchanged (ambiguity subagent, PRD Coverage Review, SPEC Change Handling all trigger).

## 7. Acceptance Criteria
- [ ] AC1: `spec/SKILL.md` states the light-task classification rule exactly as all three conditions together — AC count ≤ 2, expected change surface ≤ 3 files, no source PRD — and instructs performing the inline ambiguity check (same formula and `<= 0.2` threshold as the subagent version) when classified light.
- [ ] AC2: `spec/SKILL.md` instructs showing a one-line notice when the light path is taken, and instructs falling back to the heavy path (subagent ambiguity check) whenever classification is uncertain or any condition is not clearly met.
- [ ] AC3: `spec/SKILL.md` states that a source PRD always forces the heavy path regardless of AC or file count, so PRD-linked work is never misclassified as light.
- [ ] AC4: The `PRD Coverage Review`, `SPEC Change Handling`, and `PRD Traceability` sections are removed from the directly-loaded body of `spec/SKILL.md` and placed in `resources/shared/skills/spec/references/prd-workflow.md`, with `spec/SKILL.md` instructing to read that file only when the SPEC has a source PRD.
- [ ] AC5: The relocated PRD-linked content in `prd-workflow.md` is not a shortened summary: its word count for the three relocated sections is at least 90% of their combined word count in the pre-move `spec/SKILL.md`, and it still contains the three classification labels `covered`, `intentionally deferred`, `needs review`, and the duplicate-ownership sentence ("A SPEC that calls or depends on another SPEC's capability is a valid dependency, not a duplicate").
- [ ] AC6: `src/core.test.ts` contains assertions covering AC1–AC5, and `npm test` and `npm run check:release` both pass.

## 8. Out of Scope
- Changes to `run/SKILL.md` or `eval/SKILL.md`.
- A user-facing opt-in flag or slash-command argument to force one path.
- Numeric tuning of the thresholds after this SPEC ships; revisit in a follow-up SPEC if real usage shows the thresholds are wrong.
- Automated token/latency benchmarking of the light vs. heavy path.

## 9. Decisions
| Decision | Reason |
|---|---|
| Light-task thresholds fixed at AC ≤ 2, files ≤ 3, no source PRD | Concrete and grep-able in the skill text; avoids drift between what the SPEC says and what the skill actually checks |
| Classification is automatic, with a one-line notice | Captures savings on every applicable call while keeping the user able to correct a misclassification immediately |
| Scope limited to the `spec` skill only | `eval` already has an equivalent inline-vs-subagent branch; `run` has no subagent to skip for this goal |
| `PRD Traceability` bundled into the same reference file as `PRD Coverage Review` and `SPEC Change Handling` | All three share the same gating condition (requires a source PRD); one reference file avoids a second conditional-read instruction |

## 10. Open Questions
-
