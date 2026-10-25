---
name: discover
description: "Turn a planning document into a reviewable technical PRD before creating Feature SPECs. Use when the user writes $discover, asks to technically review a planning document, or wants to review an AI-generated PRD before implementation."
---

# Requirement Discovery

Run `telos workspace --project-root .` first. Do not modify implementation code, tests, dependencies, or project configuration while using this skill.

Use this skill before `$spec` when a user wants to turn a planning document, product brief, or idea into a reviewable technical PRD. It is a read-only analysis and review workflow, not an implementation or design approval authority.

## Workflow

1. Run `telos update-status codex --project-root .` in Codex or `telos update-status claude --project-root .` in Claude Code when the CLI is available. If it prints a message, show that update recommendation before continuing.
2. Read the supplied planning document or extracted text. Inspect relevant existing code, APIs, UI, schemas, and documentation when they help determine whether a requested capability already exists.
3. If the user supplies an existing local PRD path, revise that PRD instead of creating a new one when the user problem, domain responsibility, and intended outcome remain the same. Otherwise choose a lowercase kebab-case slug with the user when it materially affects understanding, or derive one from the planning document.
4. Ask up to three focused questions only for missing system boundaries, ownership, or business policies that would change the technical proposal. Mark unanswered items as open questions instead of assuming an answer.
5. For a new PRD, create the draft at the workspace returned by `telos workspace --project-root .`: `path/discoveries/<slug>/PRD.md`. Use `assets/PRD.template.md`. For a revision, retain the existing path, increment `Revision`, set `Status: draft`, and add a concise entry to `Revision History` describing the requirement change and affected SPEC candidates.
6. Fill the PRD with a short overview first, then the user flows, feature candidates, existing-capability assessment, technical proposal, open questions, and risk flags. For every feature candidate, record evidence such as file paths, API routes, UI components, or tests before choosing `NEW`, `MODIFY`, `REUSE`, or `UNKNOWN`. Record the specific missing behavior for each `MODIFY` candidate in the table.
7. Show a compact review summary: purpose, feature candidates, decisions needed from the user, and high-risk items. Keep supporting detail in the PRD instead of repeating it in chat.
8. Keep `Status: draft` while the user reviews or requests changes. When the user explicitly says `OK`, `approved`, or `승인`, update only the PRD status to `Status: approved` and report the approved file.
9. Do not create Feature SPECs automatically. When the user asks to create them, hand off to `$spec` with the PRD path. One PRD may produce one or more Feature SPECs when the feature boundaries, verification plans, or change surfaces differ.

## Rules

- Do not invent business policy. Put unresolved policy in `Open Questions`.
- Do not write code or change project configuration.
- Mark a candidate `REUSE` only when the recorded evidence shows that it already satisfies the planning-document need. A supported `REUSE` candidate is excluded from development and Feature SPEC candidates.
- Mark a candidate `MODIFY` when an existing capability is incomplete, and include only the missing change in later Feature SPEC candidates. Keep `UNKNOWN` candidates out of development until the user reviews the missing evidence.
- For each proposed new or modified API, state one clear business purpose and its observable outcome. One purpose may require several internal steps; separate unrelated outcomes instead of combining them in one API.
- Do not treat approval as permission to deploy, change production data, or begin a Telos Run.
- Do not require approval to create a draft SPEC later; `$spec` handles that user decision.
- Create a new PRD when the change has a different user problem, domain responsibility, or independently deliverable outcome. Do not create a new PRD for a policy, condition, or scope revision of the same initiative.
- Keep the default review output short. The PRD is the detailed record.
- Write for a developer reviewing the document. Put the purpose, proposed decision, and development scope before supporting detail.
- Prefer tables and bullet lists. Give one conclusion per sentence and use short, direct sentences.
- State what changes, why it changes, and how it will be checked. Use file paths and API names only as evidence; do not explain their implementation unless it changes a decision.
- Do not repeat the planning document, add generic background, or use vague wording such as "improve" without a measurable meaning. Define an unfamiliar term once where it first appears.
