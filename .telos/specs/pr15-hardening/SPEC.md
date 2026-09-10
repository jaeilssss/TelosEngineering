# Spec: PR #15 hardening and first-use workflow

Status: `frozen`
Date: 2026-09-10
Spec baseline: `feat/engine-knowledge-separation` at `7803fa6bb1a6b58e7a0d10ff228e4dc6bd00a2a4`
Source: Telos PR #15 fix list provided on 2026-09-10

## 1. Goal

Make the PR #15 engine/knowledge separation safe to merge and practical for first-time and recurring use by fixing verification blind spots, preserving run history, adding deterministic setup/diagnostics/removal, and turning accumulated rejection evidence into human-approved improvement proposals.

## 2. Ontology

| Concept | Definition | Notes |
|---|---|---|
| Project configuration | Committed `.telos/project.yml` containing project-owned modules, verification commands, risks, and scopes. | It is trusted configuration because its commands run with the user's permissions. |
| Changed path | A tracked Git path changed from `HEAD` or an untracked, non-ignored path returned by `git ls-files --others --exclude-standard`. | Duplicate paths are removed. |
| Verification result | A structured `passed` or `no-op` result containing changed paths, matched modules, commands, and risks. | A command failure remains an error, not `no-op`. |
| Worktree fingerprint | SHA-256 of the current `git diff --binary HEAD` bytes plus sorted untracked path names and file bytes. | It detects edits made after mechanical verification, including changes to the same path. |
| No-op | Mechanical verification had no configured module to execute, with reason `no-changes` or `no-matching-module`. | It is recorded distinctly and allows semantic Eval to continue. |
| Run archive | An immutable prior per-slug state moved under `.telos/runs/archive/` before a new run reuses that slug, with its Eval directory archived under the same archive ID. | It preserves history and reports across separate runs. |
| Active SPEC | The local `.telos/active` slug used by hooks to locate `.telos/specs/<slug>/SPEC.md`. | It is developer-local and ignored by Git. |
| Init | Deterministic generation of the smallest valid `.telos/project.yml`, with only one toolchain-derived verify command when confidently detected. | It never invents risks or scopes. |
| Doctor | A CLI diagnostic that parses configuration, reports module path matches, and checks configured verification commands with explicit results. | It must fail clearly when configuration or commands are invalid. |
| Eval report | Markdown evidence for one Eval attempt, including run history, verification commands, risks, and the evaluator summary. | Previous attempts must never be overwritten. |
| Rejection summary | `<AC> | <missing evidence or behavior> | <how verified> | Stage1: yes|no`. | This stable format feeds history aggregation and review. |
| History | Mechanical aggregation of archived and current run states over a requested time window. | It separates Stage-1-caught and Stage-1-missed rejections. |
| Review | A report-only skill that proposes regression tests, tool-managed static checks, or risks from repeated failures. | A human applies every project configuration change. |

## 3. Constraints and Decisions

