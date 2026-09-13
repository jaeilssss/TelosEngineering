---
name: run
description: "Orchestrate installed capabilities from a frozen SPEC.md until its acceptance criteria are verified. Use when the user writes $run or asks Telos to execute a spec-driven task."
---

# Telos V2 Run

Use the selected frozen Feature SPEC at `.telos/specs/<slug>/SPEC.md` as the goal contract. Telos owns the Spec and the final Eval; installed skills, plugins, and agents are replaceable capabilities used to achieve that contract.

## Preflight

1. Run `telos update-status codex --project-root .` in Codex or `telos update-status claude --project-root .` in Claude Code when the CLI is available. Show an update recommendation before continuing when one is returned.
2. Obtain the explicit Feature SPEC slug, then read `.telos/specs/<slug>/SPEC.md`. Stop and direct the user to `$spec` if it is missing, draft, or has unresolved questions.
3. Inspect the relevant repository paths and the current worktree state before implementation.
4. Read the Spec baseline, Expected Change Surface, Verification Plan, and acceptance criteria. If meaningful baseline drift exists, ask the user to reconfirm the spec before changing code.
5. Ensure `.telos/project.yml` exists. If it is missing, run `telos init --project-root .`, show the complete generated configuration and inferred command (or `verify: []`) to the user, then continue. `verify: []` permits implementation but requires explicit manual evidence before approval.
6. Determine whether this is a new run or a resume.
   Run `telos run status --spec <slug> --project-root .` first.

   - If the status is `running`: do NOT call `telos run start`. It will fail with
     `already active`. Read the current iteration number and the most recent
     rejection summary from the run state, then **proceed directly to Execution
     Loop step 1 and implement in this same response.** Reporting the status is
     not an acceptable stopping point.

   - If the status is `blocked`: resume only after explicit user direction through
     `telos run unblock --spec <slug> --project-root . --summary "..."`, then
     proceed to Execution Loop step 1.

   - If the status is `rejected` or `uncertain`: call
     `telos run retry --spec <slug> --project-root .` and proceed to Execution
     Loop step 1.

   - If there is no run state, or the status is `complete`: start a new loop with
     `telos run start --spec <slug> --project-root .` and proceed to Execution
     Loop step 1.

## Execution Loop

### Turn contract

**Progress reporting is not a terminal state.**

Once this skill is invoked, do not end the response until one of these has happened:

  (a) a verdict was written with `telos run record`, or
  (b) Execution Loop step 8 applies and user direction is genuinely required.

Announcing what remains, restating the run status, or summarizing partial work is
NOT a stopping point. If the full implementation does not fit in one response,
implement the subset of acceptance criteria that does fit, then record the
iteration with `telos run record --status rejected` listing the remaining criteria.
A partial iteration recorded as `rejected` is normal progress, not a failure.

Maintain a compact iteration record containing changes, verification evidence, failures, and the next action.

1. Implement only what the acceptance criteria require, and map meaningful changes to those criteria.
2. Invoke `$eval` (or perform its same evidence-based gate when invoked as part of this run) against the frozen Spec. Eval owns `telos verify --changed`; do not run mechanical verification separately in the same iteration.
3. Record the final Eval result with `telos run record --spec <slug> --project-root . --status approved|rejected|uncertain|blocked --summary "..."`. For `rejected`, every summary line must use `<AC> | <missing evidence or behavior> | <how verified> | Stage1: yes|no`.
4. If final Eval is approved, report completion with acceptance-criteria evidence.
5. If final Eval is rejected, analyze the failed evidence, then run `telos run retry --spec <slug> --project-root . --capability <id>` for the next iteration. Fix, test, and evaluate again.
6. If final Eval is uncertain, stop for user direction. Explain the choices: explicitly retry or request consensus, or revise the SPEC and start a new run. Never retry `uncertain` automatically.
7. A blocked run resumes only after explicit user direction through `telos run unblock --spec <slug> --project-root . --summary "..."`.
8. Stop and ask for direction when the Spec conflicts with the repository, scope must expand, the CLI iteration limit is reached, or continued looping would not create new evidence.

## Rules

- Preserve user changes and stay within Expected Change Surface. Route a scope conflict back to `$spec` rather than guessing.
- Keep implementation, test, and evaluation evidence distinct. An implementation session does not approve its own result.
- Never report `running` as completion. It is a stored status value, not a background worker. No code changes while no tool calls are being made.
- Every iteration must end with a recorded verdict. An iteration that stops without `telos run record` leaves no history, so the next invocation has to rediscover the situation from scratch.

## Completion

Report the final status, changed files, verification commands and results, acceptance-criteria evidence, and any unresolved risks. Do not claim completion until final Eval approves the frozen Spec.
