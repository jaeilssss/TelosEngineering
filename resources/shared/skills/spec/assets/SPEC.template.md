<!--
  SPEC.md template. Fill this through $spec before a Telos run.
  All sections should be concrete before status becomes frozen.
-->

# Spec: <feature or task name>

Status: `draft` | `frozen`
Date: <YYYY-MM-DD>
Spec baseline: <branch and Git revision when frozen, or `not a Git repository`>
Discovery source: <PRD path and status, or `not used`>
Changes: <prior completed SPEC path, or `not used`>

## 1. Goal
<!-- One concrete sentence: what changes, for whom, and why. Avoid vague words like "improve" or "optimize". -->

## 2. Expected Change Surface
<!-- Put this near the top of the review: files or areas allowed to change, dependency/API/schema compatibility constraints. Use `not constrained` only when that is intentional. -->
- allowed:
- excluded:
- dependency/API/schema changes:

## 3. Acceptance Criteria
<!-- One short, measurable requirement per line that $eval can score. State observable behavior and evidence; avoid explanatory prose. -->
- [ ] AC1:
- [ ] AC2:
- [ ] AC3:
<!-- Scoped AC example: - [ ] AC4 [scopes: ios, android] ... then - Evidence [ios]: ... and - Evidence [android]: ... -->

## 4. Verification Plan
<!-- Use `telos verify --changed --project-root .` for configured checks. Record only additional manual checks here. -->
- manual check:

## 5. Test Strategy
<!-- Choose exactly one: TDD | test-after | none. If none, include the reason on the same line. -->
Test strategy:

## 6. Ontology
<!-- Define key nouns precisely. -->
| Concept | Definition | Notes |
|---------|------------|-------|
|         |            |       |

## 7. Constraints
<!-- Use short bullets for stack, performance, security, dependencies, compatibility, and non-goals. -->
-

## 8. Out of Scope
-

## 9. Open Questions
<!-- Must be empty before frozen. -->
-

<!-- Writing rules: lead with the goal and decision-relevant constraints; prefer tables, checklists, and bullets; every detail must explain what, why, where, or how verified. -->
