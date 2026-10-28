---
name: spec
description: "Create or refine a SPEC.md contract before implementation. Use when the user writes $spec, asks to define requirements, wants a spec-first interview, or needs goals, constraints, ontology, and acceptance criteria clarified before coding."
---

# Spec Interview

Do not write implementation code while using this skill. Run `telos workspace --project-root .` first and create a new Feature SPEC at its returned `path/specs/<slug>/<slug>.spec.md`. When reading an existing SPEC, use `<slug>.spec.md` first and fall back to legacy `SPEC.md` in the same directory.

Treat this skill as the spec orchestrator. Keep the user questioning loop in the main session by default. Use a subagent only for narrow, high-noise exploration that can be returned as a small index, such as a terminology scan in a large repository. Use the ambiguity-check subagent only for the heavy path before freezing.

Treat the text after `$spec` as the initial task input.

## Workflow

1. Before the main workflow, run `telos update-status codex --project-root .` in Codex or `telos update-status claude --project-root .` in Claude Code when the CLI is available. If it prints a message, show that update recommendation before continuing.
2. If the workspace has no `.telos/project.yml`, run `telos init --project-root .`. Show the complete generated configuration and inferred verification command, or `verify: []`, before continuing.
3. If the user references a Discovery PRD, read its `<slug>.prd.md`, falling back to legacy `PRD.md` in the same directory, before asking questions. A draft PRD does not block SPEC creation: tell the user its status and ask whether to continue from the draft. Record the PRD path and status in the resulting SPEC. Treat candidates marked `REUSE` with development scope `EXCLUDE` as already satisfied; do not create Feature SPECs for them. For `MODIFY`, create SPECs only for the behavior recorded in `Remaining change`. Read [the PRD workflow reference](references/prd-workflow.md) and follow its PRD Traceability, SPEC Change Handling, and PRD Coverage Review rules.
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
    After saving each SPEC with a source PRD, follow the PRD Traceability and PRD Coverage Review rules in [the PRD workflow reference](references/prd-workflow.md).
    Run `telos prd status --prd <source PRD path> --spec <created-or-revised-slug> --project-root .` and show its compact progress row. Run the unfiltered command only when the user asks for the whole PRD status.
14. Resolve each SPEC's blocking questions and make its acceptance criteria measurable before freezing that SPEC.
15. When the selected SPEC's Open Questions are empty, classify it automatically:
   - A **light task** has all three conditions: AC count is 2 or fewer, expected change surface is 3 or fewer files, and no source PRD. Show a one-line notice that the light path is being used, then perform the inline ambiguity check in the main session using the same formula and pass threshold below.
   - A source PRD always forces the heavy path, regardless of acceptance-criteria or file count. Use the heavy path when any light-task condition is not clearly met. When classification is uncertain, use the heavy path.
   - For the **heavy path**, automatically run the low-cost ambiguity check with a subagent.
16. When freezing, record `Spec baseline` as the current branch and `git rev-parse HEAD`; use `not a Git repository` when unavailable. Set status to `frozen` only when the ambiguity check passes.

## Subagent Handoff

When you use a subagent for narrow repo exploration, keep the handoff narrow:

- initial user task
- relevant `AGENTS.md` guidance
- any existing Feature SPEC
- the current list of open questions and resolved answers

Do not forward the whole conversation when a structured summary is enough. Relay user answers back to the worker as directly as possible; do not reinterpret them unless the user explicitly asks for reframing.

## Ambiguity Check

For the light path, score goal, constraints, and success in the main session. Compute `Ambiguity = 1 - (goal*0.4 + constraint*0.3 + success*0.3)` and pass only when `Ambiguity <= 0.2`. Return to questioning when the score fails or the SPEC is vague.

For the heavy path, use a narrow prompt for the subagent:

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
- The heavy-path ambiguity gate should use the lowest-cost available subagent path in the current Codex session.
- Write for the developer who will implement and review the SPEC. Put the goal, allowed change surface, and acceptance criteria before explanatory detail.
- Prefer checklists, tables, and short bullet lists. Give one testable requirement per sentence and use direct language.
- Each technical detail must answer one of: what changes, why, where it changes, or how it is verified. Do not repeat the PRD, add generic background, or use vague wording such as "improve" without a measurable result.
