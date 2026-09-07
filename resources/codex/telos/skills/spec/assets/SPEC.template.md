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
<!-- Commands and manual checks that demonstrate the acceptance criteria. Use the project's stack, e.g. ./gradlew test --tests ..., ./mvnw test -Dtest=..., npm test. -->
- command:
- manual check:

## 7. Risk Profile
<!-- Select only applicable risks: auth/authorization, database migration, public API, payment/data deletion, concurrency. For each, state the check that must pass. -->
-

## 8. Acceptance Criteria
<!-- Measurable statements that $eval can score. -->
- [ ] AC1:
- [ ] AC2:
- [ ] AC3:

## 9. Out of Scope
-

## 10. Open Questions
<!-- Must be empty before frozen. -->
-
