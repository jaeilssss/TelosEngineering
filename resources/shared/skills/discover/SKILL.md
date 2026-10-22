---
name: discover
description: "Turn a planning document into a reviewable technical PRD before creating Feature SPECs. Use when the user writes $discover, asks to technically review a planning document, or wants to review an AI-generated PRD before implementation."
---

# Requirement Discovery

Run `telos workspace --project-root .` first. Do not modify implementation code, tests, dependencies, or project configuration while using this skill.

Use this skill before `$spec` when a user wants to turn a planning document, product brief, or idea into a reviewable technical PRD. It is a read-only analysis and review workflow, not an implementation or design approval authority.

## Workflow

1. Run `telos update-status codex --project-root .` in Codex or `telos update-status claude --project-root .` in Claude Code when the CLI is available. If it prints a message, show that update recommendation before continuing.
2. Read the supplied planning document or extracted text. Read relevant repository code, API documentation, and schemas only when they help evaluate the request.
3. Choose a lowercase kebab-case slug with the user when it materially affects understanding. Otherwise derive one from the planning document.
4. Ask up to three focused questions only for missing system boundaries, ownership, or business policies that would change the technical proposal. Mark unanswered items as open questions instead of assuming an answer.
5. Create the draft PRD at the workspace returned by `telos workspace --project-root .`: `path/discoveries/<slug>/PRD.md`. Use `assets/PRD.template.md`.
6. Fill the PRD with a short overview first, then the user flows, feature candidates, existing-system reuse or change candidates, technical proposal, open questions, and risk flags. Link every technical proposal to a stated planning-document need or label it as an assumption.
7. Show a compact review summary: purpose, feature candidates, decisions needed from the user, and high-risk items. Keep supporting detail in the PRD instead of repeating it in chat.
8. Keep `Status: draft` while the user reviews or requests changes. When the user explicitly says `OK`, `approved`, or `승인`, update only the PRD status to `Status: approved` and report the approved file.
9. Do not create Feature SPECs automatically. When the user asks to create them, hand off to `$spec` with the PRD path. One PRD may produce one or more Feature SPECs when the feature boundaries, verification plans, or change surfaces differ.

## Rules

- Do not invent business policy. Put unresolved policy in `Open Questions`.
- Do not write code or change project configuration.
- Do not treat approval as permission to deploy, change production data, or begin a Telos Run.
- Do not require approval to create a draft SPEC later; `$spec` handles that user decision.
- Keep the default review output short. The PRD is the detailed record.
