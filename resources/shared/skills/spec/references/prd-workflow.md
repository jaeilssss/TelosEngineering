# PRD-linked SPEC Workflow

Read this reference only when the Feature SPEC has a source Discovery PRD.

## PRD Traceability

When a SPEC is created from a local PRD, add or update a row in that PRD's `Related SPECs` table after saving the SPEC, including drafts. Create the section if it is absent. Each row contains a Markdown link labeled with the SPEC's feature name and a short description of its responsibility. Compute the link relative to the PRD's directory; for `.telos/discoveries/<slug>/<slug>.prd.md`, a typical target is `../../specs/<spec-slug>/<spec-slug>.spec.md`. Do not rewrite an existing legacy `SPEC.md` link unless that row is otherwise being updated for a real change.

Match existing rows by their resolved target path and update them instead of adding duplicates. Preserve other rows, PRD requirements, and approval status. Register only files actually created, not planned candidates. If no source PRD was used, skip this step without creating a PRD.

Before reporting completion, confirm that each SPEC created from the PRD has exactly one matching row, its link resolves to the saved file, and its `Discovery source` points back to that PRD. If the source is unavailable or cannot be edited, report the saved SPEC paths and the incomplete backlink update; do not claim traceability is complete.

## SPEC Change Handling

When a revised PRD changes a linked candidate, inspect the linked SPEC and its `telos run status` before editing it.

- If the linked SPEC is `draft`, update that same SPEC.
- If it is `frozen` and has no Run state, change it back to `draft`, update it, then complete the normal ambiguity check before freezing it again.
- If its Run status is `complete`, preserve the completed SPEC and create a new SPEC for the changed behavior. Record the completed SPEC path in the new SPEC's `Changes:` field and link both files from the revised PRD.
- If it has a non-complete Run state, preserve the existing Run history. Explain the revision impact and ask for direction before changing the SPEC or restarting its Run. After the developer approves the revision, run `telos run supersede --spec <slug> --project-root . --summary "PRD revision: ..."` before changing the SPEC. Then update it, freeze it again, and start a new Run. A currently `running` Run must not have its SPEC changed in place because the stored SPEC hash would no longer match.

Do not treat a PRD revision as permission to modify every linked SPEC. Change only the SPECs affected by the revised candidate, and report unaffected, revised, and newly created SPECs separately.

## PRD Coverage Review

When a source PRD exists, review its `NEW` and `MODIFY` candidates with development scope `INCLUDE` against the linked SPECs. Before reviewing, identify which candidates the current request intends to create; do not call an explicitly unrequested candidate missing. Start from the current request's created or revised SPECs and the PRD table. Use the `Related SPECs` responsibility column as an index, and open another SPEC only when its responsibility, API, expected change surface, or declared dependency overlaps the current candidate.

For each in-scope candidate, classify it as `covered`, `intentionally deferred`, or `needs review`. `MODIFY` is covered only when a SPEC includes the behavior in `Remaining change`. A candidate is intentionally deferred only when the PRD's Review Decision or the user's answer explicitly says so. A candidate with no matching SPEC, or only a link without matching responsibility or acceptance criteria, needs review.

Also compare the selected overlap candidates' responsibilities, acceptance criteria, and expected change surfaces for duplicate implementation ownership. A SPEC that calls or depends on another SPEC's capability is a valid dependency, not a duplicate. A completed SPEC named in the current SPEC's `Changes:` field is historical context, not a duplicate owner; compare only the new changed behavior. Report the coverage and duplicate findings in a compact table before freezing affected SPECs.

When the PRD or an existing SPEC already assigns ownership, update the draft SPECs to keep the implementation in that owner and replace the other duplicate with the dependency. Recheck the affected candidates afterwards. When ownership requires a new product or technical decision, ask the developer one focused question with the recommended owner and reason. Keep only affected SPECs as drafts until the answer resolves the finding; unrelated ready SPECs may continue to freeze. Never create or remove a SPEC solely to make the table look complete.
