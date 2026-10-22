# PRD: <feature or initiative name>

Status: draft
Date: <YYYY-MM-DD>
Source: <planning document path, title, or conversation summary>

## 1. Overview

<!-- State the user problem, intended outcome, and system boundary in 5-10 lines. -->

## 2. User Flows

<!-- Describe each user or system flow that the planning document requires. -->

## 3. Feature Candidates and Existing Capability Assessment

| Feature candidate | Planning-document basis | Existing capability evidence | Determination | Development scope |
|---|---|---|---|---|
| | | API route, file path, UI component, test, or `not found` | NEW / MODIFY / REUSE / UNKNOWN | INCLUDE / EXCLUDE / HOLD |

- `REUSE` with evidence that meets the need → `EXCLUDE` from new development and Feature SPEC candidates.
- `MODIFY` → `INCLUDE` only the missing behavior in later Feature SPEC candidates.
- `UNKNOWN` → `HOLD` until the missing evidence is reviewed.

## 4. Technical Proposal

<!-- Propose APIs, data ownership, system boundaries, and integrations. Label every assumption. -->

## 5. Open Questions and Assumptions

<!-- Keep business policies and unknown technical facts separate. Do not silently decide them. -->

## 6. Risk Flags

<!-- Include authorization, personal data, money, schema migration, concurrency, idempotency, external calls, retries, and asynchronous work when relevant. -->

## 7. Review Decision

<!-- Record user feedback here. Status changes to approved only after explicit user approval. -->
