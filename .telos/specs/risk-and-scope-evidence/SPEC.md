# Spec: Risk Checks and Scope Evidence, Phase 2

Status: `frozen`
Date: 2026-09-09
Spec baseline: `docs/readme-v2` at `98fedb5` (with the uncommitted Phase-1 verification implementation as a required dependency)

## 1. Goal

Make Telos reject mechanically detectable project risks and prevent a scope-tagged acceptance criterion from being approved without one recorded evidence item for every declared scope.

## 2. Ontology

| Concept | Definition | Notes |
|---|---|---|
| Risk check | A project-defined shell command that runs only when changed paths match its `when` patterns. | It is trusted repository configuration. |
| `fail_when: found` | A risk-check command where exit code `0` means the prohibited condition was found and must reject verification. | Exit code `1` means no finding; other codes are execution errors. |
| `fail_when: nonzero` | A risk-check command where any non-zero exit code rejects verification. | Use for ordinary validators. |
| Scope | A project-defined coverage dimension such as `ios`, `android`, `free`, or `pro`. | Its meaning remains project-owned. |
| Scoped AC | An acceptance-criterion line tagged as `[scopes: scope-a, scope-b]`. | Every tag must be declared in `project.yml`. |
| Scope evidence | A non-empty Markdown line in the form `- Evidence [scope-name]: <evidence>` below its scoped AC. | It proves recorded coverage, not the truth of the evidence. |
| Evidence check | The deterministic CLI check that validates scope declarations and evidence coverage. | Semantic correctness remains the Eval gate's responsibility. |

## 3. Constraints

- Build on the uncommitted Phase-1 `verification.ts` and `telos verify --changed` implementation; Phase 1 must be committed before Phase 2 is released.
- Preserve Node.js 20+ support and add no runtime dependency solely for YAML, glob, or Markdown parsing.
- `risks` and `scopes` are optional in `.telos/project.yml`; projects using only Phase-1 modules retain Phase-1 behavior.
- Execute only risks whose `when` patterns match changed tracked paths. Execute matching risks in configuration order after module verification succeeds.
- A risk failure, an invalid risk definition, an undeclared scope tag, malformed scope syntax, or missing/empty evidence must produce a clear non-zero result.
- Do not treat syntactically present evidence as semantic approval. The final Eval must inspect evidence before approval.
- Update Codex and Claude Code bundled SPEC/Eval instructions with equivalent behavior, despite their current separate source files.
- Do not add CI execution of untrusted pull-request-modified `project.yml` commands.

## 4. Test Strategy

Test strategy: TDD

## 5. Expected Change Surface

- allowed: `src/verification.ts`, `src/cli.ts`, `src/core.test.ts`, `.telos/project.yml`, `README.md`, `README_KR.md`, both bundled `skills/spec/SKILL.md`, `skills/eval/SKILL.md`, and SPEC templates under `resources/codex/` and `resources/claude-marketplace/`.
- excluded: capability discovery/routing, run-state, installers, hooks, GitHub Actions, package versioning, and bundle-generation architecture.
- dependency/API/schema changes: add optional `risks[]` and `scopes[]` to `.telos/project.yml`; add `telos evidence check [--spec <path>] [--project-root <path>]`.

## 6. Verification Plan

- command: `npm test`
- command: `npm run check:release`
- command: `npm pack --dry-run --cache /private/tmp/telos-npm-cache`
- manual check: use a temporary Git repository to confirm only path-matching risks run, `found` and `nonzero` semantics reject correctly, and a passing risk is reported.
- manual check: run `telos evidence check --spec <path>` against a valid scoped SPEC, an undeclared scope, and an AC missing evidence for one declared scope.
- manual check: inspect both generated plugin bundles after `npm run build` to confirm their Spec/Eval guidance describes the same deterministic commands and scope-evidence rule.

## 7. Risk Profile

- public API: verify existing commands plus the new `telos evidence check` command from the built CLI; a missing or invalid argument must exit non-zero without affecting unrelated commands.
- command execution: tests must prove that `found` interprets exit codes exactly as defined and that a matching risk failure stops subsequent risk commands.
- contrary case: a scoped AC can list evidence for only one of two scopes. Evidence validation must reject it even if the listed evidence is non-empty.

## 8. Acceptance Criteria

- [ ] AC1: `.telos/project.yml` accepts optional `risks[]` entries with a unique non-empty `id`, non-empty `when` pattern list, non-empty `check`, and `fail_when` equal to `found` or `nonzero`; invalid entries fail clearly.
- [ ] AC2: `telos verify --changed` runs each matching risk once after matching module commands succeed, in configuration order, and does not run unmatched risks.
- [ ] AC3: `fail_when: found` rejects on exit code `0`, passes on exit code `1`, and rejects as an execution error for any other exit code; `fail_when: nonzero` rejects on every non-zero exit code.
- [ ] AC4: `.telos/project.yml` accepts an optional unique non-empty `scopes` list, and `telos evidence check --spec <path> --project-root <path>` accepts a scoped AC only when every tag is declared and has a non-empty matching evidence line.
- [ ] AC5: The evidence command rejects malformed scope tags, undeclared scope tags, repeated scope tags, missing evidence, and empty evidence with a clear non-zero result; unscoped ACs remain valid.
- [ ] AC6: Codex and Claude Code SPEC templates and Spec/Eval instructions describe `project.yml` risks, `telos verify --changed`, scoped-AC evidence syntax, and the rule that semantic Eval still judges evidence correctness.
- [ ] AC7: TDD tests cover matching and unmatched risks, both failure semantics, risk execution order and stopping, valid and invalid scope evidence, and Phase-1 compatibility; all related tests pass.
- [ ] AC8: Existing CLI behavior, release version checks, and npm package contents continue to pass.

## 9. Out of Scope

- CI command allowlists, sandboxing, or automatic execution of pull-request-modified configuration.
- Risk-check packs shared across projects.
- Multi-SPEC activation, `specHash`, `telos unblock`, and evaluation-report artifacts.
- Automatic evidence truth validation; Eval remains the semantic judge.
- Replacing duplicated plugin resources with a canonical generated source.
- Capability routing changes.

## 10. Open Questions

- None. This phase intentionally uses Markdown evidence lines and an explicit `--spec` path; durable active-SPEC selection is Phase 3.
