---
name: review
description: "Review Telos rejection history and propose human-approved prevention improvements without changing files."
---

# Telos History Review

Use `telos history --since <duration> --project-root .` to inspect repeated rejection evidence. This skill is report-only: do not edit source, tests, skills, or `.telos/project.yml`.

## Workflow

1. Ask for a duration only when the user did not provide one; otherwise use it directly.
2. Read the structured history output and group genuinely similar missing behaviors. Do not group entries only because they share an AC number.
3. For each repeated failure, propose the first applicable prevention in this order:
   1. a regression test;
   2. a tool-managed lint or type rule;
   3. an expressible `risks[]` command check;
   4. no action, with the reason.
4. Show the evidence, expected benefit, false-positive risk, and exact human action needed for each proposal.
5. Stop after the report. A human must approve and apply every change.

## Rules

- Never empty a module's `verify` list.
- Never remove module paths, verification commands, or risks.
- Never edit `.telos/project.yml` directly.
- Never weaken an existing gate to make a rejection disappear.
- If a problem cannot be expressed reliably with grep, say so. Prefer a regression test or tool-owned rule instead of inventing a fragile grep check.
- A risk with `caught: 0` is only a human review candidate. Do not remove it automatically.
