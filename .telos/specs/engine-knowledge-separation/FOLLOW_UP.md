# Engine–Knowledge Separation: Deferred Work

This document preserves the work deliberately excluded from Phase 1 in `SPEC.md`. It is a roadmap, not a frozen implementation contract.

## Phase 2 — Risk checks and scope evidence

- Extend `.telos/project.yml` with path-triggered `risks[]` entries whose checks have explicit failure semantics.
- Add scope tags to acceptance criteria and require per-scope evidence before Eval can approve a tagged criterion.
- Keep risk commands as project-owned trusted configuration; design CI protections before running pull-request-modified commands automatically.
- Replace generic build-tool and risk examples in Eval/Spec instructions with the deterministic verification command only after Phase 2 is implemented.

## Phase 3 — Durable work state

- Move feature contracts to `.telos/specs/<slug>/SPEC.md`.
- Add an explicit local active-spec selector or require `telos run <slug>`; do not commit per-developer active state.
- Add `specHash` to per-spec run state, `telos unblock`, and Markdown evaluation reports.
- Keep `project.yml` and feature SPECs versioned; ignore local run state and evaluation artifacts by default.

## Phase 4 — Bundle and installer hardening

- Replace independently maintained Codex and Claude Code resource copies with a canonical source and target-specific build output.
- Make installer replacement safe and test it through install, verification, and removal using a temporary home directory.
- Stop embedding the installer process's absolute Node path in hooks.

## Phase 5 — Capability policy review

- Remove or replace keyword-score capability routing only after observing real usage data.
- Preserve Telos as the final SPEC/verification/Eval owner while avoiding a second automatic selector that disagrees with the active coding harness.
- Do not introduce another harness bundle until the existing two targets are generated from one source.

## Evidence required before expanding scope

- Run Phase 1 against at least two repositories with different toolchains using only different `project.yml` files.
- Record false positives, missed affected modules, command-execution failures, and manual-verification cases.
- Validate scope-tag evidence on real multi-scope work before finalizing a machine-readable artifact schema.
