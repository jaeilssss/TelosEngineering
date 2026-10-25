---
name: spec
description: "Create or refine a SPEC.md contract before implementation. Use when the user writes $spec, asks to define requirements, wants a spec-first interview, or needs goals, constraints, ontology, and acceptance criteria clarified before coding."
---

# Spec Interview

Do not write implementation code while using this skill. Run `telos workspace --project-root .` first and create the Feature SPEC at its returned `path/specs/<slug>/SPEC.md`.

Treat this skill as the spec orchestrator. Keep the user questioning loop in the main session by default. Use a subagent only for narrow, high-noise exploration that can be returned as a small index, such as a terminology scan in a large repository, and still use the ambiguity-check subagent before freezing.

Treat the text after `$spec` as the initial task input.

## Workflow

1. Before the main workflow, run `telos update-status codex --project-root .` in Codex or `telos update-status claude --project-root .` in Claude Code when the CLI is available. If it prints a message, show that update recommendation before continuing.
2. If the workspace has no `.telos/project.yml`, run `telos init --project-root .`. Show the complete generated configuration and inferred verification command, or `verify: []`, before continuing.
3. If the user references a Discovery PRD, read its `PRD.md` before asking questions. A draft PRD does not block SPEC creation: tell the user its status and ask whether to continue from the draft. Record the PRD path and status in the resulting SPEC. Treat candidates marked `REUSE` with development scope `EXCLUDE` as already satisfied; do not create Feature SPECs for them. For `MODIFY`, create SPECs only for the behavior recorded in `Remaining change`. When the PRD revision changes an existing candidate, follow **SPEC Change Handling** below.
4. When a PRD has multiple development candidates, first show a compact SPEC map with each candidate's responsibility, dependency, question category, and readiness. One PRD may produce one or more Feature SPECs; split distinct domain responsibilities when they can be delivered and verified independently. A feature crossing UI and API layers alone does not require separate SPECs.
5. Ask 1-3 focused question groups at a time. For one SPEC, ask only its unresolved questions. For multiple SPECs, classify questions as:
   - **Common blocking decisions**: one answer affects multiple SPECs. Ask these together before creating affected frozen SPECs.
   - **Per-SPEC blocking questions**: one answer blocks only a named SPEC. Present questions for multiple SPECs in one numbered table so the user can answer them in one response.
   - **Non-blocking questions**: record the assumption in the relevant draft's constraints; move it to Open Questions only if it changes behavior or acceptance criteria.

   Do not repeat a question already answered in the PRD or another SPEC.
6. Define ontology first: clarify the key nouns before discussing implementation.
7. Before drafting the spec, read the project's TDD decision guidance from `AGENTS.md` when it exists. If `AGENTS.md` is absent, decide from the nature of the work: default to `TDD` for bug fixes and behavior-changing code, use `test-after` when tests are still appropriate but writing them first would be inefficient, and use `none` only for work like docs or prompt text where tests are not a meaningful fit.
8. Decide and record `Test strategy` in the Feature SPEC as exactly one of `TDD`, `test-after`, or `none`. If you choose `none`, include the reason on the same line.
9. Fill the goal, constraints, test strategy, expected change surface, verification plan, acceptance criteria, out-of-scope items, and open questions.
   - Use `.telos/project.yml` `risks[]` for project-specific mechanical risks. When it declares scopes, write `[scopes: name-a, name-b]` on a multi-scope AC and add one `- Evidence [name]: ...` line per scope.
   - Expected change surface names allowed files/areas and whether dependency, API, or schema changes are permitted.
   - Verification plan uses `telos verify --changed --project-root .` for configured checks and records only additional manual checks.
   - For each new or modified API, state its one business purpose and observable outcome. Several internal steps may serve that purpose; unrelated outcomes need separate API contracts.
   - Write each resolved question's final answer into the section it changes. When the rationale remains useful for implementation or review, also record it in `Decisions`; do not copy the full interview transcript.
   - Promote a decision to the source PRD's `Shared Decisions` only when it applies to multiple Feature SPECs or candidates. Preserve the PRD approval status when recording that linkable decision.
10. Check the size of the spec before freezing. Split it when any of these is true:
   - more than 6 acceptance criteria
   - the work has independently deliverable business purposes or domain responsibilities with different verification plans or change surfaces
   - one iteration plausibly cannot be implemented within a single agent response

   A Feature SPEC must be small enough that one iteration finishes in one response.
   When splitting, name each slug for the capability it delivers and record the
   intended order in the parent discussion, not inside a single oversized SPEC.
11. If `Test strategy` is `TDD` or `test-after`, include an acceptance criterion that the related tests pass. If the task is a bug fix, also include an acceptance criterion requiring at least one regression test. If `Test strategy` is `none`, do not add those test criteria automatically.
12. Challenge one important assumption with a contrary case.
13. Create draft Feature SPECs for ready candidates in the workspace returned by `telos workspace --project-root .` using `assets/SPEC.template.md`. A draft may retain its own blocking Open Questions; create drafts for ready SPECs without waiting for unrelated blocked SPECs.
    After saving each SPEC, follow **PRD Traceability** and **PRD Coverage Review** below when it has a source PRD.
    Run `telos prd status --prd <source PRD path> --project-root .` and show its compact progress table.
