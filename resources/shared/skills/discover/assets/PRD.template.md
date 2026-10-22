# PRD: <feature or initiative name>

Status: draft
Date: <YYYY-MM-DD>
Source: <planning document path, title, or conversation summary>

## 1. Overview

<!-- In 5-10 lines, state the user problem, intended outcome, system boundary, and proposed decision. Use direct sentences. -->

## 2. User Flows

<!-- Use a numbered list. For each flow, state the trigger, result, and exceptional case only when it changes the proposal. -->

## 3. Feature Candidates and Existing Capability Assessment

| Feature candidate | Planning-document basis | Existing capability evidence | Determination | Development scope | Remaining change |
|---|---|---|---|---|---|
| | | API route, file path, UI component, test, or `not found` | NEW / MODIFY / REUSE / UNKNOWN | INCLUDE / EXCLUDE / HOLD | For `MODIFY`, state the specific missing behavior; otherwise `none` or `pending`. |

- `REUSE` with evidence that meets the need → `EXCLUDE` from new development and Feature SPEC candidates.
- `MODIFY` → `INCLUDE` only the behavior named in `Remaining change` in later Feature SPEC candidates.
- `UNKNOWN` → `HOLD` until the missing evidence is reviewed.

## 4. Technical Proposal

<!-- Use bullets or a table. State what changes, why, and how it will be checked. For each new or modified API, state one business purpose and its observable outcome. Propose data ownership, system boundaries, and integrations. Label every assumption. -->

## 5. Open Questions and Assumptions

<!-- Keep business policies and unknown technical facts separate. Do not silently decide them. -->

## 6. Risk Flags

<!-- Include authorization, personal data, money, schema migration, concurrency, idempotency, external calls, retries, and asynchronous work when relevant. -->

## 7. Review Decision

<!-- Record user feedback here. Status changes to approved only after explicit user approval. -->

<!-- Writing rules: put the decision before its evidence; prefer tables and lists to prose; one conclusion per sentence; do not repeat source material or generic background. -->
