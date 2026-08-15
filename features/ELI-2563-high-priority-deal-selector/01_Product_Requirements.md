# ELI-2563 Product Requirements: High-Priority Deal Selector

## Overview

Sales managers need a deterministic, explainable way for downstream dashboard features to identify open deals that deserve immediate review. This ticket delivers a reusable selector only; it does not add a dashboard control or change existing risk or forecast displays.

## Goals

- Return only opportunities that meet an approved high-priority rule.
- Include the account context and every applicable, human-readable inclusion reason.
- Keep decisions stable by using a caller-controlled reference date.

## Non-Goals

- Changing deal-risk scores, forecast categories, account health, owner filtering, charts, or the UI.
- Changing the CRM data schema, backend, SQLite fixture lifecycle, dependencies, or services.

## Users and Use Cases

Sales managers and future dashboard features can request the selected deals and show why each was selected without duplicating sales-operations logic.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Select a deal when its amount is greater than $50,000, activity is older than 7 days, and its close date is 0–30 days after the supplied reference date, inclusive. | Must |
| FR-2 | Exclude past-due deals from the standard rule. | Must |
| FR-3 | Select an Enterprise-account deal when its account health is `At Risk`, regardless of close date. | Must |
| FR-4 | Return account context and deterministic, human-readable reasons for all triggers on each selected deal. | Must |
| FR-5 | Preserve all existing CRM behavior. | Must |

## Explainability

The selector returns value-bearing reason strings in this order when applicable:

1. `Amount $<amount> exceeds $50,000` (for example, `Amount $75,000 exceeds $50,000`)
2. `No activity in <lastActivityDays> days` (for example, `No activity in 9 days`)
3. `Close date is in <daysToClose> days` (for example, `Close date is in 23 days`)
4. `Enterprise account health is At Risk`

The first three are returned together only when the complete standard rule qualifies the deal; the fourth is independently returned when the alternate rule qualifies.

## Edge Cases and Decisions

- Exact $50,000 and exactly 7 activity days do not meet the strict standard thresholds.
- Exactly 30 days qualifies; 31 days and past-due dates do not qualify under the standard rule.
- The alternate Enterprise + `At Risk` rule has no close-date restriction.
- The binding ELI-2562 decision record supplies the deterministic default reference date: `2026-05-28`.

## Testing and Success Criteria

Unit tests cover both rules, exclusion, every value-bearing reason, multiple reasons, and the approved amount, activity, close-date, and past-due boundaries. `npm test` must pass.

## Decision Log

| Date | Decision | Owner |
| --- | --- | --- |
| 2026-08-14 | Apply the accepted ELI-2562 contract without schema or UI changes. | Patrick |
