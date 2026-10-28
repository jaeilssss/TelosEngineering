# Spec: Searchable PRD and SPEC Filenames

Status: `frozen`
Date: 2026-10-28
Spec baseline: `feat/prd-spec-coverage` at `c1c70a3737c9206a139071df673010ca8a4aa30f`
Discovery source: not used
Changes: not used

## 1. Goal

Make Telos-created PRD and Feature SPEC filenames searchable by including their slug, while keeping existing `PRD.md` and `SPEC.md` documents usable without manual migration.

## 2. Expected Change Surface

- allowed: PRD/SPEC path-resolution helpers and callers in `src/**`; CLI behavior and tests in `src/**`; shared Telos skill instructions, templates, Codex hook/script, Claude plugin instructions, and README examples that name PRD or SPEC paths
- excluded: `.telos/runs/**` naming, `.telos/evals/**` naming, Run/Eval JSON or report formats, automatic batch rename of existing project documents, and unrelated workflow changes
- dependency/API/schema changes: CLI commands that accept a SPEC or PRD file path must accept the new filenames and retain old-path compatibility; no dependency, external API, or data-schema change

## 3. Acceptance Criteria

- [ ] AC1: New Discovery PRDs are created at `.telos/discoveries/<slug>/<slug>.prd.md`, and new Feature SPECs are created at `.telos/specs/<slug>/<slug>.spec.md`; documented examples and generated links use these paths.
- [ ] AC2: Every Telos path lookup used by `$spec`, `$run`, `$eval`, hooks, `telos prd status`, and `telos evidence check` resolves the new filename first and falls back to the legacy `PRD.md` or `SPEC.md` in the same slug directory when the new file is absent.
- [ ] AC3: A legacy-only project can create, read, freeze, run, evaluate, and report PRD/SPEC status without renaming its existing files; a mixed project with both names present uses the new file and does not silently modify or delete the legacy file.
- [ ] AC4: PRD `Related SPECs` traceability links created or updated after this change target `<spec-slug>.spec.md`; existing legacy links remain readable by PRD status and are not rewritten solely because they use `SPEC.md`.
- [ ] AC5: Run state continues to use `.telos/runs/<slug>.json`, Eval reports continue to use `.telos/evals/<slug>/<iteration>.md`, and their association with a SPEC slug works identically for both filename conventions.
- [ ] AC6: Targeted tests cover new-format creation/resolution, legacy fallback, new-file precedence when both files exist, PRD status for each link format, and unchanged Run/Eval paths; `npm test` and `npm run check:release` pass.

## 4. Verification Plan

- `telos verify --changed --project-root .`
- manual check: create one new PRD and one new SPEC in a clean temporary project, then confirm their filenames contain the chosen slugs and that IDE file search distinguishes them from another feature's documents.
- manual check: run `telos prd status` and `telos evidence check` against fixtures using legacy-only, new-only, and mixed filenames.

## 5. Test Strategy

Test strategy: TDD

## 6. Ontology

| Concept | Definition | Notes |
|---|---|---|
| New-format PRD | `<slug>.prd.md` inside `.telos/discoveries/<slug>/` | The preferred filename for newly created PRDs |
| New-format SPEC | `<slug>.spec.md` inside `.telos/specs/<slug>/` | The preferred filename for newly created Feature SPECs |
| Legacy document | `PRD.md` or `SPEC.md` in its existing slug directory | Read-compatible; never renamed automatically |
| Resolution precedence | The deterministic rule: new-format file first, then legacy file | Avoids ambiguity in mixed projects |
| Mixed project | A project where a slug directory contains both new and legacy filenames, or different slugs use different conventions | Supported during gradual adoption |

## 7. Constraints

- Preserve the current directory grouping by slug; only PRD and SPEC filenames change.
- Do not add automatic migration, copying, deletion, or overwriting of legacy documents.
- Centralize filename resolution so commands and skills cannot drift into different precedence rules.
- Keep all links relative and valid from their containing PRD/SPEC document.
- A user who explicitly gives a valid legacy path may continue to use that exact path.

## 8. Out of Scope

- Renaming Run state files to `.run-*` or Eval reports to `.eval-*`.
- A command that bulk-migrates old documents.
- Archiving or deleting completed SPECs.
- Changing PRD/SPEC content structure, approval behavior, ambiguity scoring, or Run/Eval acceptance behavior.

## 9. Decisions

| Decision | Reason |
|---|---|
| Use `<slug>.prd.md` and `<slug>.spec.md` inside the existing slug directories | File search, IDE tabs, and GitHub search show both feature identity and document type without losing the current folder organization |
| Prefer new filenames but retain legacy fallback | New documents gain searchability while active and completed projects remain usable without a disruptive migration |
| Do not change Run/Eval filenames | They are machine-oriented state and iteration artifacts; slug directories and numeric reports are already more useful than descriptive filenames there |

## 10. Open Questions

-
