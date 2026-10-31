# PRD: Risk-based human review recommendations

Status: approved
Revision: 1
Date: 2026-10-31
Source: Conversation: after Telos implements a Feature SPEC, show a table of file and function-level changes that a human should review, based on meaningful risk rather than requesting review for every change.

## 1. Overview

Telos verifies implementation against a frozen Feature SPEC, but verification cannot replace a human decision about high-impact design and business trade-offs. After a successful implementation and evaluation pass, Telos should analyze the allowed changed diff and return an advisory review table only for changes that meet an explicit risk signal.

The table should name the file and the smallest stable code location available, explain the detected signal and its possible impact, and state what the reviewer should decide. It must not claim that a human reviewed the change, block an approved Eval result by default, or infer risk only from filenames.

The proposal belongs in the `$run` completion handoff, using shared diff/SPEC/evaluation evidence. `$eval` remains the independent correctness gate and does not implement fixes.

## 2. User Flows

1. A developer runs a frozen Feature SPEC through `$run`; after implementation and `$eval`, Telos analyzes the final diff and returns the normal completion evidence plus a `Human review recommended` table when risk signals match.
2. A changed function changes business rules, authorization, persistence, transaction boundaries, concurrency, or an external side effect; the table identifies the location, reason, and review focus.
3. A change has no matched signals; Telos states that no rule-based review candidates were found, while making clear this is not a guarantee that review is unnecessary.
4. An uncertain or rejected Eval result occurs; Telos reports the existing handoff first. Review recommendations may supplement it but must not mask the unresolved result.

## 3. Feature Candidates and Existing Capability Assessment

| Feature candidate | Planning-document basis | Existing capability evidence | Determination | Development scope | Remaining change |
|---|---|---|---|---|---|
| Final diff risk classifier | Recommend review only for meaningful changes | `resources/shared/skills/eval/SKILL.md` compares the diff to Expected Change Surface and mentions high risk, but defines no classifier or output | MODIFY | INCLUDE | Define evidence-based risk signals and map each finding to a changed location. |
| Human review handoff table | Show file/function/content to review | `resources/shared/skills/run/SKILL.md` reports changed files, evidence, and unresolved risks but has no structured review recommendation | MODIFY | INCLUDE | Add an advisory table to the final run handoff. |
| Eval approval decision | Keep automated evidence separate from human review | `resources/shared/skills/eval/SKILL.md` owns approved/rejected/uncertain decisions and consensus recommendation | REUSE | EXCLUDE | none |
| Rejection-history prevention review | Avoid conflating feature review with historical process improvement | `resources/shared/skills/review/SKILL.md` is a report-only workflow for repeated rejection history | REUSE | EXCLUDE | none |

## 4. Technical Proposal

- Add a single risk-based review-recommendation pass after `$eval` has produced its final evidence and before `$run` reports completion. It reads the frozen SPEC, final changed diff, and evaluation result; it does not modify source files or the SPEC.
- Return a table with `priority`, `file`, `symbol or line range`, `risk signal`, `why human judgment is needed`, and `review focus`. Use a file-level location only when a reliable symbol cannot be identified.
- Deduplicate multiple signals at the same symbol. Preserve all matched signals in one row and rank higher-impact findings first.
- Use a small, explainable signal taxonomy. Initial candidates are below; exact detection boundaries remain an open technical decision.

| Signal family | Review focus |
|---|---|
| Concurrency, async ordering, locks, queues, retries, idempotency | Race conditions, duplicate execution, retry safety, cancellation, ordering guarantees. |
| Transaction, persistence, schema, migration, cache invalidation | Atomicity, rollback, consistency, migration safety, data loss, backward compatibility. |
| Business policy or domain calculation | Rule correctness, boundary values, feature-flag behavior, pricing/eligibility/state transitions. |
| Authorization, authentication, tenancy, permissions | Privilege escalation, object ownership, default-deny behavior, audit boundaries. |
| Money, entitlements, quotas, inventory, irreversible state | Double processing, rounding, reconciliation, compensating actions. |
| External API, webhook, message broker, background job | Contract compatibility, timeout/retry semantics, duplicate delivery, failure ownership. |
| Privacy, secrets, logging, cryptography | Data exposure, retention, redaction, key/credential handling. |
| Public API, CLI, configuration, dependency changes | Consumer compatibility, rollout/rollback, default changes, supply-chain impact. |
| Deletion or broad refactor with behavior-bearing code | Lost edge cases, changed invariants, untested paths. |
| Test-only change around a risk area | Whether the test actually covers the intended production invariant. |

