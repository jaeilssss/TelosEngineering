---
name: impl
description: "Compatibility entry point for Telos V2. Route frozen SPEC.md execution to $run."
---

# Compatibility: Impl → Run

`$impl` is retained for existing users. Telos V2 uses `$run` as the execution entry point.

Read the frozen `SPEC.md`, then follow the complete `$run` workflow: discover available capabilities, route only the capabilities needed by the current iteration, execute, verify, and return to the final Eval gate. Do not treat implementation as a standalone completion state.

For a new workflow, direct the user to `$run`.
