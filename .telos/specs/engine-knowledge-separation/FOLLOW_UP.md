# Engine–Knowledge Separation: Deferred Work

This document records the V2 follow-up status. The original roadmap work is implemented by PR #15 and its hardening SPEC; it is no longer a list of deferred phases.

## Phase 2 — Risk checks and scope evidence (implemented)

- `.telos/project.yml` supports path-triggered `risks[]` entries with explicit failure semantics.
- Scope-tagged acceptance criteria require evidence for every declared scope before approval.
- Risk commands remain project-owned trusted configuration; untrusted pull-request changes are not run automatically in CI.
- Eval/Spec instructions use deterministic project verification instead of generic build-tool examples.

## Phase 3 — Durable work state (implemented)

- Feature contracts live at `.telos/specs/<slug>/SPEC.md`.
- Use the ignored local `.telos/active` selector written by `telos run start`.
- Per-spec run state includes `specHash`; `telos unblock` and Markdown evaluation reports are available.
- `project.yml` and feature SPECs are versioned while local run state and evaluation artifacts are ignored.

## Phase 4 — Bundle and installer hardening (implemented)

- Shared skills come from one canonical source and are copied into target-specific build output.
- Installer replacement and removal are tested with a temporary home directory.
- Hooks resolve `node` at runtime instead of embedding the installer's absolute Node path.

## Capability policy decision (implemented)

- Keyword-score capability routing was removed. The active harness selects capabilities; Telos keeps the frozen SPEC, loop state, verification snapshot, and final Eval ownership.
- Preserve Telos as the final SPEC/verification/Eval owner while avoiding a second automatic selector that disagrees with the active coding harness.
- Do not introduce another harness bundle until the existing two targets are generated from one source.

## Remaining operational evidence

- Keep the two-repository portability report under `docs/` current when supported toolchains change.
- Record false positives, missed affected modules, command-execution failures, and manual-verification cases.
- Validate scope-tag evidence on real multi-scope work before finalizing a machine-readable artifact schema.
