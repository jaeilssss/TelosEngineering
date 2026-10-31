---
name: eval
description: "Evaluate implementation against SPEC.md acceptance criteria. Use when the user writes $eval, asks to verify a spec-first implementation, score acceptance criteria, or run the mechanical and semantic evaluation gate."
---

# Spec Evaluation

Run `telos workspace --project-root .` first. Evaluate the selected Feature SPEC at `path/specs/<slug>/<slug>.spec.md`, falling back to legacy `SPEC.md`. Do not implement fixes while evaluating unless the user explicitly asks after the evaluation.

Treat this skill as the evaluation orchestrator. The semantic judge should be independent from the capability that implemented the change.

## Workflow

1. Before evaluation, run `telos update-status codex --project-root .` in Codex or `telos update-status claude --project-root .` in Claude Code when the CLI is available. If it prints a message, show that update recommendation before continuing.
2. Ensure `.telos/project.yml` exists. If missing, run `telos init --project-root .` and show the complete generated configuration and inferred command (or `verify: []`) before continuing. An empty verify list requires explicit manual evidence before approval.
3. Read the selected Feature SPEC from the Telos workspace and extract acceptance criteria.
4. Run `telos verify --changed --project-root .` exactly once. A `no-op` result continues to semantic evaluation. Before approving a scoped AC, run `telos evidence check --spec <workspace>/specs/<slug>/<slug>.spec.md --project-root .` (or the resolved legacy path); Eval still judges whether the evidence is true.
5. Stop if mechanical checks fail; report the command and failure.
6. Compare the diff against Expected Change Surface. An unexpected file, dependency, API, or schema change is `uncertain` until the user confirms the expanded scope.
7. Run a semantic evaluation pass for each acceptance criterion and each matching project risk check.
8. If the user requests a lean pass, report only avoidable complexity: AC-unmapped changes, unnecessary dependencies, speculative abstractions, and dead code. It must not apply changes or replace correctness, security, or accessibility review.
9. After completing the acceptance-criteria evaluation, perform the separate Human review recommendations pass below. If it finds evidence of a defect, apply the normal Eval decision rules; do not reduce a confirmed defect to an advisory recommendation.
10. Report `approved`, `rejected`, or `uncertain` with the recommendations.
11. Include concrete evidence: file paths, commands, test names, or observed behavior. Format every rejected handoff line as `<AC> | <missing evidence or behavior> | <how verified> | Stage1: yes|no`.
12. If any criterion is `uncertain`, or the change is high-risk, recommend a consensus pass.
13. If all criteria pass, update checked items in `SPEC.md` when appropriate.
14. Feed rejected or uncertain criteria into the next `$spec` or `$run` iteration.

## Semantic Evaluation

Use an independent evaluator subagent for semantic evaluation only when it helps isolate high-noise evidence gathering or when an independent pass is valuable because the change is broad, risky, or leaves any criterion uncertain.

Spawn a separate evaluator with a narrow prompt:

```text
You are a strict evaluator. Do not implement. Read SPEC.md, inspect the relevant code/tests/commands, and judge each acceptance criterion as approved, rejected, or uncertain with concrete evidence.
```

The evaluator should inherit the current model by default. Do not override it unless the user explicitly asks or the change is high-risk enough to justify another model or profile.

Pass the evaluator only the evidence it needs:

- `SPEC.md`
- the relevant changed files
- mechanical-check results
- known verification limitations

Do not pass implementation intent, speculative rationale, or the full implementation conversation unless the absence of that context would make the evaluation misleading.

If the current harness does not expose subagents, perform a second-pass review in the current session after mechanical checks. Do not rely on implementation intent; rely on evidence.

If the change is small, low-risk, and the evidence set is already compact, evaluate in the current session instead of spawning a subagent.

Return a compact main-session summary by default: acceptance-criteria decisions, key evidence, verification result, and the handoff files or artifacts needed for the next step. Do not dump long command output unless it is necessary to explain a failure.

For each acceptance criterion, ask: "What concrete behavior would falsify this?" Check the code, tests, and command output for that counterexample before approving.

## Human review recommendations

After successful mechanical verification and acceptance-criteria evaluation, inspect the current uncommitted Git worktree diff, including staged and unstaged changes. Use the diff as the starting point, then inspect relevant surrounding code, callers, and tests. Anchor each recommendation to a changed file and the most precise stable symbol or line range available. Do not turn pre-existing user changes into findings.

Return `Human review recommended` only when an explainable risk signal warrants human judgment. Use this advisory table, ordered from highest priority to lowest. Combine multiple signals at the same location in one row.

| Priority | File and symbol or line range | Matched signal | Why human review is needed | Review focus |
|---|---|---|---|---|

`critical` is the highest advisory priority and requires both a high-impact domain (for example authorization, money, entitlement, inventory, privacy, or irreversible state) and a failure-prone mechanism (for example concurrency, transaction boundaries, retries, or external side effects).

Consider these signal families when they occur in changed behavior:

- concurrency, async ordering, locks, queues, retries, or idempotency;
- transactions, persistence, schema or migration changes, and cache invalidation;
- business-policy or domain calculations, state transitions, and feature-flag behavior;
- authentication, authorization, tenancy, or permissions;
- money, entitlements, quotas, inventory, or other irreversible state;
- external APIs, webhooks, message brokers, background jobs, and their timeout or duplicate-delivery behavior;
- privacy, secrets, logging, or cryptography;
- public APIs, CLI behavior, configuration defaults, or dependencies;
- deletion or broad refactoring of behavior-bearing code; and
- test-only changes around one of these risk areas.

Use terms from the active SPEC together with changed public interfaces or state-changing code as optional business-rule evidence. Label a low-confidence match as `heuristic`. Do not create a recommendation from a filename, function length, or generic keyword alone. If no signal qualifies, state `No rule-based human review recommendations were found; this is not a guarantee that review is unnecessary.`

Recommendations never change the Eval result, block completion, assert that a human reviewed the change, collect reviewer identity, persist acknowledgment, or require project-specific configuration. A proven defect is evaluation evidence, not an advisory finding.

## Consensus

Consensus is off by default. Recommend it only for high-risk changes or any `uncertain` result.

When the user agrees, run a second independent evaluation with another model or profile if available, or ask the user to run `$eval` in a fresh session. Compare the disagreements before changing `SPEC.md`.

## Output

Use this shape:

```text
AC1: approved - evidence: ...
AC2: rejected - evidence: ...
AC3: uncertain - evidence: ...
Verification: mechanical checks pass|fail - ...
Human review recommended: ...
Handoff: ...
Summary: 1/3 approved. Recommended next step: ...
```
