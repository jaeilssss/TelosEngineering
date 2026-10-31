# Spec: Edge-case discovery during SPEC interviews

Status: frozen
Date: 2026-10-31
Spec baseline: feat/eval-human-review-recommendations at 6e233eeedbbab912ca79d1844b63e2351ff40db9
Discovery source: not used
Changes: not used

## 1. Goal

During `$spec`, identify material edge cases for each Feature SPEC, ask the developer only for unresolved policy decisions, and record the resolved behavior so implementation and `$eval` share the same boundary conditions.

## 2. Expected Change Surface

- allowed: `resources/shared/skills/spec/SKILL.md`, `resources/shared/skills/spec/assets/SPEC.template.md`, `src/core.test.ts`
- excluded: runtime CLI behavior, run state, Eval workflow, `.telos/project.yml`, generated `dist/**`
- dependency/API/schema changes: none

## 3. Acceptance Criteria

- [ ] AC1: `$spec` requires an edge-case discovery pass before drafting each Feature SPEC and limits it to cases that can change observable behavior, policy, safety, data integrity, or verification.
- [ ] AC2: The pass checks relevant existing PRD decisions, code, tests, and repository documentation before asking questions, and distinguishes evidence-backed behavior from an unresolved policy decision.
- [ ] AC3: For unresolved material policies, `$spec` asks at most three focused question groups at a time and does not invent a business rule; ordinary low-risk or already-resolved cases do not create a question.
- [ ] AC4: Every drafted Feature SPEC records an `Edge Cases` section with scenario, expected behavior, resolution source, and verification; it explicitly states when no material edge cases apply.
- [ ] AC5: The discovery pass considers boundary values, empty or missing input, duplicate requests, ordering or retry behavior, authorization differences, state transitions, compatibility with existing data, and external failure only when relevant to the candidate.
- [ ] AC6: Regression tests pass and assert that the distributed `$spec` skill and SPEC template preserve the edge-case discovery and recording contract.

## 4. Verification Plan

- `telos verify --changed --project-root .`
- manual check: read the final `$spec` skill and template; verify a money or permission policy would prompt a focused question, while a resolved or irrelevant case is recorded without a question.

## 5. Test Strategy

Test strategy: test-after

## 6. Ontology

| Concept | Definition | Notes |
|---|---|---|
| Edge case | A boundary or exceptional situation that can change the requested behavior, policy, safety, data integrity, or verification. | It is not a generic list of all possible failures. |
| Evidence-backed behavior | An outcome supported by an approved PRD decision, existing code, test, or repository documentation. | Record its source. |
| Unresolved policy | An edge case where the expected behavior cannot be derived from evidence. | Ask the developer only when it is material. |
| Edge Cases section | A table in the Feature SPEC that records decided material edge cases or states that none apply. | It guides implementation and Eval. |

## 7. Constraints

- Keep the pass proportionate: simple text or presentation-only work may record no material edge cases.
- Treat concurrency, transaction, authorization, money, privacy, external effects, retries, data migration, and state transitions as prompts to inspect relevant edge cases, not proof that every category applies.
- Preserve the existing `$spec` question limit and question-group format.
- Keep unresolved behavior in Open Questions until the developer answers; do not freeze a SPEC with a material unresolved policy.
- Contrary case: a user-facing label change does not need speculative questions about duplicate requests or transaction rollback.

## 8. Out of Scope

- Automatic generation of tests or source-code fixes.
- A fixed risk score or a required minimum number of edge cases.
- Project-specific configuration for edge-case categories.
- Re-opening completed SPECs solely to add retrospective edge-case records.

## 9. Decisions

| Decision | Reason |
|---|---|
| Research existing evidence before asking the developer | Avoids repeating decisions already captured by the project. |
| Record only material cases | Keeps Feature SPECs concise and reviewable. |
| Require an explicit no-material-cases entry | Makes it clear that the pass occurred rather than being skipped. |

## 10. Open Questions

-