14. Resolve each SPEC's blocking questions and make its acceptance criteria measurable before freezing that SPEC.
15. When the selected SPEC's Open Questions are empty, automatically run a low-cost ambiguity check with a subagent.
16. When freezing, record `Spec baseline` as the current branch and `git rev-parse HEAD`; use `not a Git repository` when unavailable. Set status to `frozen` only when the ambiguity check passes.

## PRD Traceability

When a SPEC is created from a local PRD, add or update a row in that PRD's `Related SPECs` table after saving the SPEC, including drafts. Create the section if it is absent. Each row contains a Markdown link labeled with the SPEC's feature name and a short description of its responsibility. Compute the link relative to the PRD's directory; for `.telos/discoveries/<slug>/PRD.md`, a typical target is `../../specs/<spec-slug>/SPEC.md`.

Match existing rows by their resolved target path and update them instead of adding duplicates. Preserve other rows, PRD requirements, and approval status. Register only files actually created, not planned candidates. If no source PRD was used, skip this step without creating a PRD.

Before reporting completion, confirm that each SPEC created from the PRD has exactly one matching row, its link resolves to the saved file, and its `Discovery source` points back to that PRD. If the source is unavailable or cannot be edited, report the saved SPEC paths and the incomplete backlink update; do not claim traceability is complete.

## SPEC Change Handling

When a revised PRD changes a linked candidate, inspect the linked SPEC and its `telos run status` before editing it.

- If the linked SPEC is `draft`, update that same SPEC.
- If it is `frozen` and has no Run state, change it back to `draft`, update it, then complete the normal ambiguity check before freezing it again.
- If its Run status is `complete`, preserve the completed SPEC and create a new SPEC for the changed behavior. Record the completed SPEC path in the new SPEC's `Changes:` field and link both files from the revised PRD.
- If it has a non-complete Run state, preserve the existing Run history. Explain the revision impact and ask for direction before changing the SPEC or restarting its Run. A currently `running` Run must not have its SPEC changed in place because the stored SPEC hash would no longer match.

Do not treat a PRD revision as permission to modify every linked SPEC. Change only the SPECs affected by the revised candidate, and report unaffected, revised, and newly created SPECs separately.

## PRD Coverage Review

When a source PRD exists, review its `NEW` and `MODIFY` candidates with development scope `INCLUDE` against the linked SPECs. Before reviewing, identify which candidates the current request intends to create; do not call an explicitly unrequested candidate missing.

For each in-scope candidate, classify it as `covered`, `intentionally deferred`, or `needs review`. `MODIFY` is covered only when a SPEC includes the behavior in `Remaining change`. A candidate is intentionally deferred only when the PRD's Review Decision or the user's answer explicitly says so. A candidate with no matching SPEC, or only a link without matching responsibility or acceptance criteria, needs review.

Also compare linked SPEC responsibilities, acceptance criteria, and expected change surfaces for duplicate implementation ownership. A SPEC that calls or depends on another SPEC's capability is a valid dependency, not a duplicate. Report the coverage and duplicate findings in a compact table before freezing affected SPECs.

When the PRD or an existing SPEC already assigns ownership, update the draft SPECs to keep the implementation in that owner and replace the other duplicate with the dependency. Recheck the affected candidates afterwards. When ownership requires a new product or technical decision, ask the developer one focused question with the recommended owner and reason. Keep only affected SPECs as drafts until the answer resolves the finding; unrelated ready SPECs may continue to freeze. Never create or remove a SPEC solely to make the table look complete.

## Subagent Handoff

When you use a subagent for narrow repo exploration, keep the handoff narrow:

- initial user task
- relevant `AGENTS.md` guidance
- any existing Feature SPEC
- the current list of open questions and resolved answers

Do not forward the whole conversation when a structured summary is enough. Relay user answers back to the worker as directly as possible; do not reinterpret them unless the user explicitly asks for reframing.

## Ambiguity Check

Use a narrow prompt for the subagent:

```text
You are a strict ambiguity evaluator. Read the selected Feature SPEC, score goal / constraint / success from 0.0 to 1.0, compute Ambiguity = 1 - (goal*0.4 + constraint*0.3 + success*0.3), and return pass only when Ambiguity <= 0.2. If open questions remain or the SPEC is vague, return retry with concrete evidence.
```

## Rules

- Keep acceptance criteria scoreable by `$eval`.
- Do not leave `Test strategy` blank. `none` is allowed only with an explicit reason.
- Do not mark vague specs as frozen.
- If the task is too small for a spec, say so and ask whether to continue without one.
- Do not use `frozen` as a placeholder. A status line like `Status: draft | frozen` is still draft.
- The ambiguity gate uses `Ambiguity <= 0.2` as the pass threshold.
- If the ambiguity check fails or cannot be parsed, return to questioning and do not freeze the SPEC.
- The ambiguity gate should use the lowest-cost available subagent path in the current Codex session.
- Write for the developer who will implement and review the SPEC. Put the goal, allowed change surface, and acceptance criteria before explanatory detail.
- Prefer checklists, tables, and short bullet lists. Give one testable requirement per sentence and use direct language.
- Each technical detail must answer one of: what changes, why, where it changes, or how it is verified. Do not repeat the PRD, add generic background, or use vague wording such as "improve" without a measurable result.