- Do not generate rows merely because a file is large, a function is long, or a generic keyword appears. Prefer diff semantics and explicit API/library patterns; label low-confidence matches as heuristic.
- The report is advisory by default. A future policy may elevate selected priorities to a required human approval gate, but that is out of scope for the first version.
- `critical` is the highest recommendation priority, not a completion blocker. It is used when a changed location combines a high-impact domain with a failure-prone mechanism, such as an authorization decision around an irreversible state change or a transaction with an external payment call.
- The first version does not collect, persist, or verify human-review acknowledgment. Its only outcome is an actionable recommendation in the final handoff.
- Project-specific business signals are optional. Start with terms in the active SPEC (for example `refund`, `eligibility`, `reservation`, or `consent`) plus changed public interfaces and state-changing calls. Do not require a project configuration file in the first version. A later version may add an explicit mapping from domain terms or code locations to review focus after real projects show gaps.

## 5. Open Questions and Assumptions

### Open business and workflow policies

| Question | Why it matters |
|---|---|
| Should the feature inspect only the current uncommitted diff, or a Git comparison range/PR diff? | Determines reliable use in CI and after commits. |

### Assumptions

- The first version is a local, report-only assistant capability with no Git-hosting or pull-request integration.
- Existing `$eval` status remains authoritative. The recommendation pass does not automatically change `approved` to `uncertain`.
- Findings must point only to code actually changed in the completed iteration.
- `critical` remains advisory; a completed run does not require reviewer identity or acknowledgment.
- Project-specific business logic is inferred from the active SPEC and changed code in the first version; no project configuration is required.

## 6. Risk Flags

- Over-broad keyword matching could produce noisy tables and train users to ignore them. Every rule needs a concrete reason and a confidence/priority policy.
- AST parsing across all supported project languages may be expensive or incomplete. A diff-hunk fallback needs transparent file/line locations and heuristic labeling.
- Business-logic detection is inherently project-specific. Generic signals should be supplemented by SPEC vocabulary or optional project configuration rather than pretending to be complete.
- Concurrency, persistence, payments, authorization, privacy, external calls, retries, and asynchronous work are review signals, not automatic proof of a defect.
- If review acknowledgment becomes a gate, it introduces identity, authorization, persistence, and bypass/override policy requirements.

## 7. Shared Decisions

| Decision | Reason | Applies to |
|---|---|---|
| Produce recommendations from final SPEC, diff, and Eval evidence | Keeps recommendations grounded in the actual change and avoids a separate speculative scan. | Risk classifier, run handoff |
| Keep the first version advisory | Preserves existing `$eval` approval semantics while validating signal usefulness and noise. | Risk classifier, run handoff |
| Require a precise changed location and review question per row | A file-only warning is not actionable enough for a human reviewer. | Risk classifier, run handoff |
| Treat `critical` as an advisory priority | Highlights consequential changes without adding approval workflow or state. | Risk classifier, run handoff |
| Infer business signals from the active SPEC first | Avoids mandatory configuration while grounding recommendations in the requested feature vocabulary. | Risk classifier |

## 8. Review Decision

Confirmed: all priorities, including `critical`, are advisory. Telos does not record or verify human-review acknowledgment. Project-specific business signals begin as SPEC-vocabulary inference; explicit configuration is deferred until needed. Open: select the Git diff range used by the recommendation pass.

## 9. Revision History

| Revision | Date | Requirement change | Affected SPEC candidates |
|---|---|---|---|
| 1 | 2026-10-31 | Initial draft | Final diff risk classifier; human review handoff table |
| 2 | 2026-10-31 | Critical remains advisory; review acknowledgment is not stored; business signals use active SPEC vocabulary initially | Final diff risk classifier; human review handoff table |

## 10. Related SPECs

| SPEC | Responsibility |
|---|---|
| [Human review recommendations](../../specs/human-review-recommendations/SPEC.md) | Add the advisory final-diff review recommendation contract to `$run`. |
| [Eval-owned human review recommendations](../../specs/eval-human-review-recommendations/SPEC.md) | Make `$eval` produce the table and `$run` forward it once. |
