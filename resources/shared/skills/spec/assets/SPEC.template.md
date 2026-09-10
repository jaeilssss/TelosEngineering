<!--
  SPEC.md template. Fill this through $spec before a Telos run.
  All sections should be concrete before status becomes frozen.
-->

# Spec: <feature or task name>

Status: `draft` | `frozen`
Date: <YYYY-MM-DD>
Spec baseline: <branch and Git revision when frozen, or `not a Git repository`>

## 1. Goal
<!-- One concrete sentence: what, for whom, and why. Avoid vague words like "improve" or "optimize". -->

## 2. Ontology
<!-- Define key nouns precisely. -->
| Concept | Definition | Notes |
|---------|------------|-------|
|         |            |       |

## 3. Constraints
<!-- Stack, performance, security, dependencies, compatibility, and non-goals. -->
-

## 4. Test Strategy
<!-- Choose exactly one: TDD | test-after | none. If none, include the reason on the same line. -->
Test strategy:

## 5. Expected Change Surface
<!-- Files or areas allowed to change, dependency/API/schema compatibility constraints. Use `not constrained` only when that is intentional. -->
- allowed:
- excluded:
- dependency/API/schema changes:

## 6. Verification Plan
<!-- Use `telos verify --changed --project-root .` for configured checks. Record only additional manual checks here. -->
- manual check:

## 7. Acceptance Criteria
<!-- Measurable statements that $eval can score. -->
- [ ] AC1:
- [ ] AC2:
- [ ] AC3:
<!-- Scoped AC example: - [ ] AC4 [scopes: ios, android] ... then - Evidence [ios]: ... and - Evidence [android]: ... -->

## 8. Out of Scope
-

## 9. Open Questions
<!-- Must be empty before frozen. -->
-