- Preserve the existing engine/knowledge separation: no build-tool names or project-specific verification commands may return to `resources/`.
- Keep `resources/shared/skills/` as the only source for shared Spec, Run, and Eval instructions; generated Codex and Claude bundle copies remain build outputs.
- Keep hooks configured with `"command": "node"`; do not write the install-time `process.execPath` into hook files.
- Preserve atomic tmp-to-rename writes for run state and installed plugin trees.
- Use a maintained YAML parser dependency rather than extending the custom parser. Standard YAML comments, including line-end comments, must work.
- `telos init` may infer one verify command only from recognized repository markers. If detection is uncertain, it writes `verify: []` and says manual verification is required.
- Toolchain detection precedence is `gradlew`, `mvnw`, `package.json` with a test script, `pyproject.toml`, `go.mod`, then `Cargo.toml`.
- `telos init` never creates `risks` or `scopes` values.
- `telos init` does not overwrite an existing configuration unless the public `--force` option is present.
- Automatic init prints the generated configuration and inferred command, then Run may proceed. `verify: []` permits implementation but requires explicit manual evidence before Eval can approve.
- Reusing a non-running slug archives the old state before starting a fresh run. An active running state is never overwritten.
- The archive ID is `<slug>-<UTC timestamp>-<collision counter>` and is shared by the archived state and Eval directory.
- `uncertain` never retries automatically. The user chooses retry/consensus or revises the SPEC and starts a new run.
- Eval owns mechanical verification. Run must not execute the same verification a second time in one iteration.
- Verification and risk commands have a default 10-minute timeout and distinguish timeout, process error, risk detection, and ordinary command failure.
- Failure detail is limited to the final 40 non-empty lines of combined stdout and stderr.
- For `fail_when: found`, exit `0` means detected, `1` means not detected, and any other exit is a checker error. For `fail_when: nonzero`, exit `0` passes and any non-zero exit is a failed check.
- `unblock` advances the iteration and observes the same maximum-iteration bound so its next Eval report cannot overwrite the blocked report.
- `.telos/project.yml` is trusted local/project configuration. Do not run pull-request-modified commands automatically in CI as part of this work.
- `$review` is report-only. It must not weaken gates, edit `.telos/project.yml`, remove checks, or change code.
- `telos verify --changed` stores its structured result as the active run's latest verification snapshot. `run record` consumes a hash-matching snapshot into state/history and the Eval report; stale or missing snapshots are diagnosed.
- A verification snapshot is current only when its SPEC hash, run iteration, and worktree fingerprint match at record time. With no active run, verify returns normally and does not persist a snapshot.
- `telos history --since` accepts only a positive integer followed by `h`, `d`, or `w` (for example `24h`, `7d`, `2w`) and rejects every other value without reading history.
- Configuration hook warnings are emitted once per available harness session ID. Claude checks at SessionStart; Codex checks on the first relevant PostToolUse. When no session ID exists, the hook warns on every relevant event rather than failing silently.
- Move the Codex plugin from `$HOME/plugins/telos` to `$HOME/.telos/plugins/telos`; uninstall removes only Telos-owned entries and files.
- Validate portability against two real repositories with different toolchains using configuration changes only. The repositories may be selected during execution, but their identity and outcomes must be recorded.

## 4. Test Strategy

Test strategy: TDD

- Add a regression test before each behavior fix when practical.
- Installer and uninstall behavior use isolated temporary home directories.
- Filesystem, Git, timeout, archive, and report tests use temporary repositories and do not modify the developer's real home directory.

## 5. Expected Change Surface

- allowed:
  - `src/verification.ts`, `src/run-state.ts`, `src/installers.ts`, `src/cli.ts`, `src/core.test.ts`
  - focused new TypeScript modules under `src/` for init, doctor, history, or shared project configuration behavior
  - `resources/shared/skills/spec/`, `resources/shared/skills/run/`, `resources/shared/skills/eval/`, and a new shared `review` skill
  - Codex and Claude hook/session scripts, manifests, and build-copy logic only as needed to consume shared sources or report configuration errors
  - `.gitignore`, `.telos/project.yml`, `.telos/specs/engine-knowledge-separation/FOLLOW_UP.md`
  - `README.md`, `README_KR.md`, `LICENSE`, `package.json`, and lockfile
  - focused test fixtures and a committed two-repository validation report under `docs/`
- excluded:
  - GitHub Action execution of pull-request-owned `project.yml` commands
  - PR comments, release automation, package version bump, and npm publication
  - Eval JSON schemas and automatic mutation of tests, source code, or project configuration by `$review`
  - Ambiguity-score tuning or additional coding harnesses
- dependency/API/schema changes:
  - add one YAML parsing dependency
  - add public CLI commands `telos init`, `telos doctor`, `telos uninstall`, and `telos history --since <duration>`
  - expand `VerificationResult.status` to `"passed" | "no-op"` and add `reason: "no-changes" | "no-matching-module"` for no-op results
  - persist a latest verification snapshot and worktree fingerprint in per-slug run state for Eval reporting
  - allow optional risk metadata `added`, `origin`, and `caught`
  - relocate the Codex installation path to `$HOME/.telos/plugins/telos`

