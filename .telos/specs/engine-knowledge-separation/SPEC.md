# Spec: Engine–Knowledge Separation, Phase 1

Status: `frozen`
Date: 2026-09-09
Spec baseline: `docs/readme-v2` at `98fedb5`

## 1. Goal

Make Telos choose and run deterministic, project-defined mechanical verification for changed files, without asking the model to infer a repository's build or test commands.

## 2. Ontology

| Concept | Definition | Notes |
|---|---|---|
| Engine | Telos TypeScript code and bundled instructions that implement project-independent workflow rules. | It does not encode a repository's test commands. |
| Project knowledge | A committed `.telos/project.yml` file that declares verification-relevant modules. | It is trusted repository configuration in this phase. |
| Module | A named project area identified by one or more repository-relative glob patterns. | More than one module may match a changed path. |
| Changed path | A tracked file path changed from `HEAD`, including staged and unstaged changes. | Untracked files are out of scope in Phase 1. |
| Verification command | A command declared by a matching module and executed by `telos verify --changed`. | Commands execute in the project root, in declaration order. |
| Manual-verification module | A matching module whose `verify` list is empty. | It produces an explicit manual-review result and cannot be reported as an automatic pass. |

## 3. Constraints

- Preserve Node.js 20+ support and the existing npm package entry point.
- Add no runtime dependency solely for YAML parsing or glob matching; use a small, maintainable implementation or an already-present dependency.
- Treat `.telos/project.yml` as trusted local/project configuration. Do not claim that it is safe to execute when supplied by an untrusted pull request.
- Do not change capability discovery/routing, run-state behavior, SPEC locations, hooks, installer behavior, or bundle layout in this phase.
- `telos verify --changed` must be deterministic for the same Git `HEAD`, index, working tree, and `project.yml`.
- A verification-command failure must stop remaining commands and return a non-zero process exit code.
- Missing, invalid, or unmatched configuration must return a clear non-zero result; Telos must not silently pass.

## 4. Test Strategy

Test strategy: TDD

## 5. Expected Change Surface

- allowed: `src/cli.ts`, a focused verification/config module under `src/`, `src/core.test.ts`, `package.json` only if required for the implementation, README installation/usage documentation, and a committed example `.telos/project.yml` for this repository.
- excluded: `src/capabilities.ts`, `src/run-state.ts`, `src/installers.ts`, plugin hooks, bundled SKILL.md files, GitHub Actions, and npm publishing configuration.
- dependency/API/schema changes: add the public CLI command `telos verify --changed [--project-root <path>]`; introduce the Phase-1 `project.yml` schema containing `modules[].name`, `modules[].paths`, and `modules[].verify`.

## 6. Verification Plan

- command: `npm test`
- command: `npm run check:release`
- manual check: in a temporary Git repository, change a file matched by one module and confirm only that module's declared commands run, in declaration order.
- manual check: confirm an empty `verify` list, an invalid configuration file, and no matching module each produce an explicit non-success outcome.

## 7. Risk Profile

- public API: invoke existing CLI commands (`--version`, `run`, `capabilities`) after the change and confirm their behavior remains available; add focused CLI/command tests where practical.
- command execution: document that `project.yml` is trusted configuration; test that a failing declared command stops the verification run and preserves its non-zero status.
- contrary case: a shared file can affect multiple modules. The implementation must run every matching module once, rather than selecting only the first match.

## 8. Acceptance Criteria

- [x] AC1: A repository can commit `.telos/project.yml` with one or more modules, each containing a unique non-empty `name`, one or more non-empty `paths`, and a `verify` list of strings.
- [x] AC2: `telos verify --changed --project-root <path>` identifies tracked staged and unstaged paths changed from `HEAD`, matches every affected module by its declared repository-relative paths, and executes each matching module once in configuration order.
- [x] AC3: For a matching module with verification commands, Telos executes its commands in project-root working directory and declaration order; the first command failure stops execution and makes the CLI exit non-zero.
- [x] AC4: A matching module with `verify: []` reports that manual verification is required and exits non-zero; no automatic approval/pass wording is emitted.
- [x] AC5: Missing or invalid `.telos/project.yml`, an invalid module definition, a repository that is not a Git worktree, or no matched module produces a clear diagnostic and a non-zero exit code.
- [x] AC6: Tests cover single-module selection, overlapping-module selection, command ordering, command failure, manual-verification modules, invalid configuration, and no-match behavior; all related tests pass.
- [x] AC7: Existing `telos` CLI commands and the npm release checks continue to pass.

## 9. Out of Scope

- Risk checks, scope tags, and acceptance-criterion evidence enforcement.
- Multi-SPEC storage, `.telos/active`, `specHash`, `telos unblock`, and evaluation reports.
- Capability discovery or keyword-based routing removal.
- Canonical source/build generation for Codex and Claude Code bundles.
- Installer safety and portable Node hook-path work.
- CI command allowlists or executing verification for untrusted pull-request configuration.
- Automatic dependency-graph inference between modules; a module may explicitly include shared paths when needed.
- Untracked-file detection and configurable Git comparison bases.

## 10. Open Questions

- None.
