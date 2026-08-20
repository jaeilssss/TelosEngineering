# Spec: strengthen Telos contracts and evaluation

Status: `frozen`
Date: 2026-08-20
Spec baseline: `feat/telos-contract-evaluation` at `8df8c5b`

## 1. Goal

Make Telos record an implementation's allowed change surface and executable verification plan, then use those records to detect scope drift and optionally report avoidable complexity during evaluation.

## 2. Ontology

| Concept | Definition | Notes |
|---|---|---|
| Expected change surface | The files, dependency changes, and compatibility changes that an implementation may make. | An empty value means no expectation was set. |
| Verification plan | Project-specific commands and manual checks that demonstrate the acceptance criteria. | Commands may be Gradle, Maven, npm, Python, or any project command. |
| Lean pass | An optional, read-only evaluation for changes unrelated to acceptance criteria or avoidable complexity. | It never replaces correctness or security review. |
| Risk profile | A selected set of domain risks requiring explicit checks. | Auth, data migration, public API, payments/data deletion, concurrency. |
| Quick spec | A concise spec path for small, local, low-risk changes. | High-risk work must use the full spec flow. |
| Spec baseline | The Git revision and branch recorded when a spec is frozen. | It only triggers a re-confirmation recommendation when stale. |

## 3. Constraints

- Keep the existing `spec`, `impl`, and `eval` entry points; do not add lifecycle hooks or a persistent state store.
- Preserve project-agnostic verification: Java/Spring projects may record Gradle or Maven commands.
- Keep lean review optional and report-only.
- Do not weaken existing ambiguity, test-strategy, mechanical-check, or acceptance-criteria gates.
- Keep Codex and Claude skill/template copies aligned.

## 4. Test Strategy

Test strategy: test-after

## 5. Acceptance Criteria

- [x] AC1: The SPEC template records expected change surface and a project-specific verification plan.
- [x] AC2: The spec guidance records optional risk profiles, records a Git baseline when freezing, and defines a quick-spec path that is unavailable for high-risk work.
- [x] AC3: The implementation guidance maps changed files to acceptance criteria and flags changes outside the declared surface or a stale baseline for user confirmation.
- [x] AC4: The evaluation guidance executes recorded verification commands, evaluates declared scope, and can run an optional report-only lean pass.
- [x] AC5: Focused tests cover any changed executable validation or template-copy synchronization behavior.

## 6. Out of Scope

- Automatically running arbitrary commands from an untrusted SPEC without user/agent confirmation.
- Blocking edits through a new hook.
- Automatic source-code simplification or deletion.
- A separate plugin command dedicated only to lean review.

## 7. Open Questions

-