## 6. Verification Plan

- `npm test`
- `npm run check:release`
- `npm pack --dry-run --cache /private/tmp/telos-npm-cache`
- `git diff --check`
- Search `resources/` for forbidden project-tool examples and confirm zero matches.
- Manual: install → reinstall → doctor → uninstall using an isolated temporary home, confirming unrelated files and catalog entries remain.
- Manual: configure and run Telos against two real repositories with different toolchains; record matches, misses, command failures, and manual-verification cases without changing Telos code or skill instructions.

## 7. Risk Profile

- command execution: init output must visibly identify the inferred command; doctor and verify must report the executed command and bounded output without exposing unrelated environment data.
- installer/uninstaller: every deletion target must be an exact Telos-owned path resolved from the provided home; preserve unrelated plugins and catalog entries in round-trip tests.
- public CLI compatibility: existing `install`, `update`, `update-status`, `verify`, `evidence`, and `run` commands keep their documented behavior except where this SPEC explicitly changes it.
- durable state: slug reuse, archive naming, unblock, and report creation must not overwrite prior history or another slug's files.
- trusted configuration: documentation must state that `verify` and risk commands execute with user permissions and must not be accepted from untrusted changes without review.
- contrary case: a repository containing only an untracked new source file must still select its module and run verification; a repository containing only documentation changes outside every module must return `no-op`, not failure.

## 8. Acceptance Criteria

