# Spec: Durable Multi-SPEC Work State, Phase 3

Status: `frozen`
Date: 2026-09-09
Spec baseline: `docs/readme-v2` at `343c54d`

## 1. Goal

Allow Telos to run, resume, unblock, and audit multiple feature contracts independently by an explicit SPEC slug, without committing a developer-specific active-work pointer.

## 2. Ontology

| Concept | Definition |
|---|---|
| SPEC slug | A non-empty lowercase identifier containing letters, numbers, and hyphens. |
| Feature SPEC | `.telos/specs/<slug>/SPEC.md`, committed project contract. |
| Run state | `.telos/runs/<slug>.json`, local state for one feature SPEC. |
| Spec hash | SHA-256 of the Feature SPEC content when a run starts or resumes. |
| Eval report | `.telos/evals/<slug>/<iteration>.md`, local Markdown record of an Eval result. |
| Unblock | Explicit user-directed transition from `blocked` to `running` for the same slug. |

## 3. Constraints

- Keep `.telos/project.yml` and Feature SPECs versioned; ignore `runs/`, `evals/`, and the legacy `run-state.json`.
- Require `--spec <slug>` for every state-mutating `telos run` command. Record the selected slug in committed `.telos/active` so hooks can inspect the active Feature SPEC.
- Detect a changed SPEC hash before retry, record, or unblock. Do not silently continue an old run against a changed contract.
- Preserve the existing root `SPEC.md` workflow only for non-mutating compatibility commands; new runs use feature SPECs.
- Eval reports start as Markdown and contain slug, iteration, status, summary, SPEC hash, and timestamp.

## 4. Test Strategy

Test strategy: TDD

## 5. Expected Change Surface

- allowed: `src/run-state.ts`, `src/cli.ts`, `src/core.test.ts`, `.gitignore`, README files, bundled Run/Eval/Spec instructions, and a committed Phase 3 SPEC.
- excluded: verifier/risk behavior, installers, capability routing, CI, npm versioning, and bundle source architecture.
- API changes: `telos run start|status|retry|record|unblock --spec <slug>`; state becomes per-slug.

## 6. Verification Plan

- `npm test`
- `npm run check:release`
- `npm pack --dry-run --cache /private/tmp/telos-npm-cache`
- Manual: create two Feature SPECs, run both, alter one SPEC, and confirm only its run is blocked by hash mismatch.

## 7. Risk Profile

- public API: invalid/missing slug and legacy state paths fail clearly without overwriting another slug's state.
- contrary case: two developers work on different feature contracts in one checkout; their state files must not collide.

## 8. Acceptance Criteria

- [x] AC1: Feature SPECs live at `.telos/specs/<slug>/SPEC.md`; invalid or missing slugs fail clearly.
- [x] AC2: Every mutating run command requires `--spec`, and per-slug state is stored at `.telos/runs/<slug>.json` without affecting another slug.
- [x] AC3: State records a SPEC hash and blocks retry, record, or unblock if the Feature SPEC content changed.
- [x] AC4: `telos run unblock --spec <slug> --summary <text>` resumes only a blocked, hash-matching state and records the reason.
- [x] AC5: Each recorded Eval result writes a Markdown report under `.telos/evals/<slug>/<iteration>.md` with required metadata.
- [x] AC6: `.gitignore` excludes local run/eval artifacts; README and both harness bundles document explicit `--spec` use.
- [x] AC7: Tests cover two independent slugs, invalid slugs, hash mismatch, unblock, report generation, and all related tests pass.

## 9. Out of Scope

- Automatic SPEC selection, report JSON schemas, CI/PR comments, and installer hardening.

## 10. Open Questions

- None.
