---
name: eval
description: "Evaluate implementation against SPEC.md acceptance criteria. Use when the user writes $eval, asks to verify a spec-first implementation, score acceptance criteria, or run the mechanical and semantic evaluation gate."
---

# Spec Evaluation

Evaluate the current implementation against `SPEC.md`. Do not implement fixes while evaluating unless the user explicitly asks after the evaluation.

Treat this skill as the evaluation orchestrator. The semantic judge should be independent from the implementation worker.

## Workflow

1. Before evaluation, run `telos update-status codex --project-root .` when the `telos` CLI is available. If it prints a message, show that update recommendation before continuing.
2. Read `SPEC.md` and extract acceptance criteria.
3. Run mechanical checks first: tests, lint, typecheck, and build if the project defines them.
4. Stop if mechanical checks fail; report the command and failure.
5. Run a semantic evaluation pass for each acceptance criterion.
6. Report `approved`, `rejected`, or `uncertain`.
7. Include concrete evidence: file paths, commands, test names, or observed behavior.
8. If any criterion is `uncertain`, or the change is high-risk, recommend a consensus pass.
9. If all criteria pass, update checked items in `SPEC.md` when appropriate.
10. Feed rejected or uncertain criteria into the next `$spec` or `$impl` iteration.

## Semantic Evaluation

Use a Codex subagent for semantic evaluation when independence materially improves the judgment, especially for high-risk changes, unclear acceptance criteria, or any result that would otherwise be uncertain.

Spawn a separate evaluator with a narrow prompt:

```text
You are a strict evaluator. Do not implement. Read SPEC.md, inspect the relevant code/tests/commands, and judge each acceptance criterion as approved, rejected, or uncertain with concrete evidence.
```

The evaluator should inherit the current Codex model by default. Do not override the model unless the user explicitly asks or the change is high-risk enough to justify a stronger evaluation model.

Pass the evaluator only the evidence it needs:

- `SPEC.md`
- the relevant changed files
- mechanical-check results
- known verification limitations

Do not pass implementation intent, speculative rationale, or the full implementation conversation unless the absence of that context would make the evaluation misleading.

If the acceptance criteria are narrow and the mechanical checks already provide most of the evidence, a second-pass review in the current session is sufficient. If the current Codex surface does not expose subagents, perform that second-pass review after mechanical checks. Do not rely on implementation intent; rely on evidence.

For each acceptance criterion, ask: "What concrete behavior would falsify this?" Check the code, tests, and command output for that counterexample before approving.

## Consensus

Consensus is off by default. Recommend it only for high-risk changes or any `uncertain` result.

When the user agrees, run a second independent evaluation with a different Codex model/profile if available, or ask the user to run `$eval` in a fresh session with a stronger model. Compare the disagreements before changing `SPEC.md`.

## Output

Use this shape:

```text
AC1: approved - evidence: ...
AC2: rejected - evidence: ...
AC3: uncertain - evidence: ...
Summary: 1/3 approved. Recommended next step: ...
```