- [ ] AC1: Changed-path discovery returns the deduplicated union of `git diff --name-only HEAD` and `git ls-files --others --exclude-standard`; a regression test proves that an untracked new file alone selects and verifies its configured module.
- [ ] AC2: Failed module and risk commands include the final 40 non-empty lines of combined stdout/stderr in `VerificationError`; `fail_when: found` treats exit `0` as detected, `1` as not detected, and every other exit as checker error; `fail_when: nonzero` treats only exit `0` as pass; timeout and process-launch failures have distinct diagnostics.
- [ ] AC3: When no module matches, `telos verify --changed` returns `status: "no-op"` with `reason: "no-changes"` or `reason: "no-matching-module"` instead of a non-zero error; Eval instructions continue to semantic evaluation after either no-op reason.
- [ ] AC4: Starting a non-running slug archives its complete prior state and its existing Eval directory under one collision-safe `<slug>-<UTC timestamp>-<counter>` archive ID before creating a fresh state; a running slug remains protected and tests prove prior multi-iteration history and reports are preserved.
- [ ] AC5: Both harness hooks distinguish missing `.telos/project.yml`, invalid YAML, and empty `modules[].paths`, and emit actionable diagnostics instead of silently passing. Claude reports once at SessionStart and Codex once at the first relevant PostToolUse for each available session ID; without a session ID, every relevant event warns.
- [ ] AC6: Run and Eval preflight ensure `.telos/project.yml` exists before implementation or evaluation. If absent, they invoke `telos init`, show the generated verify command or `verify: []`, and require the user to see that result before proceeding.
- [ ] AC7: The repository contains an MIT `LICENSE`; `.telos/active` is ignored by Git; README/FOLLOW_UP accurately describe local active state and record capability keyword routing as removed.
- [ ] AC8: `.telos/project.yml` is parsed by the selected YAML dependency and accepts documented inline/block lists and line-end comments. Module paths must contain at least one non-empty string; a verify array may be empty for manual verification, but every command it contains must be non-empty. Risk identifiers remain unique, `fail_when` remains restricted to supported values, and scopes remain unique and non-empty.
- [ ] AC9: `telos init --project-root <path> [--force]` creates a documented one-module configuration with `paths: ["**"]`; it chooses at most one command using the precedence `gradlew` → `mvnw` → npm test script → `pyproject.toml` → `go.mod` → `Cargo.toml`, does not overwrite without `--force`, never adds risks/scopes, and falls back to `verify: []` with a clear message.
- [ ] AC10: `telos doctor --project-root <path>` reports config parse status, per-module path match counts, and each verification command result; invalid configuration, missing executables, timeout, or command failure produces a clear non-zero outcome.
- [ ] AC11: Run instructions automatically retry only `rejected`; `uncertain` stops for user direction and explains retry/consensus versus SPEC revision/new run. Shared Eval instructions say “another model or profile,” not a provider name, and one iteration executes mechanical verification only once under Eval ownership.
- [ ] AC12: `unblockRun` checks the iteration limit, increments the iteration, preserves an unblock reason in history, and writes subsequent Eval output to a new report path. Evidence checking rejects blank values and case-insensitive placeholders `TODO`, `TBD`, `N/A`, `NA`, `없음`, `미확인`, and `-`.
- [ ] AC13: With an active run, `telos verify --changed` stores a structured, timestamped snapshot containing SPEC hash, iteration, result, and a worktree fingerprint derived from `git diff --binary HEAD` plus sorted untracked paths and bytes. Without an active run it returns the result without persisting. `run record` recomputes and requires all three identity values to match, then renders slug, archive/run identity, iteration, status, SPEC hash, timestamp, history, commands, risks, and summary. Missing or stale snapshots fail clearly, and no new-run, record, or unblock sequence overwrites an earlier report.
- [ ] AC14: Rejected summaries must match `<AC> | <missing evidence or behavior> | <how verified> | Stage1: yes|no`; a malformed summary returns non-zero and leaves state, history, and reports unchanged.
- [ ] AC15: `telos uninstall codex|claude|all --home <path>` removes only Telos-owned plugin files and catalog entries, preserves unrelated data, and supports install → reinstall → uninstall round-trip tests. Codex installs under `$HOME/.telos/plugins/telos`, and generated hook commands remain runtime-resolved `node` commands.
- [ ] AC16: `telos history --since <duration> --project-root <path>` accepts only `^[1-9][0-9]*(h|d|w)$`, computes a UTC cutoff, aggregates current and archived run states at or after that cutoff, reports run/iteration/rejection totals, and separates Stage-1-caught from Stage-1-missed rejections with slug, iteration, AC, missing behavior, and verification evidence. Invalid durations fail non-zero before history files are read.
- [ ] AC17: A shared `$review` skill consumes history without modifying files and orders proposals as regression test, tool-managed lint/type rule, expressible `risks[]` check, or no action. It forbids emptying verify lists, removing paths/risks, and direct project.yml edits; grep-inexpressible problems are reported as such.
- [ ] AC18: Optional risk metadata `added`, `origin`, and non-negative `caught` round-trips through parsing and diagnostics without changing risk execution semantics; README documents stale zero-catch risks as human review candidates rather than automatic deletions.
- [ ] AC19: A committed validation report demonstrates two real repositories with different toolchains using only different `project.yml` files. It records false-positive matches, missed modules, command failures, `verify: []` behavior, and whether any Telos code/SKILL change was required.
- [ ] AC20: Tests cover every P0/P1 behavior above, installer and uninstall round trips, history aggregation, report preservation, two representative project configurations, and all related tests and package checks pass.
- [ ] AC21: `resources/` contains no project build-tool command examples, shared skills remain single-source, hook commands remain `node`, SPEC-hash guards remain on record/retry/unblock, and atomic state/plugin writes remain intact.

## 9. Out of Scope

- Automatic application of `$review` proposals.
- Running project-owned shell commands from untrusted pull requests in CI.
- GitHub Action or PR-comment integration.
- Eval JSON schemas or a database for historical state.
- Automatic risk-pack generation or deletion of stale risk entries.
- Additional harness integrations beyond Codex and Claude Code.
- Publishing a new npm version as part of this implementation.

## 10. Open Questions

- None.
