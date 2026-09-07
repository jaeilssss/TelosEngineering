# Spec: Telos V2 Node.js core

Status: `frozen`
Date: 2026-09-07

Test strategy: test-after

## Goal

Ship Telos V2 as one TypeScript/Node.js npm package while preserving equivalent Codex and Claude Code installation, hook, capability-discovery, run-state, and Eval workflows.

## Acceptance Criteria

- [x] The package exposes `telos` through npm and requires Node.js 20+.
- [x] Capability discovery, routing, and bounded run state are implemented in TypeScript.
- [x] Codex and Claude Code plugin bundles contain Node hook scripts and are installed by the same CLI.
- [x] CI tests supported Node versions and npm package contents; release publishing targets npm with provenance.
- [x] No Python package, Python runtime scripts, PyPI publishing, or Python test pipeline remains.

## Verification Plan

- `npm test`
- `npm run check:release`
- `npm pack --dry-run`
